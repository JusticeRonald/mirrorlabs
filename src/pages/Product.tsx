import Navigation from "@/components/Navigation";
import HowItWorks from "@/components/HowItWorks";
import Security from "@/components/Security";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import PlatformHeroVisual from "@/components/illustrations/PlatformHeroVisual";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const Product = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section with Visual Background */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 point-cloud-bg opacity-20" />

        {/* Split layout container */}
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text content */}
            <div
              ref={headerRef}
              className={`transition-all duration-700 ${
                headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <span className="inline-block text-sm text-primary font-medium uppercase tracking-wider mb-4">
                Full-Service Platform
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading text-foreground mb-6 leading-tight">
                Professional 3D Capture.
                <br />
                <span className="text-mirror-amber-400">Zero Hassle.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                We scan. You collaborate. Everyone stays aligned. Our team captures your spaces with professional-grade equipment—you get instant access to explore, measure, and share with your entire team.
              </p>
            </div>

            {/* Visual component */}
            <div
              className={`relative transition-all duration-700 delay-200 ${
                headerVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
              }`}
            >
              <div className="aspect-square max-w-lg mx-auto">
                <PlatformHeroVisual className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Security Section */}
      <Security />

      {/* CTA Section - Minimal variant for product page */}
      <CTA variant="minimal" />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Product;
