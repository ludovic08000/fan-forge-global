import { Button } from "@/components/ui/button";
import { Play, Shield, Zap, Users, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
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
            <span className="text-sm font-medium">Le Hub Créatif Moderne</span>
          </div>

          {/* Main Heading - H1 SEO */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            <span className="block text-foreground mb-2">Crub</span>
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Le Hub Créatif Moderne
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Crub est une plateforme moderne pensée pour les créateurs qui souhaitent partager du contenu exclusif avec leur communauté.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <div className="flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm border border-primary/20 rounded-full">
              <Shield className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Espace sécurisé</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm border border-primary/20 rounded-full">
              <Users className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Communauté premium</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-card/40 backdrop-blur-sm border border-primary/20 rounded-full">
              <Lock className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Contenu exclusif</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth?tab=signup">Rejoindre Crub</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/search">
                <Play className="h-4 w-4 mr-2" />
                Découvrir les créateurs
              </Link>
            </Button>
          </div>
        </div>

        {/* SEO Content Section */}
        <div className="max-w-4xl mx-auto mt-20 space-y-12 text-left">
          {/* H2 - Crub : le nouveau hub des créateurs */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Crub : le nouveau hub des créateurs
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Crub est une plateforme moderne pensée pour les créateurs qui souhaitent partager du contenu exclusif avec leur communauté. 
              Le nom Crub combine "Créer" et "Hub", symbolisant le point central où les créateurs développent leur univers.
            </p>
          </div>

          {/* H2 - Pourquoi choisir Crub ? */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              Pourquoi choisir Crub ?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Un espace créatif premium
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Crub offre un environnement sécurisé, épuré et optimisé pour la création de contenu. 
                  Chaque créateur peut personnaliser son profil, partager des publications et développer sa communauté.
                </p>
              </div>
              
              <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Une plateforme intuitive
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  L'expérience Crub est pensée pour être simple, fluide et agréable, autant pour les créateurs que pour les abonnés. 
                  L'interface met en avant les publications et la relation créateur–membre.
                </p>
              </div>
            </div>
          </div>

          {/* H2 - Les fonctionnalités clés de Crub */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              Les fonctionnalités clés de Crub
            </h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-card/20 border border-border/30 rounded-lg p-5">
                <h3 className="font-semibold mb-2 text-foreground">Profil personnalisable</h3>
                <p className="text-muted-foreground text-sm">
                  Ajoutez une photo de profil, publiez des photos de lieux, personnalisez votre espace et organisez votre contenu.
                </p>
              </div>
              
              <div className="bg-card/20 border border-border/30 rounded-lg p-5">
                <h3 className="font-semibold mb-2 text-foreground">Gestion de communauté</h3>
                <p className="text-muted-foreground text-sm">
                  Crub facilite l'interaction : messages, abonnements, publications privées et bien plus encore.
                </p>
              </div>
              
              <div className="bg-card/20 border border-border/30 rounded-lg p-5">
                <h3 className="font-semibold mb-2 text-foreground">Sécurité & confidentialité</h3>
                <p className="text-muted-foreground text-sm">
                  Crub met en avant un environnement protégé, avec des contrôles d'accès stricts et une gestion responsable des profils.
                </p>
              </div>
            </div>
          </div>

          {/* H2 - Crub, une identité forte et unique */}
          <div className="text-center bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Crub, une identité forte et unique
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Le nom Crub est court, original, facile à retenir et optimise la visibilité SEO. 
              Il se distingue immédiatement des plateformes traditionnelles grâce à une prononciation simple, 
              une identité marquante et une marque valorisante.
            </p>
          </div>

          {/* Final CTA */}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Rejoignez Crub, le Hub qui valorise les créateurs
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Avec Crub, les créateurs disposent d'un espace moderne pour développer leur activité, 
              fédérer une communauté et partager du contenu exclusif dans un cadre sécurisé.
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