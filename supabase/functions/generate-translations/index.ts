import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";

/**
 * Génère les traductions manquantes via Lovable AI
 * Prend les clés anglaises comme référence et traduit dans les langues demandées
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Require authentication
    const { userId, error: authError, statusCode } = await validateJwtAndGetUserId(req.headers.get('Authorization'));
    if (authError) {
      return new Response(
        JSON.stringify({ error: authError }),
        { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sourceTexts, targetLanguages } = await req.json();

    if (!sourceTexts || !targetLanguages || !Array.isArray(targetLanguages)) {
      return new Response(
        JSON.stringify({ error: "sourceTexts (object) and targetLanguages (array) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const languageNames: Record<string, string> = {
      fr: "French",
      es: "Spanish",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      nl: "Dutch",
      en: "English",
    };

    const prompt = `You are a professional translator for a web platform called "TheForge" (a premium content creator platform similar to OnlyFans/Patreon).

Translate the following English UI texts into these languages: ${targetLanguages.map(l => `${languageNames[l] || l} (${l})`).join(", ")}.

Source texts (English):
${JSON.stringify(sourceTexts, null, 2)}

Rules:
- Keep the same JSON structure and keys
- Translate values only, not keys
- Keep brand names (TheForge, Stripe, etc.) unchanged
- Use formal/polite tone appropriate for each language
- For French, use RGPD instead of GDPR
- Keep technical terms when no good translation exists
- Return ONLY valid JSON, no explanation

Return format:
{
  "lang_code": { ...same structure with translated values... },
  ...
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional translator. Return ONLY valid JSON with no markdown formatting, no code blocks, no explanation." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[Generate Translations] AI error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI translation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No translation returned from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from AI response (handle potential markdown code blocks)
    let translations;
    try {
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      translations = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[Generate Translations] Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI translation response", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Generate Translations] Successfully generated translations for ${targetLanguages.join(", ")}`);

    return new Response(
      JSON.stringify({ success: true, translations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Generate Translations] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
