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
  name: "list_verified_sellers",
  title: "List verified sellers",
  description: "List verified NetPlex sellers ordered by trust score. Optionally filter by region.",
  inputSchema: {
    region: z.string().trim().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ region, limit }) => {
    const supabase = client();
    let q = supabase
      .from("sellers_public")
      .select("id,user_id,shop_name,region,trust_score,verified")
      .eq("verified", true)
      .order("trust_score", { ascending: false, nullsFirst: false })
      .limit(limit ?? 20);
    if (region) q = q.eq("region", region);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { sellers: data ?? [] },
    };
  },
});
