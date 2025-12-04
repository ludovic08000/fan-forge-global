import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  BarChart3, 
  MessageSquare, 
  Camera, 
  Shield,
  Zap
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { Link } from "react-router-dom";

const CreatorSection = () => {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: DollarSign,
      title: "Monétisation flexible",
      description: "Abonnements, contenus payants et pourboires"
    },
    {
      icon: BarChart3,
      title: "Statistiques détaillées",
      description: "Suivez vos revenus et votre audience en temps réel"
    },
    {
      icon: MessageSquare,
      title: "Messagerie privée",
      description: "Échangez directement avec vos abonnés"
    },
    {
      icon: Camera,
      title: "Upload facile",
      description: "Photos, vidéos et lives en quelques clics"
    },
    {
      icon: Shield,
      title: "Protection du contenu",
      description: "Filigrane automatique sur vos images"
    },
    {
      icon: Zap,
      title: "85% de revenus",
      description: "Gardez la majorité de vos gains"
    }
  ];

  return (
    <section id="creators" className="py-16 bg-gradient-to-br from-background to-card/20">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('creator.title')}
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {t('creator.subtitle')}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Développez votre audience et monétisez votre contenu facilement.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-4 p-4 bg-card/30 backdrop-blur-sm border border-border rounded-xl">
              <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/auth">
            <Button variant="premium" size="lg">
              Devenir créateur
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CreatorSection;
