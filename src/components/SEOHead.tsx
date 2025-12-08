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
}

const SEOHead = ({
  title = "Crub – Plateforme Créateurs Premium | Contenus Exclusifs et Communauté Privée",
  description = "Découvrez Crub, la plateforme moderne dédiée aux créateurs et à leurs communautés. Partage privé, contenus exclusifs, espace sécurisé et expérience premium.",
  keywords = "Crub, plateforme Crub, réseau Crub, Crub créateurs, plateforme créateurs premium, contenu exclusif en ligne, communauté créative privée, plateforme créateurs sécurisée, hub digital pour créateurs",
  image = "https://crub.fr/og-image.jpg",
  url,
  type = "website",
  author,
  noindex = false,
  creator,
  publishedTime,
  modifiedTime,
}: SEOHeadProps) => {
  const baseUrl = "https://crub.fr";
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : baseUrl);
  const fullTitle = title.includes("Crub") ? title : `${title} | Crub`;
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

    // Basic meta tags
    setMeta('description', description);
    setMeta('keywords', keywords);
    if (author) setMeta('author', author);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph tags
    setMeta('og:type', type === 'profile' ? 'profile' : type, true);
    setMeta('og:url', currentUrl, true);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:image', absoluteImage, true);
    setMeta('og:image:width', '1200', true);
    setMeta('og:image:height', '630', true);
    setMeta('og:image:alt', title, true);
    setMeta('og:locale', 'fr_FR', true);
    setMeta('og:site_name', 'Crub', true);

    // Profile-specific OG tags
    if (type === 'profile' && creator) {
      setMeta('og:profile:username', creator.username, true);
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

    // Twitter Card tags
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:site', '@CrubFr');
    setMeta('twitter:creator', creator ? `@${creator.username}` : '@CrubFr');
    setMeta('twitter:url', currentUrl);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', absoluteImage);
    setMeta('twitter:image:alt', title);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = currentUrl;

    // JSON-LD Structured Data
    const existingJsonLd = document.querySelector('script[data-seo="json-ld"]');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const jsonLdScript = document.createElement('script');
    jsonLdScript.type = 'application/ld+json';
    jsonLdScript.setAttribute('data-seo', 'json-ld');

    let jsonLdData: any;

    if (type === 'profile' && creator) {
      // JSON-LD for Creator Profile Page
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
          "url": currentUrl,
          "image": {
            "@type": "ImageObject",
            "url": absoluteImage,
            "width": 400,
            "height": 400
          },
          "description": creator.bio || description,
          "sameAs": [currentUrl],
          ...(creator.isVerified && { "verified": true }),
          "interactionStatistic": [
            {
              "@type": "InteractionCounter",
              "interactionType": "https://schema.org/FollowAction",
              "userInteractionCount": creator.subscriberCount || 0
            }
          ]
        },
        "potentialAction": {
          "@type": "SubscribeAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": currentUrl
          },
          ...(creator.subscriptionPrice !== undefined && creator.subscriptionPrice > 0 && {
            "priceSpecification": {
              "@type": "PriceSpecification",
              "price": creator.subscriptionPrice,
              "priceCurrency": creator.currency || "EUR",
              "unitCode": "MON"
            }
          })
        }
      };

      // Add Category as expertise
      if (creator.category) {
        jsonLdData.mainEntity.knowsAbout = creator.category;
      }
    } else if (type === 'article') {
      // JSON-LD for Article/Content
      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": absoluteImage,
        "url": currentUrl,
        "datePublished": publishedTime || new Date().toISOString(),
        "dateModified": modifiedTime || new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": author || "Crub"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Crub",
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/favicon.png`
          }
        }
      };
    } else {
      // JSON-LD for Website (default)
      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Crub",
        "alternateName": "Crub - Plateforme Créateurs Premium",
        "url": baseUrl,
        "description": "La Plateforme Premium des Créateurs Modernes. Partage privé, contenus exclusifs, espace sécurisé.",
        "publisher": {
          "@type": "Organization",
          "name": "Crub",
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/favicon.png`
          },
          "sameAs": [
            "https://twitter.com/CrubFr"
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
  }, [fullTitle, description, keywords, absoluteImage, currentUrl, type, author, noindex, creator, publishedTime, modifiedTime]);

  return null;
};

export default SEOHead;
