import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

interface CTAProps {
  variant?: 'full' | 'minimal' | 'inline' | 'demo';
}

const CTA = ({ variant = 'full' }: CTAProps) => {
  const [email, setEmail] = useState("");
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Email submission disabled - form is not functional yet
  };

  // Minimal variant - just a button
  if (variant === 'minimal') {
    return (
      <section
        ref={ref}
        className={`py-24 relative overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
      >
        <div className="absolute inset-0 section-elevated" />
        <div className="absolute inset-x-0 top-0 h-px bg-border/50" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Request early access and we'll reach out within 48 hours.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/contact">
                Request Access
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Demo variant - specific CTA for demo page
  if (variant === 'demo') {
    return (
      <section
        ref={ref}
        className={`py-24 relative overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
      >
        <div className="absolute inset-0 section-elevated" />
        <div className="absolute inset-x-0 top-0 h-px bg-border/50" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground mb-4">
              Ready to try it yourself?
            </h2>
            <p className="text-muted-foreground mb-8">
              Get hands-on access to explore your own spaces in 3D.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/contact">
                Request Early Access
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Inline variant - for use in cards
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 pt-4 border-t border-border/50">
        <Button variant="hero" size="sm" asChild className="flex-1">
          <Link to="/contact">
            Learn More
            <ArrowRight className="ml-1 w-3 h-3" />
          </Link>
        </Button>
      </div>
    );
  }

  // Full variant - with email form
  return (
    <section
      ref={ref}
      id="contact"
      className={`py-32 relative overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
    >
      {/* Clean elevated background with subtle separator */}
      <div className="absolute inset-0 section-elevated" />
      <div className="absolute inset-x-0 top-0 h-px bg-border/50" />
      <div className="absolute inset-0 point-cloud-bg opacity-10" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground mb-4">
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
              disabled
              className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button type="submit" variant="hero" size="lg" className="flex-shrink-0" disabled>
              Coming Soon
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
