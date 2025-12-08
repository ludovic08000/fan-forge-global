import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[DECODE-WATERMARK] ${step}`, details ? JSON.stringify(details) : '');
};

/**
 * Génère un hash court à partir d'une chaîne (même algorithme que côté client)
 */
const generateShortHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
};

/**
 * Génère le pattern forensique pour un utilisateur et un timestamp donnés
 */
const generateForensicPattern = (userId: string, timestamp: number): string => {
  const hash = generateShortHash(userId + timestamp.toString());
  return `${hash}-${new Date(timestamp * 1000 * 60 * 60).toISOString().slice(0, 10)}`;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting watermark decode');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client avec service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      logStep('Access denied - not admin', { userId: user.id });
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Admin verified', { adminId: user.id });

    const { watermarkPattern, shortId, searchRange } = await req.json();

    if (!watermarkPattern && !shortId) {
      return new Response(
        JSON.stringify({ error: 'watermarkPattern or shortId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Decoding watermark', { watermarkPattern, shortId, searchRange });

    const results: any[] = [];

    // Si on a un shortId (les 8 premiers caractères de l'UUID)
    if (shortId) {
      // Rechercher les utilisateurs dont l'ID commence par ce pattern
      const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (usersError) {
        throw usersError;
      }

      const matchingUsers = users.users.filter(u => 
        u.id.toLowerCase().startsWith(shortId.toLowerCase())
      );

      for (const matchedUser of matchingUsers) {
        // Récupérer le profil
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('user_id', matchedUser.id)
          .single();

        // Récupérer l'historique des abonnements
        const { data: subscriptions } = await supabaseAdmin
          .from('subscriptions')
          .select(`
            id,
            creator_id,
            status,
            created_at,
            creators (
              stage_name,
              user_id
            )
          `)
          .eq('subscriber_id', matchedUser.id)
          .order('created_at', { ascending: false })
          .limit(10);

        results.push({
          userId: matchedUser.id,
          email: matchedUser.email,
          username: profile?.username,
          displayName: profile?.display_name,
          avatarUrl: profile?.avatar_url,
          createdAt: matchedUser.created_at,
          lastSignIn: matchedUser.last_sign_in_at,
          subscriptions: subscriptions || [],
          matchType: 'shortId',
          confidence: 'high'
        });
      }
    }

    // Si on a un pattern complet (HASH-DATE), on peut tenter de le vérifier
    if (watermarkPattern) {
      const patternMatch = watermarkPattern.match(/^([A-Z0-9]{1,8})-(\d{4}-\d{2}-\d{2})$/);
      
      if (patternMatch) {
        const [, hash, dateStr] = patternMatch;
        const targetDate = new Date(dateStr);
        
        logStep('Pattern parsed', { hash, dateStr });

        // Récupérer tous les utilisateurs et tester le hash
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        
        if (allUsers?.users) {
          // Calculer la plage horaire à tester (par défaut: ±12 heures autour de la date)
          const hoursRange = searchRange || 24;
          const baseTimestamp = Math.floor(targetDate.getTime() / (1000 * 60 * 60));
          
          for (const testUser of allUsers.users) {
            // Tester chaque heure dans la plage
            for (let offset = -hoursRange; offset <= hoursRange; offset++) {
              const testTimestamp = baseTimestamp + offset;
              const testPattern = generateForensicPattern(testUser.id, testTimestamp);
              
              if (testPattern === watermarkPattern) {
                logStep('Match found!', { userId: testUser.id, timestamp: testTimestamp });

                // Récupérer les détails
                const { data: profile } = await supabaseAdmin
                  .from('profiles')
                  .select('username, display_name, avatar_url')
                  .eq('user_id', testUser.id)
                  .single();

                const { data: subscriptions } = await supabaseAdmin
                  .from('subscriptions')
                  .select(`
                    id,
                    creator_id,
                    status,
                    created_at,
                    creators (
                      stage_name,
                      user_id
                    )
                  `)
                  .eq('subscriber_id', testUser.id)
                  .order('created_at', { ascending: false })
                  .limit(10);

                // Calculer l'heure approximative de la fuite
                const leakTime = new Date(testTimestamp * 1000 * 60 * 60);

                results.push({
                  userId: testUser.id,
                  email: testUser.email,
                  username: profile?.username,
                  displayName: profile?.display_name,
                  avatarUrl: profile?.avatar_url,
                  createdAt: testUser.created_at,
                  lastSignIn: testUser.last_sign_in_at,
                  subscriptions: subscriptions || [],
                  matchType: 'fullPattern',
                  confidence: 'very_high',
                  approximateLeakTime: leakTime.toISOString(),
                  decodedTimestamp: testTimestamp
                });
                
                // Arrêter la recherche pour cet utilisateur
                break;
              }
            }
          }
        }
      } else {
        logStep('Invalid pattern format', { watermarkPattern });
      }
    }

    // Log de l'investigation pour audit
    logStep('Investigation complete', { 
      adminId: user.id, 
      resultsCount: results.length,
      searchCriteria: { watermarkPattern, shortId }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        searchCriteria: { watermarkPattern, shortId, searchRange },
        investigatedBy: user.id,
        investigatedAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logStep('Error', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
