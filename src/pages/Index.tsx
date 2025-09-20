import HeroSection from "@/components/HeroSection";
import CreatorSection from "@/components/CreatorSection";
import SubscriberSection from "@/components/SubscriberSection";
import PopularProfiles from "@/components/PopularProfiles";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSection />
        <CreatorSection />
        <SubscriberSection />
        <PopularProfiles />
      </main>
    </div>
  );
};

export default Index;
