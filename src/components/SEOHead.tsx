import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  noindex?: boolean;
}

const SEOHead = ({
  title = "Crub – Plateforme Créateurs Moderne | Le Hub Premium du Contenu",
  description = "Crub est la plateforme créative moderne dédiée aux créateurs. Partage, contenu exclusif, communauté premium et espace sécurisé. Rejoignez le Hub Crub.",
  keywords = "Crub, plateforme Crub, Crub créateurs, Crub réseau social, Crub hub créatif, Crub contenu exclusif, Crub plateforme premium",
  image = "https://crub.com/og-image.jpg",
  url = "https://crub.com",
  type = "website",
  author,
  noindex = false,
}: SEOHeadProps) => {
  const fullTitle = title.includes("Crub") ? title : `${title} | Crub`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tag
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

    // Primary Meta Tags
    setMeta('description', description);
    setMeta('keywords', keywords);
    if (author) setMeta('author', author);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    setMeta('og:type', type, true);
    setMeta('og:url', url, true);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:image', image, true);
    setMeta('og:locale', 'fr_FR', true);
    setMeta('og:site_name', 'Crub', true);

    // Twitter
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:url', url);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [fullTitle, description, keywords, image, url, type, author, noindex]);

  return null;
};

export default SEOHead;