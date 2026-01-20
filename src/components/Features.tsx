import { 
  Box, 
  Ruler, 
  MessageSquare, 
  Link2, 
  TrendingUp, 
  FileDown 
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Box,
      title: "Interactive 3D Scene Viewer",
      description: "Navigate and explore spaces from any angle with intuitive controls.",
    },
    {
      icon: Ruler,
      title: "In-scene Measurements",
      description: "Take accurate measurements directly within the 3D environment.",
    },
    {
      icon: MessageSquare,
      title: "Annotations & Notes",
      description: "Pin notes and comments at exact locations in the scene.",
    },
    {
      icon: Link2,
      title: "Shareable Links with Permissions",
      description: "Share specific views with controlled access for each stakeholder.",
    },
    {
      icon: TrendingUp,
      title: "Visual Progress Tracking",
      description: "Compare captures over time to see how spaces evolve.",
    },
    {
      icon: FileDown,
      title: "Exportable Documentation",
      description: "Generate reports with measurements, annotations, and visuals.",
    },
  ];

  return (
    <section id="product" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-sm text-primary font-medium uppercase tracking-wider">
            Core Capabilities
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Everything you need to collaborate in 3D
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools designed for clarity, not complexity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
