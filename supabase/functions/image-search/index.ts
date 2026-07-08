import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "الصورة مطلوبة" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Ask Gemini vision to extract product identifiers as JSON
    const analysisResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `أنت محلل صور منتجات. بترجع JSON فقط بالحقول التالية بالعربي:
{
  "brand": "الماركة إن ظهرت أو فاضي",
  "model": "الموديل إن ظهر أو فاضي",
  "category": "كلمة مفتاحية للصنف (هاتف/لابتوب/ملابس/أثاث...)",
  "keywords": ["كلمات", "بحث", "بالعربي"]
}
ممنوع أي شرح، JSON فقط.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "حلل هاي الصورة وارجع JSON بس." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!analysisResp.ok) {
      const status = analysisResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد، حاول بعد قليل." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "يرجى شحن الرصيد للاستمرار." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await analysisResp.text();
      console.error("Vision error:", status, t);
      throw new Error("Vision analysis failed");
    }

    const analysisJson = await analysisResp.json();
    const rawContent: string = analysisJson.choices?.[0]?.message?.content || "{}";
    // Extract JSON object (strip markdown fences if any)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const brand = (analysis.brand || "").toString().trim();
    const model = (analysis.model || "").toString().trim();
    const keywords: string[] = Array.isArray(analysis.keywords) ? analysis.keywords : [];
    const category = (analysis.category || "").toString().trim();

    // Build OR filter
    const terms = [brand, model, category, ...keywords].filter((t) => t && t.length > 1);
    let query = supabase
      .from("listings")
      .select("id, title, brand, model, price_ils, condition, region, images, view_count, save_count, published_at, sellers!inner(verified, shop_name)")
      .eq("status", "available")
      .order("published_at", { ascending: false })
      .limit(20);

    if (terms.length > 0) {
      const orExpr = terms
        .slice(0, 8)
        .map((t) => `title.ilike.%${t}%,brand.ilike.%${t}%,model.ilike.%${t}%`)
        .join(",");
      query = query.or(orExpr);
    }

    const { data: listings, error: searchErr } = await query;
    if (searchErr) console.error("Search error:", searchErr);

    return new Response(
      JSON.stringify({
        analysis: { brand, model, category, keywords },
        listings: listings || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("image-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
