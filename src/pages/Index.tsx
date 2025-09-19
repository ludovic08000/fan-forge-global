import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CreatorSection from "@/components/CreatorSection";
import SubscriberSection from "@/components/SubscriberSection";
import PopularProfiles from "@/components/PopularProfiles";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <CreatorSection />
        <SubscriberSection />
        <PopularProfiles />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
