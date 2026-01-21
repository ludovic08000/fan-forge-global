import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Supprimer les messages de plus de 30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // D'abord, supprimer les paiements liés aux messages à supprimer
    const { data: oldMessages, error: fetchError } = await supabase
      .from("private_messages")
      .select("id")
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (fetchError) {
      console.error("Error fetching old messages:", fetchError);
      throw fetchError;
    }

    const messageIds = oldMessages?.map(m => m.id) || [];
    let paymentsDeleted = 0;
    let messagesDeleted = 0;

    if (messageIds.length > 0) {
      // Supprimer les paiements associés
      const { count: paymentCount, error: paymentError } = await supabase
        .from("private_content_payments")
        .delete()
        .in("message_id", messageIds);

      if (paymentError) {
        console.error("Error deleting payments:", paymentError);
      } else {
        paymentsDeleted = paymentCount || 0;
      }

      // Supprimer les messages
      const { count: messageCount, error: deleteError } = await supabase
        .from("private_messages")
        .delete()
        .lt("created_at", thirtyDaysAgo.toISOString());

      if (deleteError) {
        console.error("Error deleting messages:", deleteError);
        throw deleteError;
      }

      messagesDeleted = messageCount || 0;
    }

    console.log(`Cleanup completed: ${messagesDeleted} messages and ${paymentsDeleted} payments deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        messagesDeleted,
        paymentsDeleted,
        cutoffDate: thirtyDaysAgo.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
