import { Button } from "@/components/ui/button";
import { Play, Zap, Globe, Shield } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  const { t } = useTranslation();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary-glow/20 animate-float"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/30 rounded-full blur-3xl animate-glow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Background Image with Enhanced Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Premium content platform hero background"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 lg:px-8 py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge with Shimmer Effect */}
          <div className="inline-flex items-center px-6 py-3 mb-8 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md border border-primary/20 rounded-full shadow-lg hover:shadow-[var(--shadow-glow)] transition-all duration-300 animate-fade-in group">
            <Zap className="h-4 w-4 text-primary mr-2 group-hover:animate-pulse" />
            <span className="text-sm font-semibold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Next-Generation Creator Platform
            </span>
          </div>

          {/* Main Heading with Better Typography */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-8 leading-tight animate-fade-up tracking-tight">
            <span className="block text-foreground mb-2">{t('hero.title')}</span>
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
              {t('hero.subtitle')}
            </span>
          </h1>

          {/* Subtitle with Better Spacing */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in font-light" style={{ animationDelay: '0.2s' }}>
            {t('hero.description')}
          </p>

          {/* Feature Pills with Glassmorphism */}
          <div className="flex flex-wrap justify-center gap-4 mb-12 animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="group flex items-center px-6 py-3 bg-card/40 backdrop-blur-xl border border-primary/20 rounded-full hover:bg-card/60 hover:border-primary/40 transition-all duration-300 hover:scale-105 shadow-lg">
              <Globe className="h-5 w-5 text-primary mr-2 group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-medium">Global Reach</span>
            </div>
            <div className="group flex items-center px-6 py-3 bg-card/40 backdrop-blur-xl border border-primary/20 rounded-full hover:bg-card/60 hover:border-primary/40 transition-all duration-300 hover:scale-105 shadow-lg">
              <Shield className="h-5 w-5 text-primary mr-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Premium Security</span>
            </div>
            <div className="group flex items-center px-6 py-3 bg-card/40 backdrop-blur-xl border border-primary/20 rounded-full hover:bg-card/60 hover:border-primary/40 transition-all duration-300 hover:scale-105 shadow-lg">
              <Zap className="h-5 w-5 text-primary mr-2 group-hover:animate-pulse" />
              <span className="text-sm font-medium">Instant Payouts</span>
            </div>
          </div>

          {/* Enhanced CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <Link to="/auth">
              <Button variant="hero" size="xl" className="group relative overflow-hidden shadow-2xl shadow-primary/30 hover:shadow-primary/50">
                <span className="relative z-10">{t('hero.joinAsCreator')}</span>
                <div className="absolute inset-0 bg-shimmer-gradient animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Button>
            </Link>
            <Link to="/search">
              <Button variant="creator" size="xl" className="backdrop-blur-xl shadow-lg hover:shadow-xl border-2">
                <Play className="h-5 w-5 mr-2" />
                {t('hero.exploreContent')}
              </Button>
            </Link>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-12 border-t border-primary/20 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="group text-center p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-primary/10 hover:bg-card/50 hover:border-primary/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                1M+
              </div>
              <div className="text-muted-foreground font-medium">{t('hero.creators')}</div>
            </div>
            <div className="group text-center p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-primary/10 hover:bg-card/50 hover:border-primary/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                50M+
              </div>
              <div className="text-muted-foreground font-medium">{t('hero.subscribers')}</div>
            </div>
            <div className="group text-center p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-primary/10 hover:bg-card/50 hover:border-primary/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                $2B+
              </div>
              <div className="text-muted-foreground font-medium">{t('hero.earnings')}</div>
            </div>
            <div className="group text-center p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-primary/10 hover:bg-card/50 hover:border-primary/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                190+
              </div>
              <div className="text-muted-foreground font-medium">Pays</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary-glow/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-primary/15 rounded-full blur-2xl animate-glow"></div>
    </section>
  );
};

export default HeroSection;