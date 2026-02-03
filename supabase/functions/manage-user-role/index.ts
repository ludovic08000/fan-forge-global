/**
 * Edge Function sécurisée pour la gestion des rôles utilisateurs
 * Seuls les admins peuvent créer/modifier des rôles
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      console.log(`[manage-user-role] Unauthorized attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Accès refusé - Admin requis" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, targetUserId, role } = await req.json();

    if (!action || !targetUserId) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Empêcher un admin de se retirer son propre rôle
    if (action === "remove" && targetUserId === user.id && role === "admin") {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez pas retirer votre propre rôle admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      case "add":
        if (!role) {
          return new Response(
            JSON.stringify({ error: "Rôle requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: insertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: targetUserId, role });

        if (insertError) {
          if (insertError.code === "23505") {
            return new Response(
              JSON.stringify({ error: "Ce rôle existe déjà pour cet utilisateur" }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw insertError;
        }

        // Log audit
        await supabaseAdmin.rpc("log_admin_action", {
          p_action: "add_role",
          p_target_type: "user",
          p_target_id: targetUserId,
          p_details: { role, added_by: user.id }
        });

        result = { success: true, message: `Rôle ${role} ajouté` };
        break;

      case "remove":
        if (!role) {
          return new Response(
            JSON.stringify({ error: "Rôle requis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: deleteError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId)
          .eq("role", role);

        if (deleteError) throw deleteError;

        // Log audit
        await supabaseAdmin.rpc("log_admin_action", {
          p_action: "remove_role",
          p_target_type: "user",
          p_target_id: targetUserId,
          p_details: { role, removed_by: user.id }
        });

        result = { success: true, message: `Rôle ${role} retiré` };
        break;

      case "list":
        const { data: roles, error: listError } = await supabaseAdmin
          .from("user_roles")
          .select("role, created_at")
          .eq("user_id", targetUserId);

        if (listError) throw listError;

        result = { success: true, roles };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Action invalide" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[manage-user-role] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
