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
  name: "get_listing",
  title: "Get listing details",
  description: "Fetch full details for a single NetPlex listing by its ID.",
  inputSchema: {
    listing_id: z.string().uuid().describe("Listing UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ listing_id }) => {
    const supabase = client();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Listing not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { listing: data },
    };
  },
});
