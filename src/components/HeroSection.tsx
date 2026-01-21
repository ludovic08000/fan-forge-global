import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight } from "lucide-react";
import { memo } from "react";
import splashPortrait from "@/assets/splash-portrait.jpg";

const HeroSection = memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <section 
      className="relative flex flex-col items-center justify-center overflow-hidden min-h-[90vh]"
      aria-labelledby="hero-heading"
    >
      {/* Image de fond plein écran */}
      <div className="absolute inset-0 z-0">
        <img 
          src={splashPortrait} 
          alt="" 
          className="w-full h-full object-cover object-top"
          style={{ 
            filter: 'brightness(1.1) contrast(1.05) saturate(1.1)',
          }}
        />
        {/* Overlay gradient pour lisibilité du texte */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Decorations lumineuses */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl z-[1]" aria-hidden="true" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl z-[1]" aria-hidden="true" />

      <div className="relative z-10 container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 
            id="hero-heading"
            className="text-4xl md:text-5xl lg:text-7xl font-display font-bold tracking-tight text-white leading-tight drop-shadow-2xl"
          >
            Partagez ce qui vous rend{" "}
            <span className="text-primary">unique</span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 max-w-xl mx-auto leading-relaxed drop-shadow-lg">
            Créez votre espace, connectez avec votre communauté, 
            et monétisez votre contenu en toute sécurité.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              size="lg"
              onClick={handleCTA}
              className="group text-base px-8 py-6 rounded-xl font-medium shadow-xl"
              aria-label={user ? "Accéder à mon espace" : "Commencer gratuitement sur Crub"}
            >
              {user ? "Mon espace" : "Commencer gratuitement"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Button>
            
            {user && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/search')}
                className="text-base px-8 py-6 rounded-xl font-medium bg-white/10 border-white/30 text-white hover:bg-white/20"
                aria-label="Découvrir les créateurs de la plateforme"
              >
                Découvrir les créateurs
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom fade vers le contenu suivant */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
