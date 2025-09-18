import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Camera, 
  Shield,
  Zap,
  TrendingUp
} from "lucide-react";
import dashboardImage from "@/assets/dashboard-preview.jpg";

const CreatorSection = () => {
  const features = [
    {
      icon: DollarSign,
      title: "Multiple Revenue Streams",
      description: "Subscriptions, tips, pay-per-view, and custom pricing models"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Track earnings, engagement, and audience demographics in real-time"
    },
    {
      icon: Users,
      title: "Fan Management", 
      description: "Built-in messaging, notifications, and subscriber relationship tools"
    },
    {
      icon: Camera,
      title: "Content Studio",
      description: "Professional tools for photos, videos, stories, and live streaming"
    },
    {
      icon: Shield,
      title: "Content Protection",
      description: "Advanced DRM, watermarking, and anti-piracy measures"
    },
    {
      icon: Zap,
      title: "Instant Payouts",
      description: "Get paid faster with daily payouts and lower fees"
    }
  ];

  return (
    <section id="creators" className="py-20 bg-gradient-to-br from-background to-card/20">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 mb-6 bg-card/50 backdrop-blur-sm border border-border rounded-full">
            <TrendingUp className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium">For Content Creators</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Build Your Empire.
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Monetize Your Passion.
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Everything you need to grow your audience, create amazing content, 
            and build a sustainable income doing what you love.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Dashboard Preview */}
          <div className="relative">
            <div className="bg-card/30 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-[var(--shadow-card)]">
              <img 
                src={dashboardImage}
                alt="Creator dashboard interface preview"
                className="w-full rounded-lg shadow-lg"
              />
              <div className="absolute -bottom-4 -right-4 bg-primary/20 blur-2xl w-32 h-32 rounded-full"></div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold mb-8">Why Creators Choose Us</h3>
            
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 text-primary mr-2" />
                Higher Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">85%</div>
              <CardDescription>
                Keep more of what you earn with our industry-leading revenue share
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 text-primary mr-2" />
                Fan Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">3x</div>
              <CardDescription>
                Faster audience growth with our discovery algorithm
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 text-primary mr-2" />
                Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">5x</div>
              <CardDescription>
                Better fan interaction with advanced messaging tools
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="premium" size="xl" className="shadow-[var(--shadow-premium)]">
            Start Your Creator Journey
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Join thousands of successful creators. Free to start, no monthly fees.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CreatorSection;