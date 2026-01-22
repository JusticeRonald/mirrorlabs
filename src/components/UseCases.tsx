import { ConstructionIcon, RealEstateIcon, HospitalityIcon, ForensicsIcon, InsuranceIcon } from "@/components/icons";
import { useScrollAnimation, useStaggerAnimation } from "@/hooks/use-scroll-animation";

const UseCases = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.15 });
  const staggerDelays = useStaggerAnimation(5, 80);

  const industries = [
    {
      icon: ConstructionIcon,
      name: "Construction",
      tagline: "Coordinate trades, track progress",
    },
    {
      icon: RealEstateIcon,
      name: "Real Estate",
      tagline: "Virtual tours, space documentation",
    },
    {
      icon: HospitalityIcon,
      name: "Hospitality",
      tagline: "Venue capture, renovation planning",
    },
    {
      icon: ForensicsIcon,
      name: "Forensics",
      tagline: "Scene preservation, case review",
    },
    {
      icon: InsuranceIcon,
      name: "Insurance",
      tagline: "Claims documentation, remote assessment",
    },
  ];

  return (
    <section id="use-cases" className="py-32 relative overflow-hidden section-elevated">
      {/* Background */}
      <div className="absolute inset-x-0 top-0 h-px bg-border/50" />
      <div className="absolute inset-0 point-cloud-bg opacity-10" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-20 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="text-sm text-primary font-medium uppercase tracking-wider">
            Industries
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mt-3 mb-4">
            Built for teams who work with physical spaces
          </h2>
        </div>

        {/* Icon-Forward Grid */}
        <div
          ref={gridRef}
          className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-12"
        >
          {industries.map((industry, index) => (
            <div
              key={industry.name}
              style={staggerDelays[index].style}
              className={`group flex flex-col items-center text-center transition-all duration-500 ${
                gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {/* Large Icon Container */}
              <div className="relative mb-4">
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-2xl bg-mirror-amber-400/0 blur-xl transition-all duration-500 group-hover:bg-mirror-amber-400/20" />

                {/* Icon */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-card border border-border flex items-center justify-center transition-all duration-300 group-hover:border-mirror-amber-400/30 group-hover:bg-card/80">
                  <industry.icon className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground transition-all duration-300 group-hover:text-mirror-amber-400 group-hover:scale-110" />
                </div>
              </div>

              {/* Industry Name */}
              <h3 className="font-semibold font-heading text-foreground text-base md:text-lg mb-1 transition-colors duration-300 group-hover:text-mirror-amber-400">
                {industry.name}
              </h3>

              {/* Tagline - fades in on hover */}
              <p className="text-xs md:text-sm text-muted-foreground opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                {industry.tagline}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
