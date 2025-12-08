import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600", // Cache 1 hour
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SITEMAP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Generating sitemap");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const baseUrl = "https://crub.fr";
    const today = new Date().toISOString().split('T')[0];

    // Fetch all creators with their profiles
    const { data: creators, error } = await supabase
      .from('creators')
      .select(`
        id,
        updated_at,
        user_id,
        category,
        total_content
      `)
      .order('total_content', { ascending: false });

    if (error) {
      logStep("Error fetching creators", { error: error.message });
      throw error;
    }

    logStep("Fetched creators", { count: creators?.length || 0 });

    // Fetch profiles for usernames
    const userIds = creators?.map(c => c.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, updated_at')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Build sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Pages statiques -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/lives</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/signup</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/legal</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/cookies</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>`;

    // Add creator profile pages
    creators?.forEach(creator => {
      const profile = profileMap.get(creator.user_id);
      const username = profile?.username;
      
      if (username) {
        const lastmod = creator.updated_at?.split('T')[0] || profile?.updated_at?.split('T')[0] || today;
        // Priority based on content count
        const priority = Math.min(0.8, 0.5 + (creator.total_content || 0) * 0.01).toFixed(1);
        
        xml += `
  
  <!-- Créateur: ${username} -->
  <url>
    <loc>${baseUrl}/creator/${encodeURIComponent(username)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
      }
    });

    xml += `
</urlset>`;

    logStep("Sitemap generated", { 
      staticPages: 9, 
      creatorPages: creators?.length || 0,
      totalUrls: 9 + (creators?.length || 0)
    });

    return new Response(xml, {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR generating sitemap", { message: errorMessage });
    
    // Return a basic sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://crub.fr/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`;
    
    return new Response(fallbackXml, {
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=300" },
      status: 200,
    });
  }
});
