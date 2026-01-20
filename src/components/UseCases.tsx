import { 
  Building2, 
  Factory, 
  Wrench, 
  PenTool, 
  Warehouse, 
  Home 
} from "lucide-react";

const UseCases = () => {
  const industries = [
    {
      icon: Building2,
      category: "Construction",
      title: "Coordinate trades and track progress",
      description: "Keep all stakeholders aligned with shared access to site conditions. Reduce RFIs, minimize site visits, and catch clashes before they become problems.",
      benefits: [
        "Reduce coordination errors",
        "Track progress remotely",
        "Document as-built conditions",
      ],
    },
    {
      icon: Factory,
      category: "Manufacturing",
      title: "Plan layouts and optimize workflows",
      description: "Visualize existing facilities and plan changes without disrupting operations. Test equipment placement, plan maintenance access, and train teams on new configurations.",
      benefits: [
        "Optimize floor layouts",
        "Plan equipment moves",
        "Train remote teams",
      ],
    },
    {
      icon: Wrench,
      category: "Facility Management",
      title: "Maintain and retrofit buildings",
      description: "Document existing conditions for maintenance planning and contractor coordination. Reduce site visits and provide contractors with accurate context before they arrive.",
      benefits: [
        "Speed up maintenance planning",
        "Coordinate contractors remotely",
        "Document building changes",
      ],
    },
    {
      icon: PenTool,
      category: "Architecture & Design",
      title: "Collaborate on renovations",
      description: "Work with existing conditions data that's always accessible. Share spaces with clients, take accurate measurements, and document design intent throughout the project.",
      benefits: [
        "Measure existing spaces remotely",
        "Present to clients visually",
        "Document design decisions",
      ],
    },
    {
      icon: Warehouse,
      category: "Logistics & Warehousing",
      title: "Optimize storage and flow",
      description: "Plan warehouse layouts, analyze flow patterns, and maximize storage efficiency. Make data-driven decisions about space utilization without disrupting operations.",
      benefits: [
        "Plan storage optimization",
        "Analyze traffic patterns",
        "Coordinate layout changes",
      ],
    },
    {
      icon: Home,
      category: "Real Estate",
      title: "Market and manage properties",
      description: "Provide immersive property tours and accurate documentation for tenants and buyers. Reduce time to lease and improve property management efficiency.",
      benefits: [
        "Virtual property tours",
        "Accurate space documentation",
        "Remote property inspections",
      ],
    },
  ];

  return (
    <section id="use-cases" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-sm text-primary font-medium uppercase tracking-wider">
            Industries
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Built for teams who work with physical spaces
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how different industries use Mirror Labs to improve coordination and reduce errors.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {industries.map((industry, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <industry.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <span className="text-sm text-primary font-medium">
                    {industry.category}
                  </span>
                  <h3 className="font-semibold text-foreground text-lg">
                    {industry.title}
                  </h3>
                </div>
              </div>
              
              <p className="text-muted-foreground leading-relaxed mb-4">
                {industry.description}
              </p>
              
              <ul className="space-y-2">
                {industry.benefits.map((benefit, benefitIndex) => (
                  <li key={benefitIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
