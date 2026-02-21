import { Heart, Search, Bell, Lock } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

const SubscriberSection = () => {
  const { t } = useTranslation();

  const benefits = [
    { icon: Search, titleKey: "subscriber.discoverCreators" },
    { icon: Bell, titleKey: "subscriber.notifications" },
    { icon: Lock, titleKey: "subscriber.exclusiveContent" },
    { icon: Heart, titleKey: "subscriber.supportFavorites" }
  ];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          {t('subscriber.forSubscribers')}
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 px-4 py-2 bg-card/40 border border-border rounded-full">
              <benefit.icon className="h-4 w-4 text-primary" />
              <span className="text-sm">{t(benefit.titleKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubscriberSection;
