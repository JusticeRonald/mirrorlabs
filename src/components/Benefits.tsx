import { CaptureIcon, MeasureIcon, CollaborateIcon } from "@/components/icons";
import { useScrollAnimation, useStaggerAnimation } from "@/hooks/use-scroll-animation";

const Benefits = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation({ threshold: 0.2 });
  const staggerDelays = useStaggerAnimation(3, 120);

  const benefits = [
    {
      icon: CaptureIcon,
      title: "We Capture. You Collaborate.",
      description: "Our team handles the scanning with professional-grade equipment. You get instant access to explore, measure, and share with your entire team—no expensive gear, no learning curve, no waiting.",
      isPrimary: true,
    },
    {
      icon: MeasureIcon,
      title: "Catch Issues Before They Cost",
      description: "Spot conflicts in 3D before they become costly mistakes on-site. Teams report fewer change orders and faster decisions.",
      isPrimary: false,
    },
    {
      icon: CollaborateIcon,
      title: "One Scan, Unlimited Views",
      description: "Replace endless site visits with real-time 3D walkthroughs anyone can access—from anywhere.",
      isPrimary: false,
    },
  ];

  return (
    <section className="py-32 relative overflow-hidden section-elevated">
      {/* Background with subtle separator */}
      <div className="absolute inset-x-0 top-0 h-px bg-border/50" />
      <div className="absolute inset-0 point-cloud-bg opacity-15" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header with scroll animation */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mb-4">
            Built to solve real problems
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Move faster with fewer mistakes by giving everyone access to the same visual context.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div ref={cardsRef} className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-5 gap-6">
            {/* Large primary card - spans 3 columns */}
            <div
              style={staggerDelays[0].style}
              className={`md:col-span-3 md:row-span-2 group relative p-10 rounded-2xl bg-card border border-border card-lift ${
                cardsVisible ? 'opacity-100 animate-tilt-in' : 'opacity-0'
              }`}
            >
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary/15 transition-all duration-300">
                  <CaptureIcon className="w-7 h-7 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-2xl md:text-3xl font-bold font-heading text-foreground mb-4">
                  {benefits[0].title}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                  {benefits[0].description}
                </p>
              </div>
            </div>

            {/* Smaller cards - 2 columns, stacked */}
            {benefits.slice(1).map((benefit, index) => (
              <div
                key={benefit.title}
                style={staggerDelays[index + 1].style}
                className={`md:col-span-2 group relative p-8 rounded-2xl bg-card border border-border card-lift ${
                  cardsVisible ? 'opacity-100 animate-tilt-in' : 'opacity-0'
                }`}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-all duration-300">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold font-heading text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
