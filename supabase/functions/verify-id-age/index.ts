import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Max image size: 10MB base64 ≈ 7.5MB actual file
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // SECURITY: Require authentication
    const authResult = await validateJwtAndGetUserId(req.headers.get("Authorization"));
    
    if (authResult.error) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId!;

    const { imageBase64, documentType, declaredBirthdate } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate image size
    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Image trop grande (max 10MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service de vérification non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[verify-id-age] User ${userId} requesting age verification`);

    const imageData = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const systemPrompt = `Tu es un expert en vérification de documents d'identité. Tu dois analyser l'image d'un document d'identité et extraire les informations suivantes de manière précise.

RÈGLES STRICTES:
1. Extrais la date de naissance EXACTE visible sur le document (format: YYYY-MM-DD)
2. Extrais le nom complet visible sur le document
3. Vérifie si le document semble authentique (pas de manipulation évidente)
4. Calcule l'âge en fonction de la date de naissance extraite
5. Détermine si la personne a 18 ans ou plus

Si tu ne peux pas lire clairement les informations, indique-le dans le champ approprié.

IMPORTANT: Ne fais JAMAIS confiance aux informations déclarées par l'utilisateur. Base-toi UNIQUEMENT sur ce qui est visible sur le document.`;

    const userPrompt = `Analyse ce document d'identité (${documentType || 'carte d\'identité'}).

${declaredBirthdate ? `Date de naissance déclarée par l'utilisateur: ${declaredBirthdate}` : ''}

Retourne les informations extraites au format JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageData } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "verify_id_document",
              description: "Extraire et vérifier les informations d'âge d'un document d'identité",
              parameters: {
                type: "object",
                properties: {
                  extracted_birthdate: {
                    type: "string",
                    description: "Date de naissance extraite du document au format YYYY-MM-DD, ou null si illisible"
                  },
                  extracted_name: {
                    type: "string",
                    description: "Nom complet extrait du document, ou null si illisible"
                  },
                  calculated_age: {
                    type: "number",
                    description: "Âge calculé à partir de la date de naissance extraite"
                  },
                  is_adult: {
                    type: "boolean",
                    description: "true si la personne a 18 ans ou plus, false sinon"
                  },
                  birthdate_matches_declared: {
                    type: "boolean",
                    description: "true si la date extraite correspond à la date déclarée par l'utilisateur"
                  },
                  document_appears_authentic: {
                    type: "boolean",
                    description: "true si le document semble authentique, false si manipulation suspectée"
                  },
                  confidence_level: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Niveau de confiance dans l'extraction des données"
                  },
                  issues: {
                    type: "array",
                    items: { type: "string" },
                    description: "Liste des problèmes détectés"
                  },
                  recommendation: {
                    type: "string",
                    enum: ["approve", "manual_review", "reject"],
                    description: "Recommandation"
                  },
                  rejection_reason: {
                    type: "string",
                    description: "Raison du rejet si recommendation est 'reject'"
                  }
                },
                required: ["is_adult", "confidence_level", "recommendation", "document_appears_authentic"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "verify_id_document" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Service temporairement surchargé. Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits de vérification épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("AI gateway error:", status, await response.text());
      return new Response(
        JSON.stringify({ 
          recommendation: "manual_review",
          reason: "Erreur du service de vérification automatique"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error("No tool call response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ 
          recommendation: "manual_review",
          reason: "Impossible d'analyser le document automatiquement",
          confidence_level: "low"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let verificationResult;
    try {
      verificationResult = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse tool arguments:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ 
          recommendation: "manual_review",
          reason: "Erreur d'analyse du document",
          confidence_level: "low"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = {
      ...verificationResult,
      userId,
      documentType,
      declaredBirthdate,
      verifiedAt: new Date().toISOString(),
      status: determineStatus(verificationResult, declaredBirthdate)
    };

    console.log("Age verification result:", JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Age verification error:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ 
        recommendation: "manual_review",
        reason: error instanceof Error ? error.message : "Erreur inattendue",
        confidence_level: "low"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function determineStatus(result: any, declaredBirthdate?: string): string {
  if (result.document_appears_authentic === false) {
    return "rejected";
  }
  
  if (result.is_adult === false && result.confidence_level === "high") {
    return "rejected";
  }
  
  if (result.birthdate_matches_declared === false && 
      result.confidence_level === "high" && 
      declaredBirthdate) {
    return "rejected";
  }
  
  if (result.is_adult === true && 
      result.confidence_level === "high" && 
      result.document_appears_authentic === true &&
      (result.birthdate_matches_declared !== false || !declaredBirthdate)) {
    return "approved";
  }
  
  return "pending";
}
