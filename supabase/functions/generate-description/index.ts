import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, brand, model, condition, imageDataUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!title || !imageDataUrl) {
      return new Response(JSON.stringify({ error: "العنوان والصورة مطلوبان" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `أنت مساعد كتابة أوصاف منتجات باللهجة الغزاوية الفلسطينية العامية لسوق NetPlex.
مهمتك: تكتب وصف تسويقي جذاب للمنتج، بين 40 و 120 كلمة، بالعربي الغزاوي فقط.

قواعد:
- ركّز على المميزات المرئية بالصورة (اللون، الحالة، المرفقات، أي عيوب واضحة).
- اذكر الماركة والموديل إن توفروا.
- اقترح استخدامات أو فئات مستهدفة.
- اختم بجملة تشجّع على التواصل.
- ممنوع أي كلام إنجليزي (إلا أسماء الماركات).
- ممنوع أي رموز markdown أو نقاط أو عناوين — نص عادي بس.
- ممنوع تخترع تفاصيل مش موجودة بالصورة.
- ما تذكر السعر.`;

    const userText = `العنوان: ${title}
${brand ? `الماركة: ${brand}\n` : ""}${model ? `الموديل: ${model}\n` : ""}${condition ? `الحالة: ${condition}\n` : ""}اكتب وصف المنتج.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
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
      const t = await response.text();
      console.error("AI error:", status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const description = result.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-description error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "حدث خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
