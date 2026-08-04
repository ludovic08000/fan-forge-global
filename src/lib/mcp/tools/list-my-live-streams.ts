import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_live_streams",
  title: "List my live streams",
  description: "List the signed-in creator's live streams on The Forge (scheduled, live and ended) with viewer counts.",
  inputSchema: {
    status: z.enum(["scheduled", "live", "ended"]).optional().describe("Filter by stream status."),
    limit: z.number().int().optional().describe("Maximum number of streams to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
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
      .from("live_streams")
      .select("id, title, status, is_premium, price, scheduled_at, started_at, ended_at, viewer_count, peak_viewer_count")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })
      .limit(max);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { streams: data ?? [] },
    };
  },
});