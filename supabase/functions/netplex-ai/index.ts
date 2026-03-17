import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    q = q.or(`title.ilike.%${queryText}%,brand.ilike.%${queryText}%,model.ilike.%${queryText}%`);
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

    const systemPrompt = `أنت مساعد NetPlex الذكي، منصة سوق إلكتروني في غزة. تجيب بالعربية دائماً وبشكل مختصر ومفيد.

قواعدك:
1. استخدم الأدوات المتاحة للحصول على بيانات حقيقية من قاعدة البيانات - لا تخمن الأسعار أبداً.
2. عند السؤال عن الأسعار، استخدم أداة get_price_stats للحصول على إحصائيات السوق الحقيقية.
3. عند البحث عن منتجات، استخدم أداة search_listings.
4. عند السؤال عن التصنيف، استخدم أداة suggest_category.
5. أعط حكماً واضحاً: "صفقة ممتازة" / "سعر عادل" / "أعلى من السوق".
6. إذا كان عدد العينات أقل من 5، قل "لا تتوفر بيانات كافية حالياً" واعرض أقرب البدائل.
7. أضف دائماً ملاحظة أمان مختصرة: تأكد من فحص المنتج شخصياً والتحقق من الضمان.
8. رتب النتائج حسب السعر من الأقل للأعلى.
9. اذكر إذا كان البائع موثقاً (✓).

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

    // First LLM call - intent parsing with tool calling
    const firstResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!firstResponse.ok) {
      const status = firstResponse.status;
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
      const t = await firstResponse.text();
      console.error("AI error:", status, t);
      throw new Error("AI gateway error");
    }

    const firstResult = await firstResponse.json();
    const firstChoice = firstResult.choices?.[0];

    // If no tool calls, return the response directly
    if (!firstChoice?.message?.tool_calls || firstChoice.message.tool_calls.length === 0) {
      return new Response(JSON.stringify({ reply: firstChoice?.message?.content || "عذراً، لم أستطع المساعدة." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute tool calls
    const toolResults: any[] = [];
    for (const toolCall of firstChoice.message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      let result: any;

      switch (toolCall.function.name) {
        case "search_listings":
          result = await searchListings(supabase, args.query, args.region, args.condition);
          break;
        case "get_price_stats":
          result = await getPriceStats(supabase, args.brand, args.model, args.condition);
          break;
        case "suggest_category":
          result = await suggestCategory(supabase, args.title, args.description);
          break;
        default:
          result = { error: "Unknown tool" };
      }

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // Second LLM call - format the response with tool results (streaming)
    const secondResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          firstChoice.message,
          ...toolResults,
        ],
        stream: true,
      }),
    });

    if (!secondResponse.ok) {
      const t = await secondResponse.text();
      console.error("AI second call error:", secondResponse.status, t);
      throw new Error("AI response formatting error");
    }

    return new Response(secondResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("netplex-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
