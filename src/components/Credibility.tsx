import { Building2, Users, Award } from "lucide-react";
import { useScrollAnimation, useStaggerAnimation, useCounterAnimation } from "@/hooks/use-scroll-animation";

const Credibility = () => {
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation();
  const staggerDelays = useStaggerAnimation(3, 150);

  const stats = [
    {
      icon: Users,
      value: 200,
      suffix: "+",
      label: "Active Teams",
    },
    {
      icon: Building2,
      value: 1000,
      suffix: "+",
      label: "Projects Managed",
    },
    {
      icon: Award,
      value: 4.9,
      suffix: "/5",
      label: "Customer Rating",
      isDecimal: true,
    },
  ];

  return (
    <section className="py-32 relative overflow-hidden section-default">
      {/* Clean background */}
      <div className="absolute inset-x-0 top-0 h-px bg-border/50" />
      <div className="absolute inset-0 point-cloud-bg opacity-20" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mb-4">
            Trusted by industry leaders
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Teams across construction, real estate, and hospitality rely on Mirror Labs.
          </p>
        </div>

        {/* Stats Grid */}
        <div
          ref={statsRef}
          className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              stat={stat}
              index={index}
              isVisible={statsVisible}
              delay={staggerDelays[index].style}
            />
          ))}
        </div>

        {/* Early Access CTA Line */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Join them in transforming how your team collaborates in 3D.{" "}
            <a href="#contact" className="text-primary hover:underline font-medium">
              Request early access
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

interface StatCardProps {
  stat: {
    icon: React.ComponentType<{ className?: string }>;
    value: number;
    suffix: string;
    label: string;
    isDecimal?: boolean;
  };
  index: number;
  isVisible: boolean;
  delay: React.CSSProperties;
}

const StatCard = ({ stat, isVisible, delay }: StatCardProps) => {
  const count = useCounterAnimation(stat.value, isVisible, stat.isDecimal ? 1 : 0);

  return (
    <div
      style={delay}
      className={`text-center p-8 rounded-2xl bg-card border border-border card-lift ${
        isVisible ? 'opacity-100 animate-tilt-in' : 'opacity-0'
      }`}
    >
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <stat.icon className="w-7 h-7 text-primary" />
      </div>
      <div className="text-5xl font-bold text-foreground mb-2">
        {count}{stat.suffix}
      </div>
      <div className="text-muted-foreground text-lg">
        {stat.label}
      </div>
    </div>
  );
};

export default Credibility;
