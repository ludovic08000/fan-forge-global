import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Score a metric against Web Vitals thresholds
 * Returns: 'good' | 'needs-improvement' | 'poor'
 */
function rateMetric(
  name: string,
  value: number | null | undefined
): { rating: string; value: number | null } {
  if (value == null) return { rating: "unknown", value: null };

  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    fid: [100, 300],
    cls: [0.1, 0.25],
    fcp: [1800, 3000],
    ttfb: [800, 1800],
    inp: [200, 500],
  };

  const [good, poor] = thresholds[name] || [Infinity, Infinity];
  if (value <= good) return { rating: "good", value };
  if (value <= poor) return { rating: "needs-improvement", value };
  return { rating: "poor", value };
}

/**
 * Calculate overall performance score (0-100)
 */
function calculateScore(metrics: Record<string, any>): number {
  const weights: Record<string, number> = {
    lcp: 25,
    fid: 10,
    cls: 25,
    fcp: 15,
    ttfb: 10,
    inp: 15,
  };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const val = metrics[key];
    if (val == null) continue;

    const { rating } = rateMetric(key, val);
    const score =
      rating === "good" ? 100 : rating === "needs-improvement" ? 60 : 20;

    weightedScore += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
}

/**
 * Generate algorithmic recommendations (fast, no AI needed)
 */
function generateAlgorithmicRecommendations(
  metrics: Record<string, any>
): string[] {
  const recs: string[] = [];

  // LCP
  if (metrics.lcp && metrics.lcp > 2500) {
    if (metrics.lcp > 4000) {
      recs.push(
        "CRITICAL: LCP=" +
          metrics.lcp +
          "ms. Preload hero images, use <link rel=preload>, enable CDN caching, reduce render-blocking resources."
      );
    } else {
      recs.push(
        "LCP=" +
          metrics.lcp +
          "ms (should be <2500ms). Optimize largest image/text block loading. Consider lazy loading below-the-fold images."
      );
    }
  }

  // CLS
  if (metrics.cls && metrics.cls > 0.1) {
    recs.push(
      "CLS=" +
        metrics.cls +
        " (should be <0.1). Add explicit width/height to images and embeds. Avoid injecting content above existing content."
    );
  }

  // FCP
  if (metrics.fcp && metrics.fcp > 1800) {
    recs.push(
      "FCP=" +
        metrics.fcp +
        "ms (should be <1800ms). Reduce render-blocking CSS/JS. Consider critical CSS inlining."
    );
  }

  // TTFB
  if (metrics.ttfb && metrics.ttfb > 800) {
    recs.push(
      "TTFB=" +
        metrics.ttfb +
        "ms (should be <800ms). Check server response time, enable HTTP/2, consider edge caching."
    );
  }

  // INP
  if (metrics.inp && metrics.inp > 200) {
    recs.push(
      "INP=" +
        metrics.inp +
        "ms (should be <200ms). Break up long tasks, use requestIdleCallback, debounce event handlers."
    );
  }

  // DOM size
  if (metrics.dom_nodes && metrics.dom_nodes > 1500) {
    recs.push(
      "DOM has " +
        metrics.dom_nodes +
        " nodes (recommended <1500). Consider virtualizing long lists and lazy rendering off-screen components."
    );
  }

  // JS heap
  if (metrics.js_heap_size && metrics.js_heap_size > 100) {
    recs.push(
      "JS heap=" +
        metrics.js_heap_size +
        "MB. Check for memory leaks, clean up event listeners, and avoid storing large data in state."
    );
  }

  // Transfer size
  if (metrics.total_transfer_size && metrics.total_transfer_size > 3000) {
    recs.push(
      "Total transfer=" +
        metrics.total_transfer_size +
        "KB. Enable gzip/brotli compression, optimize images (WebP/AVIF), code-split aggressively."
    );
  }

  // Resource count
  if (metrics.resource_count && metrics.resource_count > 80) {
    recs.push(
      metrics.resource_count +
        " resources loaded. Bundle and concatenate where possible, use HTTP/2 multiplexing."
    );
  }

  if (recs.length === 0) {
    recs.push("All metrics within acceptable thresholds. Performance is good!");
  }

  return recs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const metrics = await req.json();

    // Validate required fields
    if (!metrics.session_id || !metrics.page_url) {
      return new Response(
        JSON.stringify({ error: "session_id and page_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Calculate score algorithmically (instant, no AI latency)
    const score = calculateScore(metrics);
    const algorithmicRecs = generateAlgorithmicRecommendations(metrics);

    // 2. Store metrics with instant algorithmic analysis
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase
      .from("performance_metrics")
      .insert({
        session_id: metrics.session_id,
        page_url: metrics.page_url,
        user_agent: metrics.user_agent || null,
        device_type: metrics.device_type || null,
        lcp: metrics.lcp || null,
        fid: metrics.fid || null,
        cls: metrics.cls || null,
        fcp: metrics.fcp || null,
        ttfb: metrics.ttfb || null,
        inp: metrics.inp || null,
        dom_nodes: metrics.dom_nodes || null,
        js_heap_size: metrics.js_heap_size || null,
        resource_count: metrics.resource_count || null,
        total_transfer_size: metrics.total_transfer_size || null,
        ai_score: score,
        ai_recommendations: algorithmicRecs,
        ai_analyzed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // 3. If score is below 60 (poor), trigger AI deep analysis asynchronously
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (score < 60 && LOVABLE_API_KEY) {
      // Fire-and-forget AI analysis for poor-performing pages
      (async () => {
        try {
          const prompt = `Analyze these web performance metrics and provide 3-5 specific, actionable optimization recommendations:

Metrics:
- LCP: ${metrics.lcp ?? "N/A"}ms
- FCP: ${metrics.fcp ?? "N/A"}ms
- CLS: ${metrics.cls ?? "N/A"}
- TTFB: ${metrics.ttfb ?? "N/A"}ms
- INP: ${metrics.inp ?? "N/A"}ms
- DOM Nodes: ${metrics.dom_nodes ?? "N/A"}
- JS Heap: ${metrics.js_heap_size ?? "N/A"}MB
- Resources: ${metrics.resource_count ?? "N/A"}
- Transfer Size: ${metrics.total_transfer_size ?? "N/A"}KB
- Device: ${metrics.device_type ?? "unknown"}
- Page: ${metrics.page_url}

Focus on the most impactful improvements. Be specific about React/Vite/Supabase optimizations.`;

          const aiResponse = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a web performance expert. Provide concise, actionable recommendations. Return a JSON array of strings, each being one recommendation.",
                  },
                  { role: "user", content: prompt },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "performance_recommendations",
                      description: "Return performance optimization recommendations",
                      parameters: {
                        type: "object",
                        properties: {
                          recommendations: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of actionable recommendations",
                          },
                        },
                        required: ["recommendations"],
                        additionalProperties: false,
                      },
                    },
                  },
                ],
                tool_choice: {
                  type: "function",
                  function: { name: "performance_recommendations" },
                },
              }),
            }
          );

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall?.function?.arguments) {
              const parsed = JSON.parse(toolCall.function.arguments);
              if (parsed.recommendations?.length) {
                // Update with AI recommendations
                await supabase
                  .from("performance_metrics")
                  .update({
                    ai_recommendations: parsed.recommendations,
                    ai_analyzed_at: new Date().toISOString(),
                  })
                  .eq("session_id", metrics.session_id)
                  .eq("page_url", metrics.page_url)
                  .order("created_at", { ascending: false })
                  .limit(1);
              }
            }
          }
        } catch (aiErr) {
          console.error("AI analysis error (non-blocking):", aiErr);
        }
      })();
    }

    return new Response(
      JSON.stringify({
        score,
        recommendations: algorithmicRecs,
        ratings: {
          lcp: rateMetric("lcp", metrics.lcp),
          fcp: rateMetric("fcp", metrics.fcp),
          cls: rateMetric("cls", metrics.cls),
          ttfb: rateMetric("ttfb", metrics.ttfb),
          inp: rateMetric("inp", metrics.inp),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("analyze-performance error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
