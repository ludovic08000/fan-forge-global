import { 
  DollarSign, 
  BarChart3, 
  MessageSquare, 
  Camera, 
  Shield,
  Zap
} from "lucide-react";

const CreatorSection = () => {
  const features = [
    { icon: DollarSign, title: "Monétisation flexible" },
    { icon: BarChart3, title: "Statistiques en temps réel" },
    { icon: MessageSquare, title: "Messagerie privée" },
    { icon: Camera, title: "Upload facile" },
    { icon: Shield, title: "Contenu protégé" },
    { icon: Zap, title: "85% de revenus" }
  ];

  return (
    <section className="py-12 bg-card/20">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          Pourquoi devenir créateur ?
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 px-4 py-2 bg-card/40 border border-border rounded-full">
              <feature.icon className="h-4 w-4 text-primary" />
              <span className="text-sm">{feature.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CreatorSection;
