import { Heart, Search, Bell, Lock } from "lucide-react";

const SubscriberSection = () => {
  const benefits = [
    { icon: Search, title: "Découvrir des créateurs" },
    { icon: Bell, title: "Notifications" },
    { icon: Lock, title: "Contenu exclusif" },
    { icon: Heart, title: "Soutenir vos favoris" }
  ];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          Pour les abonnés
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 px-4 py-2 bg-card/40 border border-border rounded-full">
              <benefit.icon className="h-4 w-4 text-primary" />
              <span className="text-sm">{benefit.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubscriberSection;
