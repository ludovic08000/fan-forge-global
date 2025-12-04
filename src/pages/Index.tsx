import HeroSection from "@/components/HeroSection";
import CreatorSection from "@/components/CreatorSection";
import SubscriberSection from "@/components/SubscriberSection";
import PopularCreators from "@/components/PopularCreators";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <SEOHead />
      <HeroSection />
      {user ? (
        <PopularCreators />
      ) : (
        <>
          <CreatorSection />
          <SubscriberSection />
        </>
      )}
    </div>
  );
};

export default Index;
