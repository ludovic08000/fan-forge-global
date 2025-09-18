import { Button } from "@/components/ui/button";
import { Play, Zap, Globe, Shield } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Premium content platform hero background"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 mb-8 bg-card/50 backdrop-blur-sm border border-border rounded-full">
            <Zap className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium">Next-Generation Creator Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Empower Your
            <span className="block bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Creative Journey
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            The ultimate platform for content creators and subscribers. 
            Build your community, monetize your passion, and connect with fans worldwide.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <div className="flex items-center px-4 py-2 bg-card/30 backdrop-blur-sm border border-border rounded-full">
              <Globe className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Global Reach</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-card/30 backdrop-blur-sm border border-border rounded-full">
              <Shield className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Premium Security</span>
            </div>
            <div className="flex items-center px-4 py-2 bg-card/30 backdrop-blur-sm border border-border rounded-full">
              <Zap className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm">Instant Payouts</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" className="shadow-[var(--shadow-premium)]">
              Start Creating Today
            </Button>
            <Button variant="creator" size="xl" className="bg-card/50 backdrop-blur-sm">
              <Play className="h-5 w-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-8 border-t border-border">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">1M+</div>
              <div className="text-muted-foreground">Active Creators</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">50M+</div>
              <div className="text-muted-foreground">Subscribers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">$2B+</div>
              <div className="text-muted-foreground">Creator Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-2">190+</div>
              <div className="text-muted-foreground">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary-glow/10 rounded-full blur-xl animate-pulse delay-1000"></div>
    </section>
  );
};

export default HeroSection;