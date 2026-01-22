import { Camera, Cpu, Edit, Share } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Camera,
      step: "01",
      title: "Capture a space",
      description: "Use any compatible capture method to scan your environment.",
    },
    {
      icon: Cpu,
      step: "02",
      title: "Process into 3D",
      description: "Your capture is transformed into an interactive 3D scene.",
    },
    {
      icon: Edit,
      step: "03",
      title: "Review & annotate",
      description: "Measure, tag issues, and add notes directly in the scene.",
    },
    {
      icon: Share,
      step: "04",
      title: "Share with stakeholders",
      description: "Send secure links to the right people with the right permissions.",
    },
  ];

  return (
    <section className="py-32 relative overflow-hidden section-elevated">
      <div className="absolute inset-x-0 top-0 h-px bg-border/50" />
      <div className="absolute inset-0 grid-pattern opacity-25" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-sm text-primary font-medium uppercase tracking-wider">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mt-3 mb-4">
            From capture to collaboration in minutes
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-border z-0" />
                )}
                
                <div className="relative z-10 text-center">
                  {/* Step Number & Icon */}
                  <div className="relative inline-block mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold font-heading text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
