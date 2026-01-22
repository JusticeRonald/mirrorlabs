import { useScrollAnimation, useStaggerAnimation } from "@/hooks/use-scroll-animation";
import { Check, X } from "lucide-react";

const WhyMirrorLabs = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: tableRef, isVisible: tableVisible } = useScrollAnimation({ threshold: 0.2 });
  const staggerDelays = useStaggerAnimation(5, 100);

  const comparisons = [
    {
      painPoint: "Expensive equipment",
      oldWay: "$50K+ cameras, training costs",
      mirrorWay: "We handle it—no gear needed",
    },
    {
      painPoint: "Slow processing",
      oldWay: "Days to weeks of waiting",
      mirrorWay: "Ready in hours",
    },
    {
      painPoint: "Poor quality captures",
      oldWay: "Consumer cameras compromise clarity",
      mirrorWay: "Professional-grade results",
    },
    {
      painPoint: "No collaboration",
      oldWay: "Static images, endless email chains",
      mirrorWay: "Real-time annotation & measurement",
    },
    {
      painPoint: "Complex software",
      oldWay: "Steep learning curves",
      mirrorWay: "Intuitive web-based viewer",
    },
  ];

  return (
    <section className="py-32 relative overflow-hidden section-default">
      {/* Background */}
      <div className="absolute inset-x-0 top-0 h-px bg-border/50" />
      <div className="absolute inset-0 point-cloud-bg opacity-10" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="text-sm text-primary font-medium uppercase tracking-wider">
            The Mirror Labs Difference
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mt-3 mb-4">
            Why teams choose us
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Skip the complexity. Get professional results.
          </p>
        </div>

        {/* Comparison Table */}
        <div
          ref={tableRef}
          className="max-w-4xl mx-auto"
        >
          {/* Header Row - Desktop */}
          <div className="hidden md:grid grid-cols-3 gap-4 mb-4 px-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Challenge
            </div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Traditional Approach
            </div>
            <div className="text-sm font-medium text-mirror-amber-400 uppercase tracking-wider">
              Mirror Labs
            </div>
          </div>

          {/* Comparison Rows */}
          <div className="space-y-3">
            {comparisons.map((item, index) => (
              <div
                key={item.painPoint}
                style={staggerDelays[index].style}
                className={`grid md:grid-cols-3 gap-4 p-6 rounded-xl bg-card border border-border transition-all duration-500 ${
                  tableVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                {/* Pain Point */}
                <div className="font-medium text-foreground">
                  {item.painPoint}
                </div>

                {/* Old Way */}
                <div className="flex items-start gap-2 text-muted-foreground">
                  <X className="w-5 h-5 text-destructive/70 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item.oldWay}</span>
                </div>

                {/* Mirror Labs Way */}
                <div className="flex items-start gap-2 text-foreground">
                  <Check className="w-5 h-5 text-mirror-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item.mirrorWay}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyMirrorLabs;
