import { Button } from "@/components/ui/button";
import { Play, Shield, Zap } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const { t } = useTranslation();
  
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-glow/10"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary-glow/20 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 mb-8 bg-card/60 backdrop-blur-md border border-primary/20 rounded-full">
            <Zap className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium">Plateforme Créateurs</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            <span className="block text-foreground mb-2">{t('hero.title')}</span>
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {t('hero.subtitle')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero.description')}
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <div className="flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm border border-primary/20 rounded-full">
              <Shield className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Sécurisé</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm border border-primary/20 rounded-full">
              <Zap className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Paiements rapides</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth?tab=signup">{t('hero.joinAsCreator')}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/search">
                <Play className="h-4 w-4 mr-2" />
                {t('hero.exploreContent')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
