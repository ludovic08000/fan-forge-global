import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfileTool from "./tools/get-my-profile";
import getMyCreatorStatsTool from "./tools/get-my-creator-stats";
import listMyContentTool from "./tools/list-my-content";
import listMySubscriptionsTool from "./tools/list-my-subscriptions";
import listMyNotificationsTool from "./tools/list-my-notifications";
import listMyLiveStreamsTool from "./tools/list-my-live-streams";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fan-forge-global",
  title: "fan-forge-global",
  version: "0.1.0",
  instructions:
    "Tools for The Forge, a creator subscription platform. All tools act as the signed-in user: read their profile, creator stats, content library, subscriptions, live streams and notifications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfileTool,
    getMyCreatorStatsTool,
    listMyContentTool,
    listMySubscriptionsTool,
    listMyNotificationsTool,
    listMyLiveStreamsTool,
  ],
});