import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Heart, 
  Search, 
  Bell, 
  Lock, 
  Star,
  Smartphone,
  Shield,
  Globe
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

const SubscriberSection = () => {
  const { t } = useTranslation();
  
  const benefits = [
    {
      icon: Search,
      title: t('subscriber.discovery.title'),
      description: t('subscriber.discovery.description')
    },
    {
      icon: Bell,
      title: "Ne Manquez Aucune Mise à Jour",
      description: "Notifications intelligentes pour le nouveau contenu de vos créateurs préférés"
    },
    {
      icon: Lock,
      title: "Accès Exclusif",
      description: "Contenu premium, coulisses et interactions avec les créateurs"
    },
    {
      icon: Heart,
      title: "Soutenez les Créateurs",
      description: "Soutenez directement les créateurs que vous aimez avec des pourboires et des abonnements"
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Expérience fluide sur tous les appareils"
    },
    {
      icon: Shield,
      title: t('subscriber.privacy.title'),
      description: t('subscriber.privacy.description')
    }
  ];

  const features = [
    "Qualité streaming HD/4K",
    "Téléchargements illimités pour visionnage hors ligne",
    "Synchronisation multi-appareils",
    "Messagerie créateurs & chats en direct",
    "Listes de lecture & favoris personnalisés",
    "Recherche & filtres avancés"
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-card/10 to-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 mb-6 bg-card/50 backdrop-blur-sm border border-border rounded-full">
            <Star className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium">Pour les Abonnés</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            {t('subscriber.title')}
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {t('subscriber.subtitle')}
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Accédez au contenu premium de vos créateurs préférés, découvrez de nouveaux talents 
            et rejoignez des communautés exclusives du monde entier.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <Card key={index} className="bg-card/30 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[var(--shadow-card)]">
              <CardHeader>
                <div className="bg-primary/10 p-3 rounded-lg w-fit">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{benefit.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card/30 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-[var(--shadow-card)]">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-4">Expérience Abonné Premium</h3>
              <p className="text-muted-foreground">
                Accédez à des fonctionnalités exclusives qui améliorent votre consommation de contenu
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-semibold mb-6 flex items-center">
                  <Globe className="h-5 w-5 text-primary mr-2" />
                  Accès Mondial
                </h4>
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <div className="bg-primary/20 rounded-full p-1 mr-3">
                        <Star className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/5 to-primary-glow/5 rounded-xl p-6 border border-primary/20">
                <h4 className="text-xl font-semibold mb-4">Plans d&apos;Abonnement</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Accès Basic</span>
                    <span className="text-primary font-semibold">9,99€/mois</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Premium Plus</span>
                    <span className="text-primary font-semibold">19,99€/mois</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expérience VIP</span>
                    <span className="text-primary font-semibold">39,99€/mois</span>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Button variant="premium" className="w-full">
                      Commencer l&apos;Essai Gratuit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button variant="hero" size="xl" className="shadow-[var(--shadow-premium)]">
            Explorer le Contenu Maintenant
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Essai gratuit de 7 jours • Annulez à tout moment • Sans frais cachés
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubscriberSection;