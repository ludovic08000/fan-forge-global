import HeroSection from "@/components/HeroSection";
import PopularCreators from "@/components/PopularCreators";
import LiveNowSection from "@/components/LiveNowSection";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <SEOHead />
      <HeroSection />
      {user && <LiveNowSection />}
      {user && <PopularCreators />}
    </div>
  );
};

export default Index;
