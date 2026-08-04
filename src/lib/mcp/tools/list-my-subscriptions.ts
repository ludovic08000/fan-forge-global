import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_subscriptions",
  title: "List my subscriptions",
  description: "List the subscriptions of the signed-in account on The Forge — the creators they subscribe to, plus subscriptions received when the account is a creator.",
  inputSchema: {
    status: z.enum(["active", "expired", "canceled"]).optional().describe("Filter by subscription status."),
    limit: z.number().int().optional().describe("Maximum number of subscriptions to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    let query = supabase
      .from("subscriptions")
      .select("id, creator_id, subscriber_id, status, price, currency, start_date, end_date, auto_renew, created_at")
      .order("created_at", { ascending: false })
      .limit(max);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { subscriptions: data ?? [] },
    };
  },
});