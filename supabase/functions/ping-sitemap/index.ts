import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PING-SITEMAP] ${step}${detailsStr}`);
};

// URLs des moteurs de recherche à notifier
const SEARCH_ENGINE_PING_URLS = [
  // Google
  "https://www.google.com/ping?sitemap=",
  // Bing (inclut Yahoo)
  "https://www.bing.com/ping?sitemap=",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const sitemapUrl = "https://usjxcgauyvdocngfkhys.supabase.co/functions/v1/sitemap";
    
    logStep("Starting sitemap ping", { sitemapUrl });

    const results: { engine: string; success: boolean; status?: number; error?: string }[] = [];

    // Ping each search engine
    for (const pingBaseUrl of SEARCH_ENGINE_PING_URLS) {
      const pingUrl = `${pingBaseUrl}${encodeURIComponent(sitemapUrl)}`;
      const engineName = pingBaseUrl.includes("google") ? "Google" : "Bing";
      
      try {
        const response = await fetch(pingUrl, {
          method: "GET",
          headers: {
            "User-Agent": "TheForge-Sitemap-Pinger/1.0",
          },
        });

        results.push({
          engine: engineName,
          success: response.ok,
          status: response.status,
        });

        logStep(`Pinged ${engineName}`, { 
          status: response.status, 
          ok: response.ok 
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          engine: engineName,
          success: false,
          error: errorMessage,
        });
        logStep(`Error pinging ${engineName}`, { error: errorMessage });
      }
    }

    // Also ping IndexNow for Bing/Yandex (modern protocol)
    try {
      const indexNowUrl = "https://api.indexnow.org/indexnow";
      
      // Fetch recent creators for IndexNow
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const { data: recentCreators } = await supabase
        .from('creators')
        .select('user_id')
        .or('is_paused.is.null,is_paused.eq.false')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', recentCreators?.map(c => c.user_id) || []);
      
      const creatorUrls = profiles
        ?.filter(p => p.username)
        .map(p => `https://theforge.fans/${p.username}`) || [];

      const indexNowResponse = await fetch(indexNowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TheForge-Sitemap-Pinger/1.0",
        },
        body: JSON.stringify({
          host: "theforge.fans",
          key: "crub-indexnow-key",
          keyLocation: "https://theforge.fans/crub-indexnow-key.txt",
          urlList: [
            "https://theforge.fans/",
            "https://theforge.fans/search",
            "https://theforge.fans/lives",
            ...creatorUrls,
          ],
        }),
      });

      results.push({
        engine: "IndexNow",
        success: indexNowResponse.ok,
        status: indexNowResponse.status,
      });

      logStep("Pinged IndexNow", { status: indexNowResponse.status });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        engine: "IndexNow",
        success: false,
        error: errorMessage,
      });
    }

    const successCount = results.filter(r => r.success).length;

    logStep("Sitemap ping completed", { 
      totalEngines: results.length,
      successCount,
      results 
    });

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Pinged ${successCount}/${results.length} search engines`,
        results,
        sitemapUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
