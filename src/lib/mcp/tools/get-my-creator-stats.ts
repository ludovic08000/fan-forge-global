import { defineTool } from "@lovable.dev/mcp-js";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_creator_stats",
  title: "Get my creator stats",
  description: "Get the signed-in creator's key stats on The Forge: stage name, subscription price, subscriber count, published content count and total earnings.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("creators")
      .select("id, stage_name, category, subscription_price, currency, total_subscribers, total_content, total_earnings, is_paused, is_featured")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "This account is not a creator account." }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { creator: data },
    };
  },
});