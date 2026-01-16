import HeroSection from "@/components/HeroSection";
import SearchBar from "@/components/SearchBar";
import PopularCreators from "@/components/PopularCreators";
import LiveNowSection from "@/components/LiveNowSection";
import AgeVerificationGate from "@/components/AgeVerificationGate";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import splashPortrait from "@/assets/splash-portrait.jpg";

const Index = () => {
  const { user } = useAuth();

  return (
    <AgeVerificationGate>
      <SEOHead 
        title="Crub - Partagez votre contenu"
        description="Créez votre espace sur Crub pour partager du contenu exclusif."
      />
      <div className="min-h-screen flex flex-col bg-background relative">
        {/* Background image with premium overlay */}
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${splashPortrait})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Dark gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
          {/* Vignette effect */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 20%, hsl(var(--background)) 80%)',
            }}
          />
        </div>

        <main className="flex-1 relative z-10">
          <HeroSection />
          
          {/* Recherche et créateurs visibles uniquement pour les utilisateurs connectés */}
          {user && (
            <>
              <section className="py-8 bg-muted/20 backdrop-blur-sm">
                <div className="container mx-auto px-4 flex justify-center">
                  <SearchBar />
                </div>
              </section>

              <PopularCreators />
            </>
          )}
          
          <LiveNowSection />
        </main>
      </div>
    </AgeVerificationGate>
  );
};

export default Index;
