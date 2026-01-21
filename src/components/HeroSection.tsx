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
      className="relative flex flex-col items-center justify-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background decorations - hidden from accessibility tree */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" aria-hidden="true" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" aria-hidden="true" />

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 
            id="hero-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-foreground leading-tight"
          >
            Partagez ce qui vous rend{" "}
            <span className="text-primary">unique</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Créez votre espace, connectez avec votre communauté, 
            et monétisez votre contenu en toute sécurité.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={handleCTA}
              className="group text-base px-8 py-6 rounded-xl font-medium"
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
                className="text-base px-8 py-6 rounded-xl font-medium"
                aria-label="Découvrir les créateurs de la plateforme"
              >
                Découvrir les créateurs
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Premium portrait image */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 pb-8">
        <div className="relative overflow-hidden rounded-2xl shadow-2xl">
          {/* Image avec luminosité augmentée */}
          <img 
            src={splashPortrait} 
            alt="Créateurs Crub" 
            className="w-full h-auto object-cover"
            style={{ 
              filter: 'brightness(1.3) contrast(1.08) saturate(1.1)',
            }}
          />
          
          {/* Vignette très subtile */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 60%, black/25 100%)',
            }}
          />
          
          {/* Top gradient très léger */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/15 to-transparent pointer-events-none" />
          
          {/* Bottom gradient léger */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
