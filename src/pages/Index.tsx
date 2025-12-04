import HeroSection from "@/components/HeroSection";
import CreatorSection from "@/components/CreatorSection";
import SubscriberSection from "@/components/SubscriberSection";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "CreatorHub - Accueil",
    "description": "Plateforme française premium pour créateurs de contenu. Live streaming, abonnements, messagerie privée.",
    "url": "https://creatorhub.com",
    "mainEntity": {
      "@type": "Organization",
      "name": "CreatorHub",
      "description": "La plateforme n°1 pour créateurs de contenu en France"
    }
  };

  return (
    <div className="min-h-screen">
      <SEOHead 
        title="CreatorHub - Plateforme Premium pour Créateurs de Contenu | France"
        description="Découvrez CreatorHub, la plateforme française n°1 pour créateurs de contenu. Live streaming HD, abonnements flexibles, messagerie privée. Monétisez votre passion et connectez avec votre communauté. 100% RGPD."
        keywords="créateurs de contenu, plateforme créateurs France, live streaming, abonnements, monétisation contenu, fans, communauté, streaming français"
        url="https://creatorhub.com"
        structuredData={structuredData}
      />
      <HeroSection />
      <CreatorSection />
      <SubscriberSection />
    </div>
  );
};

export default Index;
