import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_content",
  title: "List my content",
  description: "List the signed-in creator's content items on The Forge with title, type, price, status and engagement counters.",
  inputSchema: {
    limit: z.number().int().optional().describe("Maximum number of items to return (default 20, max 100)."),
    status: z.enum(["draft", "published", "archived"]).optional().describe("Filter by publication status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (creatorError) return { content: [{ type: "text", text: creatorError.message }], isError: true };
    if (!creator) return { content: [{ type: "text", text: "This account is not a creator account." }] };

    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    let query = supabase
      .from("content")
      .select("id, title, content_type, is_premium, price, status, view_count, like_count, created_at")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })
      .limit(max);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { items: data ?? [] },
    };
  },
});