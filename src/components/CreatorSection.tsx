import { 
  DollarSign, 
  BarChart3, 
  MessageSquare, 
  Camera, 
  Shield,
  Zap
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

const CreatorSection = () => {
  const { t } = useTranslation();

  const features = [
    { icon: DollarSign, titleKey: "creator.flexibleMonetization" },
    { icon: BarChart3, titleKey: "creator.realtimeStats" },
    { icon: MessageSquare, titleKey: "creator.privateMessaging" },
    { icon: Camera, titleKey: "creator.easyUpload" },
    { icon: Shield, titleKey: "creator.protectedContent" },
    { icon: Zap, titleKey: "creator.revenueShare" }
  ];

  return (
    <section className="py-12 bg-card/20">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          {t('creator.whyBecome')}
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 px-4 py-2 bg-card/40 border border-border rounded-full">
              <feature.icon className="h-4 w-4 text-primary" />
              <span className="text-sm">{t(feature.titleKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CreatorSection;
