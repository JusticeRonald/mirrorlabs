import { ViewerIcon, MeasureIcon, AnnotateIcon } from "@/components/icons";
import { useScrollAnimation, useParallax } from "@/hooks/use-scroll-animation";
import {
  ViewerIllustration,
  MeasurementIllustration,
  AnnotationsIllustration,
} from "@/components/illustrations/FeatureIllustrations";

const Features = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  const features = [
    {
      icon: ViewerIcon,
      title: "Interactive 3D Scene Viewer",
      description: "Navigate and explore spaces from any angle with intuitive controls. Orbit, pan, and zoom through your captured environments with precision.",
      visual: "viewer",
      Illustration: ViewerIllustration,
    },
    {
      icon: MeasureIcon,
      title: "In-scene Measurements",
      description: "Take accurate measurements directly within the 3D environment. Point-to-point precision that your team can trust for critical decisions.",
      visual: "measure",
      Illustration: MeasurementIllustration,
    },
    {
      icon: AnnotateIcon,
      title: "Annotations & Notes",
      description: "Pin notes and comments at exact locations in the scene. Context that stays where it belongs, visible to everyone who needs it.",
      visual: "annotate",
      Illustration: AnnotationsIllustration,
    },
  ];

  return (
    <section id="product" className="py-32 relative overflow-hidden section-default">
      {/* Clean background with grid */}
      <div className="absolute inset-x-0 top-0 h-px bg-border/50" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header with scroll animation */}
        <div
          ref={headerRef}
          className={`text-center mb-20 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="text-sm text-primary font-medium uppercase tracking-wider">
            Core Capabilities
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mt-3 mb-4">
            Everything you need to collaborate in 3D
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools designed for clarity, not complexity.
          </p>
        </div>

        {/* Asymmetric Feature Rows */}
        <div className="max-w-6xl mx-auto space-y-24">
          {features.map((feature, index) => (
            <FeatureRow
              key={index}
              feature={feature}
              index={index}
              isReversed={index % 2 === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface FeatureRowProps {
  feature: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    visual: string;
    Illustration: React.ComponentType<{ className?: string }>;
  };
  index: number;
  isReversed: boolean;
}

const FeatureRow = ({ feature, index, isReversed }: FeatureRowProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });
  const { offset } = useParallax(0.7);

  return (
    <div
      ref={ref}
      className={`grid md:grid-cols-2 gap-12 items-center ${
        isReversed ? 'md:flex-row-reverse' : ''
      }`}
    >
      {/* Content */}
      <div
        className={`${isReversed ? 'md:order-2' : ''} ${
          isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${isReversed ? 'translate-x-10' : '-translate-x-10'}`
        } transition-all duration-700`}
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
          <feature.icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-2xl md:text-3xl font-bold font-heading text-foreground mb-4">
          {feature.title}
        </h3>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>

      {/* Visual with parallax */}
      <div
        className={`${isReversed ? 'md:order-1' : ''} ${
          isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${isReversed ? '-translate-x-10' : 'translate-x-10'}`
        } transition-all duration-700 delay-150`}
        style={{ transform: `translateY(${offset * 0.05}px)` }}
      >
        <div className="relative aspect-[4/3] rounded-2xl bg-card border border-border overflow-hidden group">
          {/* Grid pattern */}
          <div className="absolute inset-0 grid-pattern opacity-20" />

          {/* SVG Illustration */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <feature.Illustration className="w-full h-full" />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Features;
