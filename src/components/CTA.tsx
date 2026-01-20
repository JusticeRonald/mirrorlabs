import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email submitted:", email);
    setEmail("");
  };

  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/30" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            See What Your Team Is Missing
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join 200+ teams using Mirror Labs to cut site visits and eliminate costly miscommunication.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" variant="hero" size="lg" className="flex-shrink-0">
              Request Access
              <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Early access is limited. We'll reach out within 48 hours.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
