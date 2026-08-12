import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SEARCH_SPECIALS = /[,().*%_\\"'`\[\]{}:]/g;
function sanitizeSearchTerm(input: string, maxLength = 80): string {
  return (input ?? "").replace(SEARCH_SPECIALS, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory cache (10 min TTL)
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}
function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
  // Evict old entries
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

// ---- Supabase Tools ----

async function searchListings(
  supabase: any,
  queryText: string,
  region?: string,
  condition?: string
) {
  let q = supabase
    .from("listings")
    .select("id, title, brand, model, price_ils, condition, region, images, seller_id, view_count, save_count, published_at, sellers!inner(verified, trust_score, shop_name)")
    .eq("status", "available")
    .order("published_at", { ascending: false })
    .limit(10);

  if (region) q = q.eq("region", region);
  if (condition) q = q.eq("condition", condition);

  // Text search: use ilike for simplicity
  if (queryText) {
    const term = sanitizeSearchTerm(queryText);
    if (term) q = q.or(`title.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("searchListings error:", error);
    return [];
  }
  return (data || []).map((l: any) => ({
    id: l.id,
    title: l.title,
    brand: l.brand,
    model: l.model,
    price: l.price_ils,
    condition: l.condition,
    region: l.region,
    image: l.images?.[0] || null,
    sellerVerified: l.sellers?.verified || false,
    sellerName: l.sellers?.shop_name || "بائع",
    publishedAt: l.published_at,
  }));
}

async function getPriceStats(
  supabase: any,
  brand: string,
  model: string,
  condition?: string,
) {
  const cacheKey = `price:${brand}|${model}|${condition || "all"}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params: any = { p_brand: brand || "", p_model: model || "" };
  if (condition) params.p_condition = condition;

  const { data, error } = await supabase.rpc("get_price_stats", params);
  if (error) {
    console.error("getPriceStats error:", error);
    return { sample_count: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const result = row || { sample_count: 0 };
  setCache(cacheKey, result);
  return result;
}

// Simple keyword-based category suggestion
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "electronics": ["هاتف", "موبايل", "لابتوب", "كمبيوتر", "تابلت", "شاشة", "سماعة", "شاحن", "بطارية", "آيفون", "سامسونج", "هواوي", "phone", "laptop", "iphone", "samsung", "tablet", "airpods", "galaxy"],
  "clothing": ["ملابس", "قميص", "بنطلون", "فستان", "حذاء", "جاكيت", "عباية", "شال", "shirt", "pants", "dress", "shoes"],
  "furniture": ["كنب", "طاولة", "كرسي", "سرير", "خزانة", "مكتب", "sofa", "table", "chair", "bed", "desk"],
  "vehicles": ["سيارة", "دراجة", "موتور", "car", "bike", "motorcycle"],
  "home": ["غسالة", "ثلاجة", "مكيف", "فرن", "خلاط", "مكنسة", "washer", "fridge", "ac", "oven"],
  "books": ["كتاب", "كتب", "رواية", "book", "novel"],
  "sports": ["رياضة", "كرة", "دراجة", "sport", "ball", "gym"],
};

async function suggestCategory(supabase: any, title: string, description?: string) {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Try keyword matching first
  let bestMatch = "";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  // Fetch actual categories from DB
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_ar, name_en, slug")
    .order("sort_order");

  if (!categories || categories.length === 0) {
    return { suggestion: bestMatch || "general", categories: [] };
  }

  // Try to match slug
  const matched = categories.find((c: any) =>
    c.slug === bestMatch || c.name_en?.toLowerCase().includes(bestMatch)
  );

  return {
    suggestion: matched
      ? { id: matched.id, name: matched.name_ar, slug: matched.slug }
      : { name: bestMatch || "عام", slug: bestMatch || "general" },
    allCategories: categories.map((c: any) => ({ id: c.id, name: c.name_ar, slug: c.slug })),
  };
}

// ---- Main Handler ----

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, listingContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build system prompt with listing context
    let contextInfo = "";
    if (listingContext) {
      contextInfo = `
المستخدم يتصفح إعلان حالياً:
- العنوان: ${listingContext.title}
- السعر: ₪${listingContext.price}
- الماركة: ${listingContext.brand || "غير محدد"}
- الموديل: ${listingContext.model || "غير محدد"}
- الحالة: ${listingContext.condition || "غير محدد"}
- المنطقة: ${listingContext.region || "غير محدد"}
`;
    }

    const systemPrompt = `أنت مساعد NetPlex الذكي، منصة سوق إلكتروني في غزة.

**مهم جداً - اللغة وشكل الرد:**
- جاوب دائماً وحصراً باللهجة الغزاوية الفلسطينية العامية (مش فصحى ومش إنجليزي أبداً)، مهما كانت لغة السؤال.
- استخدم كلمات غزاوية يومية مثل: "شو"، "ليش"، "كيفك"، "بدك"، "هاد"، "هاي"، "كثير منيح"، "يعطيك العافية"، "والله"، "زابط"، "ع راسي"، "تمام"، "ما في مشكلة".
- خلي ردك ودود وقريب من الناس، مش رسمي.

**ممنوع منعاً باتاً تطلع في ردك أي:**
- كلام أو مصطلحات إنجليزية (إلا أسماء ماركات معروفة زي iPhone, Samsung).
- أكواد برمجة، JSON، أسماء أدوات (tools)، أسماء حقول قاعدة بيانات، SQL، أو أي مخرجات تقنية.
- شرح كيف وصلت للجواب أو شو الأدوات اللي استخدمتها. اعطي الزبون النتيجة النهائية فقط بكلام بسيط.
- لا تكتب رموز markdown معقدة أو code blocks. نص عربي طبيعي مع نقاط بسيطة بس.

**قاعدة المصدر (الأهم على الإطلاق):**
- معلوماتك كلها لازم تكون من داخل منصة NetPlex فقط، يعني من نتائج الأدوات (الإعلانات وإحصائيات الأسعار) اللي رجعتلك.
- ممنوع تمامًا تقترح أو تذكر أي منتج أو ماركة أو موديل أو سعر أو بائع أو رابط أو متجر مش موجود في نتائج الأدوات.
- ممنوع تستخدم معرفتك العامة عن الأسعار أو المنتجات، وممنوع تخترع أرقام أو تخمّن.
- إذا نتائج البحث فاضية أو ما لقيت المطلوب على المنصة، قول بصراحة: "والله هلأ ما في هاد المنتج معروض على نت بلكس"، واقترح بس منتجات موجودة فعلاً بالنتائج، أو انصحه يجرب بحث تاني/يحفظ تنبيه.
- ممنوع توجّه الزبون لأي منصة أو موقع تاني برا نت بلكس.

قواعدك (داخلية، ما تذكرها للمستخدم):
1. استخدم الأدوات للحصول على بيانات حقيقية - لا تخمن الأسعار.
2. عند السؤال عن الأسعار، احصل على إحصائيات السوق ثم اعرضها بكلام بسيط.
3. أعطِ حكماً واضحاً بالعربي: "صفقة ممتازة" / "سعر عادل" / "أعلى من السوق".
4. إذا كان عدد العينات أقل من 5، قل "البيانات لسا قليلة" واعرض البدائل الموجودة على المنصة.
5. ذكّر دائماً بفحص المنتج شخصياً والتأكد من الضمان.
6. رتب النتائج من الأرخص للأغلى. اذكر البائع الموثق برمز ✓.
7. أي سؤال عن منتجات أو أسعار أو توفّر: لازم تستخدم أداة البحث قبل ما تجاوب.

${contextInfo}`;


    // Define tools for the LLM
    const tools = [
      {
        type: "function",
        function: {
          name: "search_listings",
          description: "البحث عن إعلانات متاحة في السوق حسب النص والمنطقة والحالة",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "نص البحث (ماركة، موديل، أو وصف)" },
              region: { type: "string", description: "المنطقة (مثل: gaza-city, khan-younis)" },
              condition: { type: "string", description: "حالة المنتج (new, like_new, good, fair, poor)" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_price_stats",
          description: "الحصول على إحصائيات الأسعار (متوسط، نطاق عادل) لماركة وموديل معين خلال آخر 30 يوم",
          parameters: {
            type: "object",
            properties: {
              brand: { type: "string", description: "الماركة" },
              model: { type: "string", description: "الموديل" },
              condition: { type: "string", description: "حالة المنتج" },
            },
            required: ["brand", "model"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "suggest_category",
          description: "اقتراح أفضل تصنيف لمنتج بناءً على عنوانه ووصفه",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "عنوان المنتج" },
              description: { type: "string", description: "وصف المنتج" },
            },
            required: ["title"],
          },
        },
      },
    ];

    const callGateway = async (body: any) => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "google/gemini-3.6-flash", ...body }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        console.error("AI error:", resp.status, t);
        const err: any = new Error("AI gateway error");
        err.status = resp.status;
        throw err;
      }
      return await resp.json();
    };

    const runTool = async (toolCall: any) => {
      let args: any = {};
      try { args = JSON.parse(toolCall.function.arguments || "{}"); } catch { /* ignore */ }
      switch (toolCall.function.name) {
        case "search_listings":
          return await searchListings(supabase, args.query, args.region, args.condition);
        case "get_price_stats":
          return await getPriceStats(supabase, args.brand, args.model, args.condition);
        case "suggest_category":
          return await suggestCategory(supabase, args.title, args.description);
        default:
          return { error: "Unknown tool" };
      }
    };

    const lastUserMsg: string = [...(messages || [])].reverse()
      .find((m: any) => m.role === "user")?.content ?? "";
    const PRODUCT_HINTS = ["سعر", "أسعار", "اسعار", "بكم", "كم", "بدي", "ابحث", "بحث", "متوفر", "في عند", "أرخص", "ارخص", "منتج", "جهاز", "موبايل", "هاتف", "لابتوب", "سيارة", "شاشة", "price", "cheap", "find", "buy"];
    const looksProductQuery = PRODUCT_HINTS.some((h) => lastUserMsg.includes(h));

    const finalGuard = {
      role: "system",
      content:
        "اكتب الرد النهائي باللهجة الغزاوية بس، وبلا أي إنجليزي أو مخرجات تقنية. اعتمد حصراً على نتائج الأدوات فوق: لا تذكر أي منتج أو سعر أو بائع غير الموجود فيها. إذا النتائج فاضية قول إنه المنتج مش معروض حالياً على نت بلكس.",
    };

    const convo: any[] = [{ role: "system", content: systemPrompt }, ...(messages || [])];
    let usedTools = false;
    let reply = "";

    // Agentic loop (non-streaming) so a tool-call turn never reaches the client as an empty answer.
    for (let step = 0; step < 3; step++) {
      const result = await callGateway({ messages: convo, tools, tool_choice: "auto" });
      const msg = result.choices?.[0]?.message;
      let toolCalls = msg?.tool_calls ?? [];

      // Grounding guard: force a platform search on the first turn for product questions.
      if (step === 0 && toolCalls.length === 0 && looksProductQuery && lastUserMsg) {
        toolCalls = [{
          id: "forced_search_1",
          type: "function",
          function: { name: "search_listings", arguments: JSON.stringify({ query: lastUserMsg.slice(0, 120) }) },
        }];
        convo.push({ role: "assistant", content: null, tool_calls: toolCalls });
      } else if (toolCalls.length > 0) {
        convo.push(msg);
      }

      if (toolCalls.length === 0) {
        reply = (msg?.content || "").trim();
        break;
      }

      usedTools = true;
      for (const toolCall of toolCalls) {
        const toolResult = await runTool(toolCall);
        convo.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
      convo.push(finalGuard);
    }

    // If the model kept calling tools, force a plain text answer.
    if (!reply) {
      if (usedTools) convo.push(finalGuard);
      const forced = await callGateway({ messages: convo, tool_choice: "none" });
      reply = (forced.choices?.[0]?.message?.content || "").trim();
    }

    return new Response(
      JSON.stringify({ reply: reply || "والله ما لقيت معلومات كافية عن هاد الشي على نت بلكس. جرب تسألني بطريقة تانية." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("netplex-ai error:", e);
    const status = (e as any)?.status;
    if (status === 429) {
      return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول بعد قليل." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (status === 402) {
      return new Response(JSON.stringify({ error: "يرجى شحن الرصيد للاستمرار." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
