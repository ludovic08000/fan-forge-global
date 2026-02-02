import HeroSection from "@/components/HeroSection";
import SearchBar from "@/components/SearchBar";
import PopularCreators from "@/components/PopularCreators";
import LiveNowSection from "@/components/LiveNowSection";
import ContentGallery from "@/components/ContentGallery";
import AgeVerificationGate from "@/components/AgeVerificationGate";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <AgeVerificationGate>
      <SEOHead 
        title="Crub - Partagez votre contenu"
        description="Créez votre espace sur Crub pour partager du contenu exclusif."
      />
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          <HeroSection />
          
          {/* Recherche et créateurs visibles uniquement pour les utilisateurs connectés */}
          {user && (
            <>
              <section className="py-8 bg-muted/20 relative z-50">
                <div className="container mx-auto px-4 flex justify-center">
                  <SearchBar />
                </div>
              </section>

              <PopularCreators />
              
              {/* Section Médias */}
              <section className="py-12 bg-background">
                <div className="container mx-auto px-4">
                  <h2 className="text-2xl font-bold mb-6">Découvrir les médias</h2>
                  <ContentGallery />
                </div>
              </section>
            </>
          )}
          
          <LiveNowSection />
        </main>
      </div>
    </AgeVerificationGate>
  );
};

export default Index;
