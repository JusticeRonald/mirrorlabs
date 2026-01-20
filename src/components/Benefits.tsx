import { AlertTriangle, Users, FileCheck } from "lucide-react";

const Benefits = () => {
  const benefits = [
    {
      icon: AlertTriangle,
      title: "Stop Expensive Rework Before It Happens",
      description: "Spot conflicts and errors in 3D before they become 6-figure mistakes on-site. Teams using Mirror Labs report 40% fewer change orders.",
    },
    {
      icon: Users,
      title: "Cut Site Visit Time By 60%",
      description: "Get eyes on every detail without the travel time, fuel costs, or schedule delays. Your entire team can 'walk' the space from anywhere.",
    },
    {
      icon: FileCheck,
      title: "End 'He Said, She Said' Forever",
      description: "No more conflicting site reports or blurry photos. One immersive 3D environment everyone can see, measure, and mark up in real time.",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built to solve real problems
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Move faster with fewer mistakes by giving everyone access to the same visual context.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl card-elevated border border-border hover:border-primary/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>

              {/* Hover Glow */}
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
