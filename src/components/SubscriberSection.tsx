import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Search, 
  Bell, 
  Lock
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Link } from "react-router-dom";

const SubscriberSection = () => {
  const { t } = useTranslation();
  
  const benefits = [
    {
      icon: Search,
      title: "Découvrez des créateurs",
      description: "Trouvez facilement du contenu qui vous correspond"
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Soyez alerté des nouveaux contenus de vos créateurs favoris"
    },
    {
      icon: Lock,
      title: "Contenu exclusif",
      description: "Accédez au contenu premium de vos créateurs préférés"
    },
    {
      icon: Heart,
      title: "Soutenez vos créateurs",
      description: "Abonnements et pourboires pour les encourager"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-card/10 to-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('subscriber.title')}
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {t('subscriber.subtitle')}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Accédez au contenu exclusif de vos créateurs favoris.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center p-6 bg-card/30 backdrop-blur-sm border border-border rounded-xl">
              <div className="bg-primary/10 p-3 rounded-lg w-fit mx-auto mb-4">
                <benefit.icon className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-2">{benefit.title}</h4>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/search">
            <Button variant="hero" size="lg">
              Explorer les créateurs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SubscriberSection;
