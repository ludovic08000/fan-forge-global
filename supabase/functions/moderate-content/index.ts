import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Max image size: 10MB base64 ≈ 7.5MB actual file
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require authentication
    const authResult = await validateJwtAndGetUserId(req.headers.get('Authorization'));
    
    if (authResult.error) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;

    const { imageBase64, contentType, contentId } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image base64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate image size
    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Image too large (max 10MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Moderating content for user ${userId}, content ${contentId}, type: ${contentType}`);

    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Tu es un modérateur de contenu pour une plateforme de créateurs adultes.
            
Ton rôle est d'analyser les images et de détecter:
1. Contenu illégal (mineurs, violence extrême, non-consentement apparent)
2. Contenus interdits (armes, drogues, symboles haineux)
3. Qualité du contenu (flou excessif, image corrompue)

IMPORTANT: Cette plateforme est réservée aux adultes et permet le contenu érotique/adulte LÉGAL.
Le contenu érotique adulte entre personnes consenties est AUTORISÉ.

Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte avant ou après.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyse cette image uploadée par un créateur. Réponds UNIQUEMENT avec ce JSON:
{
  "approved": boolean,
  "confidence": number (0-100),
  "category": "safe" | "adult" | "explicit" | "illegal" | "rejected",
  "issues": [liste des problèmes détectés],
  "flags": {
    "possibleMinor": boolean,
    "violence": boolean,
    "nonConsent": boolean,
    "illegalContent": boolean,
    "hateSymbols": boolean,
    "poorQuality": boolean
  },
  "recommendation": "approve" | "manual_review" | "reject",
  "reason": "explication courte"
}`
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded', 
            recommendation: 'manual_review',
            reason: 'Service temporairement indisponible'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ 
            error: 'Payment required',
            recommendation: 'manual_review',
            reason: 'Service IA non disponible' 
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'AI analysis failed',
          recommendation: 'manual_review',
          reason: 'Erreur lors de l\'analyse'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ 
          error: 'No AI response',
          recommendation: 'manual_review',
          reason: 'Pas de réponse de l\'IA'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let moderationResult;
    try {
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();
      
      moderationResult = JSON.parse(cleanedContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      moderationResult = {
        approved: false,
        confidence: 0,
        category: "unknown",
        issues: ["Impossible d'analyser automatiquement"],
        flags: {
          possibleMinor: false,
          violence: false,
          nonConsent: false,
          illegalContent: false,
          hateSymbols: false,
          poorQuality: false
        },
        recommendation: "manual_review",
        reason: "L'IA n'a pas pu analyser ce contenu, vérification manuelle requise"
      };
    }

    console.log(`Moderation result for content ${contentId}:`, moderationResult);

    // If manual review is needed, add to moderation queue
    if (moderationResult.recommendation === 'manual_review' || moderationResult.recommendation === 'reject') {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          
          await supabaseAdmin.from('ai_moderation_queue').insert({
            content_id: contentId || null,
            user_id: userId,
            content_type: contentType || 'image',
            file_url: imageUrl.substring(0, 500), // Truncate base64
            ai_category: moderationResult.category,
            ai_confidence: moderationResult.confidence,
            ai_recommendation: moderationResult.recommendation,
            ai_reason: moderationResult.reason,
            ai_flags: moderationResult.flags,
            ai_issues: moderationResult.issues,
            ai_model: "google/gemini-3-flash-preview",
            analyzed_at: new Date().toISOString()
          });
          
          console.log(`Added content ${contentId} to moderation queue`);
        }
      } catch (queueError) {
        console.error('Failed to add to moderation queue:', queueError);
        // Don't fail the request, just log the error
      }
    }

    const result = {
      ...moderationResult,
      contentId,
      userId,
      contentType,
      analyzedAt: new Date().toISOString(),
      aiModel: "google/gemini-3-flash-preview"
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'manual_review',
        reason: 'Erreur technique'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
