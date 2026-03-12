import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Sitemap-specific headers (extend CORS)
const getSitemapHeaders = (req: Request) => ({
  ...getCorsHeaders(req),
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "X-Robots-Tag": "noindex", // Le sitemap lui-même ne doit pas être indexé
});

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SITEMAP] ${step}${detailsStr}`);
};

// URLs supportées pour i18n futur
const SUPPORTED_LANGUAGES = ['fr', 'en'];
const DEFAULT_LANGUAGE = 'fr';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  
  const sitemapHeaders = getSitemapHeaders(req);

  try {
    logStep("Generating sitemap");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const baseUrl = "https://crub.fr";
    const today = new Date().toISOString().split('T')[0];

    // Fetch all active creators (non-paused) who haven't opted out of search engines
    const { data: creators, error } = await supabase
      .from('creators')
      .select(`
        id,
        updated_at,
        user_id,
        category,
        total_content,
        total_subscribers,
        is_paused,
        hide_from_search_engines
      `)
      .or('is_paused.is.null,is_paused.eq.false')
      .or('hide_from_search_engines.is.null,hide_from_search_engines.eq.false')
      .order('total_subscribers', { ascending: false });

    if (error) {
      logStep("Error fetching creators", { error: error.message });
      throw error;
    }

    // Filter out creators who have opted out of search engines
    const visibleCreators = creators?.filter(c => !c.hide_from_search_engines) || [];

    logStep("Fetched creators", { 
      total: creators?.length || 0, 
      visible: visibleCreators.length 
    });

    // Fetch profiles for usernames
    const userIds = visibleCreators.map(c => c.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, updated_at')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Build sitemap XML with schema for images and hreflang
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  
  <!-- ==================== PAGES STATIQUES ==================== -->
  
  <!-- Homepage - priorité maximale -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="${baseUrl}/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/" />
  </url>
  
  <!-- Search - haute priorité, contenu dynamique -->
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Lives - très dynamique -->
  <url>
    <loc>${baseUrl}/lives</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Auth pages -->
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
  
  <!-- Installation PWA -->
  <url>
    <loc>${baseUrl}/install</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <!-- Pages légales -->
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
  </url>
  
  <!-- ==================== PAGES CRÉATEURS ==================== -->`;

    // Fetch recent public content for content detail pages
    const { data: recentContent } = await supabase
      .from('content')
      .select('id, title, created_at, updated_at, creator_id, content_type, thumbnail_url')
      .eq('status', 'published')
      .eq('is_premium', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (recentContent && recentContent.length > 0) {
      xml += `
  
  <!-- ==================== CONTENUS PUBLICS ==================== -->`;

      recentContent.forEach(content => {
        const lastmod = (content.updated_at || content.created_at)?.split('T')[0] || today;
        xml += `
  <url>
    <loc>${baseUrl}/content/${content.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>`;
        if (content.thumbnail_url) {
          xml += `
    <image:image>
      <image:loc>${content.thumbnail_url}</image:loc>
      <image:title>${content.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</image:title>
    </image:image>`;
        }
        xml += `
  </url>`;
      });
    }

    logStep("Added content pages", { count: recentContent?.length || 0 });

    // Add creator profile pages - only those who haven't opted out
    visibleCreators.forEach(creator => {
      const profile = profileMap.get(creator.user_id);
      const username = profile?.username;
      
      if (username) {
        const lastmod = creator.updated_at?.split('T')[0] || profile?.updated_at?.split('T')[0] || today;
        
        // Priority based on subscribers and content count
        const subscriberScore = Math.min((creator.total_subscribers || 0) / 100, 0.2);
        const contentScore = Math.min((creator.total_content || 0) / 50, 0.1);
        const priority = Math.min(0.9, 0.6 + subscriberScore + contentScore).toFixed(1);
        
        // Changefreq based on content activity
        const changefreq = (creator.total_content || 0) > 10 ? 'daily' : 'weekly';
        
        xml += `
  
  <!-- Créateur: ${username} (${creator.total_subscribers || 0} abonnés, ${creator.total_content || 0} contenus) -->
  <url>
    <loc>${baseUrl}/creator/${encodeURIComponent(username)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>`;
        
        // Add creator avatar as image if available
        if (profile?.avatar_url) {
          xml += `
    <image:image>
      <image:loc>${profile.avatar_url}</image:loc>
      <image:title>${profile.display_name || username} - Créateur sur TheForge</image:title>
    </image:image>`;
        }
        
        xml += `
  </url>`;
      }
    });

    xml += `
</urlset>`;

    const contentPages = recentContent?.length || 0;
    const stats = {
      staticPages: 10,
      creatorPages: visibleCreators.length,
      contentPages,
      hiddenCreators: (creators?.length || 0) - visibleCreators.length,
      totalUrls: 10 + visibleCreators.length + contentPages,
      generatedAt: new Date().toISOString()
    };

    logStep("Sitemap generated successfully", stats);

    return new Response(xml, {
      headers: sitemapHeaders,
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
      headers: { ...getSitemapHeaders(req), "Cache-Control": "public, max-age=300" },
      status: 200,
    });
  }
});