import { useEffect } from 'react';

interface CreatorData {
  name: string;
  username: string;
  category?: string;
  bio?: string;
  subscriberCount?: number;
  contentCount?: number;
  isVerified?: boolean;
  subscriptionPrice?: number;
  currency?: string;
  avatarUrl?: string;
}

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  noindex?: boolean;
  creator?: CreatorData;
  publishedTime?: string;
  modifiedTime?: string;
  lang?: string;
}

// Langues supportées avec leurs codes hreflang
const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
const DEFAULT_LANGUAGE = 'fr';

const SEOHead = ({
  title = "TheForge – Alternative MYM & OnlyFans | Plateforme Créateurs Contenu Exclusif",
  description = "TheForge, la meilleure alternative à MYM et OnlyFans en France. Plateforme créateurs premium : contenu exclusif, abonnements, lives privés, messagerie sécurisée. Monétisez vos créations sans commission abusive.",
  keywords = "The Forge, TheForge, the forge plateforme, alternative MYM, alternative OnlyFans, alternative Fansly, plateforme créateurs France, contenu exclusif créateurs, abonnement créateur, monétisation contenu, plateforme fans, réseau social créateurs, gagner argent contenu, plateforme abonnement premium, live privé créateurs, messagerie privée fans, mym alternative gratuite, onlyfans français, plateforme comme mym, site comme onlyfans, fansite français, contenu premium abonnement, devenir créateur contenu, revenus créateur en ligne, plateforme tips pourboires, live streaming créateurs",
  image = "https://theforge.fans/og-image.jpg",
  url,
  type = "website",
  author,
  noindex = false,
  creator,
  publishedTime,
  modifiedTime,
  lang = DEFAULT_LANGUAGE,
}: SEOHeadProps) => {
  const baseUrl = "https://theforge.fans";
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : baseUrl);
  
  // Nettoyer l'URL (retirer les paramètres de query pour le canonical)
  const cleanUrl = currentUrl.split('?')[0];
  
  const fullTitle = title.includes("TheForge") ? title : `${title} | TheForge`;
  const absoluteImage = image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    const setLink = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang 
        ? `link[rel="${rel}"][hreflang="${hreflang}"]` 
        : `link[rel="${rel}"]:not([hreflang])`;
      let link = document.querySelector(selector) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        if (hreflang) link.hreflang = hreflang;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Basic meta tags
    setMeta('description', description);
    setMeta('keywords', keywords);
    if (author) setMeta('author', author);
    
    // Robots - JAMAIS noindex pour les pages créateurs (profil à la racine ou /creator/)
    const isCreatorPage = type === 'profile' || cleanUrl.includes('/creator/');
    const robotsContent = isCreatorPage ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 
      (noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('robots', robotsContent);
    setMeta('googlebot', robotsContent);
    setMeta('bingbot', robotsContent);
    
    // Additional SEO meta tags
    setMeta('theme-color', '#000000');
    setMeta('format-detection', 'telephone=no');
    setMeta('mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-capable', 'yes');

    // Open Graph tags
    setMeta('og:type', type === 'profile' ? 'profile' : type, true);
    setMeta('og:url', cleanUrl, true);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:image', absoluteImage, true);
    setMeta('og:image:width', '1200', true);
    setMeta('og:image:height', '630', true);
    setMeta('og:image:alt', title, true);
    setMeta('og:locale', `${lang}_${lang === 'en' ? 'US' : lang.toUpperCase()}`, true);
    setMeta('og:site_name', 'TheForge', true);

    // Profile-specific OG tags
    if (type === 'profile' && creator) {
      // Utiliser le stage_name (creator.name) pour l'affichage public, pas le username technique
      setMeta('og:profile:username', creator.name || creator.username, true);
      if (creator.name) {
        const nameParts = creator.name.split(' ');
        if (nameParts.length > 0) {
          setMeta('og:profile:first_name', nameParts[0], true);
        }
        if (nameParts.length > 1) {
          setMeta('og:profile:last_name', nameParts.slice(1).join(' '), true);
        }
      }
    }

    // Article timestamps
    if (publishedTime) {
      setMeta('article:published_time', publishedTime, true);
    }
    if (modifiedTime) {
      setMeta('article:modified_time', modifiedTime, true);
    }

    // Twitter Card tags - utiliser le stage_name pour l'affichage
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:site', '@TheForge');
    setMeta('twitter:creator', creator ? (creator.name || `@${creator.username}`) : '@TheForge');
    setMeta('twitter:url', cleanUrl);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', absoluteImage);
    setMeta('twitter:image:alt', title);

    // Canonical URL (toujours présent)
    setLink('canonical', cleanUrl);

    // Hreflang tags pour i18n - les deux langues + x-default
    const frUrl = cleanUrl.replace(/\?.*$/, '');
    const enUrl = frUrl; // Même URL pour les deux langues (SPA)
    setLink('alternate', frUrl, 'fr');
    setLink('alternate', enUrl, 'en');
    setLink('alternate', frUrl, 'x-default');

    // JSON-LD Structured Data
    const existingJsonLd = document.querySelector('script[data-seo="json-ld"]');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const jsonLdScript = document.createElement('script');
    jsonLdScript.type = 'application/ld+json';
    jsonLdScript.setAttribute('data-seo', 'json-ld');

    let jsonLdData: Record<string, unknown>;

    if (type === 'profile' && creator) {
      // JSON-LD for Creator Profile Page - Schema amélioré
      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "dateCreated": publishedTime || new Date().toISOString(),
        "dateModified": modifiedTime || new Date().toISOString(),
        "mainEntity": {
          "@type": "Person",
          "@id": `${baseUrl}/creator/${creator.username}#person`,
          "name": creator.name,
          "alternateName": creator.username,
          "url": cleanUrl,
          "image": creator.avatarUrl ? {
            "@type": "ImageObject",
            "url": creator.avatarUrl,
            "width": 400,
            "height": 400
          } : {
            "@type": "ImageObject",
            "url": absoluteImage,
            "width": 400,
            "height": 400
          },
          "description": creator.bio || description,
          "sameAs": [cleanUrl],
          ...(creator.isVerified && { "verified": true }),
          "interactionStatistic": [
            {
              "@type": "InteractionCounter",
              "interactionType": "https://schema.org/FollowAction",
              "userInteractionCount": creator.subscriberCount || 0
            },
            {
              "@type": "InteractionCounter",
              "interactionType": "https://schema.org/CreateAction",
              "userInteractionCount": creator.contentCount || 0
            }
          ],
          ...(creator.category && { "knowsAbout": creator.category })
        },
        "potentialAction": {
          "@type": "SubscribeAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": cleanUrl
          },
          ...(creator.subscriptionPrice !== undefined && creator.subscriptionPrice > 0 && {
            "priceSpecification": {
              "@type": "PriceSpecification",
              "price": creator.subscriptionPrice,
              "priceCurrency": creator.currency || "EUR",
              "unitCode": "MON"
            }
          })
        },
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Accueil",
              "item": baseUrl
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Créateurs",
              "item": `${baseUrl}/search`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": creator.name || creator.username,
              "item": cleanUrl
            }
          ]
        }
      };
    } else if (type === 'article') {
      // JSON-LD for Article/Content
      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": absoluteImage,
        "url": cleanUrl,
        "datePublished": publishedTime || new Date().toISOString(),
        "dateModified": modifiedTime || new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": author || "TheForge"
        },
        "publisher": {
          "@type": "Organization",
          "name": "TheForge",
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/favicon.png`
          }
        },
        "inLanguage": lang
      };
    } else {
      // JSON-LD for Website (default)
      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "TheForge",
        "alternateName": ["The Forge", "The Forge - Plateforme Créateurs Premium", "TheForge - Plateforme Créateurs Premium", "Alternative MYM France", "Alternative OnlyFans Français"],
        "url": baseUrl,
        "description": "Alternative française à MYM et OnlyFans. Plateforme premium pour créateurs : contenu exclusif, abonnements, lives privés, monétisation.",
        "inLanguage": lang,
        "publisher": {
          "@type": "Organization",
          "name": "TheForge",
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/favicon.png`
          },
          "sameAs": [
            "https://twitter.com/TheForge",
            "https://instagram.com/theforge.fans"
          ]
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${baseUrl}/search?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      };
    }

    jsonLdScript.textContent = JSON.stringify(jsonLdData);
    document.head.appendChild(jsonLdScript);

    // Cleanup function
    return () => {
      const scriptToRemove = document.querySelector('script[data-seo="json-ld"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [fullTitle, description, keywords, absoluteImage, cleanUrl, type, author, noindex, creator, publishedTime, modifiedTime, lang]);

  return null;
};

export default SEOHead;
