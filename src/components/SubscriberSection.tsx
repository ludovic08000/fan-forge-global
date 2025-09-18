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
      title: "Never Miss Updates",
      description: "Smart notifications for new content from your favorite creators"
    },
    {
      icon: Lock,
      title: "Exclusive Access",
      description: "Premium content, behind-the-scenes, and creator interactions"
    },
    {
      icon: Heart,
      title: "Support Creators",
      description: "Directly support the creators you love with tips and subscriptions"
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Seamless experience across all devices with offline downloads"
    },
    {
      icon: Shield,
      title: t('subscriber.privacy.title'),
      description: t('subscriber.privacy.description')
    }
  ];

  const features = [
    "HD/4K streaming quality",
    "Unlimited downloads for offline viewing",
    "Multi-device synchronization",
    "Creator messaging & live chats",
    "Custom playlists & favorites",
    "Advanced search & filters"
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-card/10 to-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 mb-6 bg-card/50 backdrop-blur-sm border border-border rounded-full">
            <Star className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium">For Subscribers</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            {t('subscriber.title')}
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {t('subscriber.subtitle')}
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Access premium content from your favorite creators, discover new talent, 
            and be part of exclusive communities around the world.
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
              <h3 className="text-2xl font-bold mb-4">Premium Subscriber Experience</h3>
              <p className="text-muted-foreground">
                Get access to exclusive features that enhance your content consumption
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-semibold mb-6 flex items-center">
                  <Globe className="h-5 w-5 text-primary mr-2" />
                  Global Access
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
                <h4 className="text-xl font-semibold mb-4">Subscription Plans</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Basic Access</span>
                    <span className="text-primary font-semibold">$9.99/mo</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Premium Plus</span>
                    <span className="text-primary font-semibold">$19.99/mo</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>VIP Experience</span>
                    <span className="text-primary font-semibold">$39.99/mo</span>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Button variant="premium" className="w-full">
                      Start Free Trial
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
            Explore Content Now
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            7-day free trial • Cancel anytime • No hidden fees
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubscriberSection;