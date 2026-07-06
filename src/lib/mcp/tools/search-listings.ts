import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_listings",
  title: "Search listings",
  description:
    "Search available NetPlex marketplace listings by keyword, category slug, region, brand, or price range. Returns up to 20 results ordered by newest.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free-text search on title/brand/model."),
    category_slug: z.string().trim().optional().describe("Category slug filter, e.g. 'phones'."),
    region: z.string().trim().optional().describe("Region filter (Arabic name)."),
    brand: z.string().trim().optional(),
    min_price_ils: z.number().nonnegative().optional(),
    max_price_ils: z.number().positive().optional(),
    limit: z.number().int().min(1).max(50).optional().describe("Max results, default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input) => {
    const supabase = client();
    let q = supabase
      .from("listings")
      .select("id,title,price_ils,region,brand,model,condition,category_id,seller_id,view_count,created_at")
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 20);

    if (input.query) {
      const term = `%${input.query}%`;
      q = q.or(`title.ilike.${term},brand.ilike.${term},model.ilike.${term}`);
    }
    if (input.region) q = q.eq("region", input.region);
    if (input.brand) q = q.ilike("brand", input.brand);
    if (input.min_price_ils != null) q = q.gte("price_ils", input.min_price_ils);
    if (input.max_price_ils != null) q = q.lte("price_ils", input.max_price_ils);

    if (input.category_slug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", input.category_slug)
        .maybeSingle();
      if (cat?.id) q = q.eq("category_id", cat.id);
    }

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});
