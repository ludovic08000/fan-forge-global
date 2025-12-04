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
  title = "Crub – Plateforme Créateurs Premium | Contenus Exclusifs et Communauté Privée",
  description = "Découvrez Crub, la plateforme moderne dédiée aux créateurs et à leurs communautés. Partage privé, contenus exclusifs, espace sécurisé et expérience premium.",
  keywords = "Crub, plateforme Crub, réseau Crub, Crub créateurs, plateforme créateurs premium, contenu exclusif en ligne, communauté créative privée, plateforme créateurs sécurisée, hub digital pour créateurs",
  image = "https://crub.com/og-image.jpg",
  url = "https://crub.com",
  type = "website",
  author,
  noindex = false,
}: SEOHeadProps) => {
  const fullTitle = title.includes("Crub") ? title : `${title} | Crub`;

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

    setMeta('description', description);
    setMeta('keywords', keywords);
    if (author) setMeta('author', author);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    setMeta('og:type', type, true);
    setMeta('og:url', url, true);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:image', image, true);
    setMeta('og:locale', 'fr_FR', true);
    setMeta('og:site_name', 'Crub', true);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:url', url);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

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