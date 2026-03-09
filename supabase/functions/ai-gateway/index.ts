/**
 * Edge Function IA unifiée - Regroupe toutes les fonctionnalités IA
 * Actions: moderate-content, verify-id-age, add-watermark, generate-translations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const logStep = (action: string, step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-GATEWAY:${action}] ${step}${d}`);
};

// ============ Helper: call Lovable AI ============
async function callAI(apiKey: string, body: Record<string, unknown>) {
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response;
}

function handleAIError(response: Response, corsHeaders: Record<string, string>, fallback?: Record<string, unknown>) {
  if (response.status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later.", ...fallback }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (response.status === 402) {
    return new Response(
      JSON.stringify({ error: "Payment required. Please add credits.", ...fallback }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}

function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

// ============ ACTION: moderate-content ============
async function handleModerateContent(
  body: Record<string, any>,
  userId: string,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  const { imageBase64, contentType, contentId } = body;

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'Image base64 is required' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (imageBase64.length > MAX_IMAGE_SIZE) {
    return new Response(JSON.stringify({ error: 'Image too large (max 10MB)' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  logStep("moderate", "Analyzing content", { contentId, contentType });

  const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

  const response = await callAI(apiKey, {
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content: `Tu es un modérateur de contenu strict pour une plateforme de créateurs adultes.

⚠️ RÈGLES ABSOLUES - TOLÉRANCE ZÉRO ⚠️
Ces contenus doivent être IMMÉDIATEMENT REJETÉS avec recommendation="reject" et illegalContent=true:
1. PÉDOPORNOGRAPHIE / MINEURS: Toute image suggérant des personnes de moins de 18 ans dans un contexte sexuel ou érotique - REJET IMMÉDIAT
2. ZOOPHILIE / BESTIALITÉ: Tout contenu sexuel impliquant des animaux - REJET IMMÉDIAT
3. Violence extrême, torture, gore
4. Non-consentement apparent (viol, agression)

AUTRES CONTENUS INTERDITS (reject):
- Armes à feu, drogues illicites
- Symboles haineux, nazis, racistes
- Contenu dégradant ou humiliant

CONTENUS AUTORISÉS:
- Contenu érotique/adulte LÉGAL entre adultes consentants (18+)
- Nudité artistique adulte

QUALITÉ:
- Images floues, corrompues ou de très mauvaise qualité → manual_review

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
    "zoophilia": boolean,
    "violence": boolean,
    "nonConsent": boolean,
    "illegalContent": boolean,
    "hateSymbols": boolean,
    "poorQuality": boolean
  },
  "recommendation": "approve" | "manual_review" | "reject",
  "reason": "explication courte"
}

IMPORTANT: Si possibleMinor=true OU zoophilia=true → recommendation DOIT être "reject" et illegalContent DOIT être true.`
          },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 1000,
  });

  if (!response.ok) {
    const fallback = { recommendation: 'manual_review', reason: 'Service temporairement indisponible' };
    const errorResp = handleAIError(response, corsHeaders, fallback);
    if (errorResp) return errorResp;
    await response.text();
    return new Response(JSON.stringify({ error: 'AI analysis failed', ...fallback }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  let moderationResult;
  try {
    moderationResult = JSON.parse(cleanJsonResponse(content || ''));
  } catch {
    moderationResult = {
      approved: false, confidence: 0, category: "unknown",
      issues: ["Impossible d'analyser automatiquement"],
      flags: { possibleMinor: false, zoophilia: false, violence: false, nonConsent: false, illegalContent: false, hateSymbols: false, poorQuality: false },
      recommendation: "manual_review",
      reason: "L'IA n'a pas pu analyser ce contenu, vérification manuelle requise"
    };
  }

  // Add to moderation queue if needed
  if (moderationResult.recommendation === 'manual_review' || moderationResult.recommendation === 'reject') {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        await supabaseAdmin.from('ai_moderation_queue').insert({
          content_id: contentId || null, user_id: userId, content_type: contentType || 'image',
          file_url: imageUrl.substring(0, 500),
          ai_category: moderationResult.category, ai_confidence: moderationResult.confidence,
          ai_recommendation: moderationResult.recommendation, ai_reason: moderationResult.reason,
          ai_flags: moderationResult.flags, ai_issues: moderationResult.issues,
          ai_model: "google/gemini-3-flash-preview", analyzed_at: new Date().toISOString()
        });
      }
    } catch (queueError) {
      console.error('Failed to add to moderation queue:', queueError);
    }
  }

  return new Response(JSON.stringify({
    ...moderationResult, contentId, userId, contentType,
    analyzedAt: new Date().toISOString(), aiModel: "google/gemini-3-flash-preview"
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ============ ACTION: verify-id-age ============
async function handleVerifyIdAge(
  body: Record<string, any>,
  userId: string,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  const { imageBase64, documentType, declaredBirthdate } = body;

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: "Image requise" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (imageBase64.length > MAX_IMAGE_SIZE) {
    return new Response(JSON.stringify({ error: "Image trop grande (max 10MB)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  logStep("verify-id", "Verifying document", { documentType });

  const imageData = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

  const response = await callAI(apiKey, {
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: `Tu es un expert en vérification de documents d'identité. Tu dois analyser l'image d'un document d'identité et extraire les informations suivantes de manière précise.

RÈGLES STRICTES:
1. Extrais la date de naissance EXACTE visible sur le document (format: YYYY-MM-DD)
2. Extrais le nom complet visible sur le document
3. Vérifie si le document semble authentique (pas de manipulation évidente)
4. Calcule l'âge en fonction de la date de naissance extraite
5. Détermine si la personne a 18 ans ou plus

Si tu ne peux pas lire clairement les informations, indique-le dans le champ approprié.

IMPORTANT: Ne fais JAMAIS confiance aux informations déclarées par l'utilisateur. Base-toi UNIQUEMENT sur ce qui est visible sur le document.`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyse ce document d'identité (${documentType || "carte d'identité"}).
${declaredBirthdate ? `Date de naissance déclarée par l'utilisateur: ${declaredBirthdate}` : ''}
Retourne les informations extraites au format JSON.`
          },
          { type: "image_url", image_url: { url: imageData } }
        ]
      }
    ],
    tools: [{
      type: "function",
      function: {
        name: "verify_id_document",
        description: "Extraire et vérifier les informations d'âge d'un document d'identité",
        parameters: {
          type: "object",
          properties: {
            extracted_birthdate: { type: "string", description: "Date de naissance au format YYYY-MM-DD, ou null si illisible" },
            extracted_name: { type: "string", description: "Nom complet extrait, ou null si illisible" },
            calculated_age: { type: "number", description: "Âge calculé" },
            is_adult: { type: "boolean", description: "true si 18+ ans" },
            birthdate_matches_declared: { type: "boolean", description: "true si correspond à la date déclarée" },
            document_appears_authentic: { type: "boolean", description: "true si authentique" },
            confidence_level: { type: "string", enum: ["high", "medium", "low"] },
            issues: { type: "array", items: { type: "string" } },
            recommendation: { type: "string", enum: ["approve", "manual_review", "reject"] },
            rejection_reason: { type: "string", description: "Raison du rejet si reject" }
          },
          required: ["is_adult", "confidence_level", "recommendation", "document_appears_authentic"],
          additionalProperties: false
        }
      }
    }],
    tool_choice: { type: "function", function: { name: "verify_id_document" } }
  });

  if (!response.ok) {
    const errorResp = handleAIError(response, corsHeaders);
    if (errorResp) return errorResp;
    await response.text();
    return new Response(JSON.stringify({ recommendation: "manual_review", reason: "Erreur du service", confidence_level: "low" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) {
    return new Response(JSON.stringify({ recommendation: "manual_review", reason: "Impossible d'analyser", confidence_level: "low" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let verificationResult;
  try {
    verificationResult = JSON.parse(toolCall.function.arguments);
  } catch {
    return new Response(JSON.stringify({ recommendation: "manual_review", reason: "Erreur d'analyse", confidence_level: "low" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Determine status
  let status = "pending";
  if (verificationResult.document_appears_authentic === false) status = "rejected";
  else if (verificationResult.is_adult === false && verificationResult.confidence_level === "high") status = "rejected";
  else if (verificationResult.birthdate_matches_declared === false && verificationResult.confidence_level === "high" && declaredBirthdate) status = "rejected";
  else if (verificationResult.is_adult === true && verificationResult.confidence_level === "high" && verificationResult.document_appears_authentic === true && (verificationResult.birthdate_matches_declared !== false || !declaredBirthdate)) status = "approved";

  return new Response(JSON.stringify({
    ...verificationResult, userId, documentType, declaredBirthdate,
    verifiedAt: new Date().toISOString(), status
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ============ ACTION: add-watermark ============
async function handleAddWatermark(
  body: Record<string, any>,
  userId: string,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  const { imageBase64, creatorName } = body;

  if (!imageBase64 || !creatorName) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (imageBase64.length > MAX_IMAGE_SIZE) {
    return new Response(JSON.stringify({ error: 'Image too large (max 10MB)' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  logStep("watermark", "Adding watermark", { creatorName });

  const response = await callAI(apiKey, {
    model: 'google/gemini-2.5-flash-image-preview',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Add a subtle watermark to this image. The watermark should display "${creatorName}" in white text with 30% opacity, positioned diagonally across the bottom right corner. The text should be elegant and professional, not too intrusive but clearly visible for copyright protection.`
        },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      ]
    }],
    modalities: ['image', 'text']
  });

  if (!response.ok) {
    const errorResp = handleAIError(response, corsHeaders);
    if (errorResp) return errorResp;
    await response.text();
    return new Response(JSON.stringify({ error: 'AI watermark failed', success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const data = await response.json();
  const watermarkedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!watermarkedImageUrl) {
    return new Response(JSON.stringify({ error: 'No watermarked image returned', success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ watermarkedImage: watermarkedImageUrl, success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ============ ACTION: generate-translations ============
async function handleGenerateTranslations(
  body: Record<string, any>,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  const { sourceTexts, targetLanguages } = body;

  if (!sourceTexts || !targetLanguages || !Array.isArray(targetLanguages)) {
    return new Response(JSON.stringify({ error: "sourceTexts and targetLanguages required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const languageNames: Record<string, string> = {
    fr: "French", es: "Spanish", de: "German", it: "Italian",
    pt: "Portuguese", nl: "Dutch", en: "English",
  };

  const prompt = `You are a professional translator for a web platform called "TheForge" (a premium content creator platform similar to OnlyFans/Patreon).

Translate the following English UI texts into these languages: ${targetLanguages.map((l: string) => `${languageNames[l] || l} (${l})`).join(", ")}.

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

  const response = await callAI(apiKey, {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: "You are a professional translator. Return ONLY valid JSON with no markdown formatting, no code blocks, no explanation." },
      { role: "user", content: prompt },
    ],
  });

  if (!response.ok) {
    const errorResp = handleAIError(response, corsHeaders);
    if (errorResp) return errorResp;
    await response.text();
    return new Response(JSON.stringify({ error: "AI translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;

  if (!content) {
    return new Response(JSON.stringify({ error: "No translation returned" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let translations;
  try {
    translations = JSON.parse(cleanJsonResponse(content));
  } catch {
    return new Response(JSON.stringify({ error: "Failed to parse translation", raw: content }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ success: true, translations }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ============ ACTION: ai-marketing ============
async function handleAIMarketing(
  body: Record<string, any>,
  userId: string,
  apiKey: string,
  corsHeaders: Record<string, string>
) {
  const { marketingAction, creatorStats, stageName, context, contentTitle, contentType, promoType, promoContext } = body;

  if (!marketingAction) {
    return new Response(JSON.stringify({ error: "marketingAction required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  logStep("marketing", `Action: ${marketingAction}`, { stageName });

  const statsContext = `Stats du créateur "${stageName || 'Créateur'}":
- Abonnés: ${creatorStats?.totalSubscribers || 0}
- Vues totales: ${creatorStats?.totalViews || 0}
- Likes totaux: ${creatorStats?.totalLikes || 0}
- Revenus totaux: ${creatorStats?.totalEarnings?.toFixed(2) || '0'}€`;

  let systemPrompt = "";
  let userPrompt = "";
  let toolDef: any = null;

  switch (marketingAction) {
    case 'content-suggestions':
      systemPrompt = "Tu es un expert en marketing pour créateurs de contenu sur une plateforme premium (type OnlyFans/Patreon). Tu donnes des conseils concrets et actionnables.";
      userPrompt = `${statsContext}
${context ? `Contexte: ${context}` : ''}

Génère 5 suggestions de contenu concrètes pour maximiser les revenus et l'engagement. Pour chaque suggestion, indique le type, un titre accrocheur, une description détaillée, le meilleur moment pour poster, et des tags pertinents.`;
      toolDef = {
        name: "content_suggestions",
        description: "Retourner des suggestions de contenu",
        parameters: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", description: "photo, video, live, story" },
                  title: { type: "string" },
                  description: { type: "string" },
                  bestTime: { type: "string" },
                  tags: { type: "array", items: { type: "string" } }
                },
                required: ["type", "title", "description"]
              }
            }
          },
          required: ["suggestions"],
          additionalProperties: false
        }
      };
      break;

    case 'generate-description':
      systemPrompt = "Tu es un copywriter expert pour créateurs de contenu premium. Tu écris des descriptions accrocheuses qui maximisent l'engagement et les conversions.";
      userPrompt = `${statsContext}

Génère 3 options de titre + description pour un contenu de type "${contentType || 'photo'}" sur le thème: "${contentTitle}". Chaque option doit avoir un style différent (provocant, mystérieux, direct). Inclus des hashtags pertinents.`;
      toolDef = {
        name: "generate_descriptions",
        description: "Retourner des options de descriptions",
        parameters: {
          type: "object",
          properties: {
            options: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  hashtags: { type: "array", items: { type: "string" } },
                  style: { type: "string" }
                },
                required: ["title", "description"]
              }
            }
          },
          required: ["options"],
          additionalProperties: false
        }
      };
      break;

    case 'revenue-analysis':
      systemPrompt = "Tu es un consultant business spécialisé dans la monétisation pour créateurs de contenu premium. Tu analyses les données et donnes des recommandations concrètes avec des chiffres.";
      userPrompt = `${statsContext}

Analyse les performances de ce créateur et donne:
1. Une analyse globale de la situation
2. 4-5 recommandations concrètes pour augmenter les revenus (avec estimation d'impact: faible/moyen/élevé)
3. Une suggestion de prix d'abonnement optimal avec justification`;
      toolDef = {
        name: "revenue_analysis",
        description: "Retourner l'analyse des revenus et recommandations",
        parameters: {
          type: "object",
          properties: {
            analysis: { type: "string", description: "Analyse globale" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string", enum: ["faible", "moyen", "élevé"] }
                },
                required: ["title", "description", "impact"]
              }
            },
            priceSuggestion: { type: "number", description: "Prix d'abonnement suggéré en euros" },
            priceReason: { type: "string" }
          },
          required: ["analysis", "recommendations"],
          additionalProperties: false
        }
      };
      break;

    case 'promo-message':
      const promoLabels: Record<string, string> = {
        welcome: "message de bienvenue pour un nouvel abonné",
        retention: "message de rétention pour fidéliser un abonné existant",
        reactivation: "message de réactivation pour un ancien abonné qui s'est désabonné",
        special_offer: "message promotionnel pour une offre spéciale",
        new_content: "annonce de nouveau contenu pour créer de l'anticipation"
      };
      systemPrompt = "Tu es un expert en copywriting et marketing relationnel pour créateurs de contenu premium. Tu écris des messages engageants, personnels et efficaces.";
      userPrompt = `${statsContext}
${promoContext ? `Contexte: ${promoContext}` : ''}

Génère 3 variantes de ${promoLabels[promoType] || 'message marketing'} pour le créateur "${stageName}". Chaque message doit avoir un ton différent (chaleureux, exclusif, urgent). Inclus un call-to-action pour chaque.`;
      toolDef = {
        name: "promo_messages",
        description: "Retourner des messages promotionnels",
        parameters: {
          type: "object",
          properties: {
            messages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tone: { type: "string", description: "chaleureux, exclusif, urgent" },
                  text: { type: "string" },
                  callToAction: { type: "string" }
                },
                required: ["tone", "text"]
              }
            }
          },
          required: ["messages"],
          additionalProperties: false
        }
      };
      break;

    default:
      return new Response(JSON.stringify({ error: `Unknown marketing action: ${marketingAction}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const aiBody: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
  };

  if (toolDef) {
    aiBody.tools = [{ type: "function", function: toolDef }];
    aiBody.tool_choice = { type: "function", function: { name: toolDef.name } };
  }

  const response = await callAI(apiKey, aiBody);

  if (!response.ok) {
    const errorResp = handleAIError(response, corsHeaders);
    if (errorResp) return errorResp;
    await response.text();
    return new Response(JSON.stringify({ error: "AI marketing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    try {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch {
      // Fallback to content
    }
  }

  // Fallback: parse text content
  const content = data.choices?.[0]?.message?.content;
  if (content) {
    try {
      const result = JSON.parse(cleanJsonResponse(content));
      return new Response(JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch {
      return new Response(JSON.stringify({ text: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({ error: "No AI response" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const requestBody = await req.json();
    const { action, ...params } = requestBody;

    if (!action) {
      return new Response(JSON.stringify({ error: "action parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Auth required for all actions
    let userId: string | null = null;
    const authResult = await validateJwtAndGetUserId(req.headers.get('Authorization'));
    if (authResult.error) {
      return new Response(JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    userId = authResult.userId!;

    logStep(action, "Processing request");

    switch (action) {
      case 'moderate-content':
        return await handleModerateContent(params, userId!, LOVABLE_API_KEY, corsHeaders);
      case 'verify-id-age':
        return await handleVerifyIdAge(params, userId!, LOVABLE_API_KEY, corsHeaders);
      case 'add-watermark':
        return await handleAddWatermark(params, userId!, LOVABLE_API_KEY, corsHeaders);
      case 'generate-translations':
        return await handleGenerateTranslations(params, LOVABLE_API_KEY, corsHeaders);
      case 'ai-marketing':
        return await handleAIMarketing(params, userId!, LOVABLE_API_KEY, corsHeaders);
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("[AI-GATEWAY] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
