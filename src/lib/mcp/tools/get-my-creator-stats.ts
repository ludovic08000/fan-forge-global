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
      .rpc("get_my_creator_full")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "This account is not a creator account." }] };
    const creator = {
      id: data.id,
      stage_name: data.stage_name,
      category: data.category,
      subscription_price: data.subscription_price,
      currency: data.currency,
      total_subscribers: data.total_subscribers,
      total_content: data.total_content,
      total_earnings: data.total_earnings,
      is_paused: data.is_paused,
      is_featured: data.is_featured,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(creator) }],
      structuredContent: { creator },
    };
  },
});