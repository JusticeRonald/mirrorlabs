import Navigation from "@/components/Navigation";
import UseCases from "@/components/UseCases";
import Footer from "@/components/Footer";
import IndustryShowcase from "@/components/illustrations/IndustryShowcase";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const UseCasesPage = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Split Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 point-cloud-bg opacity-20" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Header text */}
            <div
              ref={headerRef}
              className={`transition-all duration-700 ${
                headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <span className="inline-block text-sm text-primary font-medium uppercase tracking-wider mb-4">
                Industries We Serve
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading text-foreground mb-6 leading-tight">
                Built For Teams Who
                <br />
                <span className="text-mirror-amber-400">Can't Afford Miscommunication</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Whether you're coordinating complex projects, managing assets, or planning operations,
                Mirror Labs gives your team a shared reality to work from.
              </p>
            </div>

            {/* Right: Interactive industry preview */}
            <div
              className={`relative transition-all duration-700 delay-200 ${
                headerVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
              }`}
            >
              <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
                <IndustryShowcase />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <UseCases />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default UseCasesPage;
