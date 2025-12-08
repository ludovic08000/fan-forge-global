import { Button } from "@/components/ui/button";
import { Play, Shield, Users, Lock, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const HeroSection = () => {
  const { user } = useAuth();

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
            <Sparkles className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium">Plateforme Créateurs Premium</span>
          </div>

          {/* H1 SEO */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            <span className="block text-foreground mb-2">Crub</span>
            <span className="block text-2xl md:text-3xl lg:text-4xl bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              La Plateforme Premium des Créateurs Modernes
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Crub est une plateforme digitale premium pensée pour les créateurs souhaitant partager du contenu exclusif avec une communauté engagée.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <div className="flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm border border-primary/20 rounded-full">
              <Shield className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Espace sécurisé</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm border border-primary/20 rounded-full">
              <Users className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Communauté privée</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm border border-primary/20 rounded-full">
              <Lock className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Contenus exclusifs</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button variant="hero" size="lg" asChild>
                <Link to="/dashboard">Mon espace</Link>
              </Button>
            ) : (
              <Button variant="hero" size="lg" asChild>
                <Link to="/signup">Rejoindre Crub</Link>
              </Button>
            )}
            <Button variant="outline" size="lg" asChild>
              <Link to="/search">
                <Play className="h-4 w-4 mr-2" />
                Découvrir les créateurs
              </Link>
            </Button>
          </div>
        </div>

        {/* SEO Content Sections */}
        <div className="max-w-4xl mx-auto mt-20 space-y-12 text-left">
          {/* H2 - Crub, la nouvelle référence */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Crub, la nouvelle référence des créateurs
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Avec une interface moderne et un système sécurisé, Crub offre une expérience fluide, professionnelle et adaptée aux besoins des créateurs.
            </p>
          </div>

          {/* H2 - Plateforme intuitive */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              Une plateforme intuitive pensée pour les créateurs
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Espace premium
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Crub propose un espace personnel organisé, élégant et adapté à la mise en valeur de chaque créateur.
                </p>
              </div>
              
              <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Outils de publication
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Les utilisateurs peuvent publier, gérer et présenter leur contenu de manière claire et structurée.
                </p>
              </div>

              <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Communauté privée
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Crub permet de développer une relation privilégiée entre créateurs et abonnés, dans un cadre sécurisé.
                </p>
              </div>
            </div>
          </div>

          {/* H2 - Sécurité */}
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Sécurité, qualité, confidentialité : l'ADN de Crub
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Environnement protégé</p>
              </div>
              <div className="text-center">
                <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Gestion stricte des accès</p>
              </div>
              <div className="text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Confidentialité renforcée</p>
              </div>
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Expérience professionnelle</p>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Rejoignez Crub, le Hub Premium des Créateurs
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Crub s'impose comme une plateforme nouvelle génération, idéale pour développer sa visibilité, consolider sa communauté et partager du contenu exclusif dans un environnement élégant et sécurisé.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth?tab=signup">Commencer maintenant</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
