import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Benefits from "@/components/Benefits";
import WhyMirrorLabs from "@/components/WhyMirrorLabs";
import Features from "@/components/Features";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Benefits />
      <WhyMirrorLabs />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
