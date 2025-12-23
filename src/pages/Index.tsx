import HeroSection from "@/components/HeroSection";
import PopularCreators from "@/components/PopularCreators";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <SEOHead />
      <HeroSection />
      {user && <PopularCreators />}
    </div>
  );
};

export default Index;
