import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client avec le token de l'utilisateur pour vérifier les permissions
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Client avec service role pour les opérations de storage
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    const { imageData, contentId } = await req.json();

    if (!imageData || !contentId) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'imageData and contentId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur est le propriétaire du contenu
    const { data: content, error: contentError } = await supabaseAdmin
      .from('content')
      .select('id, creator_id, file_url')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      console.error('Content not found:', contentError);
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur est le créateur via la table creators
    const { data: creator, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', content.creator_id)
      .single();

    if (creatorError || !creator) {
      console.error('User is not the content owner');
      return new Response(
        JSON.stringify({ error: 'Not authorized to edit this content' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User is content owner, proceeding with save');

    // Décoder l'image base64
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Générer un nouveau nom de fichier
    const timestamp = Date.now();
    const fileName = `edited_${timestamp}.png`;
    const filePath = `${user.id}/${fileName}`;

    console.log('Uploading to path:', filePath);

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('content')
      .upload(filePath, imageBytes, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Upload successful:', uploadData);

    // Stocker le filePath au lieu de l'URL publique (sécurité)
    const newFilePath = filePath;
    console.log('New file path:', newFilePath);

    // Mettre à jour le contenu avec le nouveau filePath
    const { error: updateError } = await supabaseAdmin
      .from('content')
      .update({ 
        file_url: newFilePath,
        thumbnail_url: newFilePath, // Mettre à jour aussi la miniature
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update content', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Content updated successfully');

    // Optionnel: supprimer l'ancienne image si elle existe
    try {
      const oldUrl = content.file_url;
      // Support both old URL format and new filePath format
      const oldPathMatch = oldUrl.match(/\/storage\/v1\/object\/public\/content\/(.+)/);
      const oldPath = oldPathMatch ? oldPathMatch[1] : oldUrl;
      if (oldPath && oldPath !== filePath) {
        console.log('Attempting to delete old file:', oldPath);
        await supabaseAdmin.storage.from('content').remove([oldPath]);
      }
    } catch (deleteError) {
      console.log('Could not delete old file (non-critical):', deleteError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newFilePath,
        message: 'Image saved successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
