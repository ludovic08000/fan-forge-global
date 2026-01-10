import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SearchBar from "@/components/SearchBar";
import PopularCreators from "@/components/PopularCreators";
import LiveNowSection from "@/components/LiveNowSection";
import Footer from "@/components/Footer";
import AgeVerificationGate from "@/components/AgeVerificationGate";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  return (
    <AgeVerificationGate>
      <SEOHead 
        title="Crub - Partagez votre contenu"
        description="Créez votre espace sur Crub pour partager du contenu exclusif."
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          <HeroSection />
          
          <section className="py-8 bg-muted/20">
            <div className="container mx-auto px-4 flex justify-center">
              <SearchBar />
            </div>
          </section>

          <PopularCreators />
          <LiveNowSection />
        </main>

        <Footer />
      </div>
    </AgeVerificationGate>
  );
};

export default Index;
