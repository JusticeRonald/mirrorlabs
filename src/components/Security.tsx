import { Shield, Eye, Lock } from "lucide-react";

const Security = () => {
  const features = [
    {
      icon: Lock,
      title: "Role-based access controls",
      description: "Define who can view, edit, or share each project.",
    },
    {
      icon: Shield,
      title: "Permissioned sharing",
      description: "Share with specific stakeholders without exposing entire projects.",
    },
    {
      icon: Eye,
      title: "Activity visibility",
      description: "See who accessed what and when for complete accountability.",
    },
  ];

  return (
    <section id="security" className="py-32 relative section-default">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-sm text-primary font-medium uppercase tracking-wider">
              Enterprise Ready
            </span>
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mt-3 mb-4">
              Security you can trust
            </h2>
            <p className="text-lg text-muted-foreground">
              Built with the controls enterprises need.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="text-center p-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold font-heading text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Security;
