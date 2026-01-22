import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Mail, Bell, Check } from "lucide-react";

const Pricing = () => {
  const { toast } = useToast();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: formRef, isVisible: formVisible } = useScrollAnimation();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitted(true);
    toast({
      title: "You're on the list!",
      description: "We'll notify you as soon as pricing is available.",
    });

    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 point-cloud-bg opacity-20" />
        <div className="absolute inset-0 gradient-mesh" />

        <div
          ref={headerRef}
          className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="inline-block text-sm text-primary font-medium uppercase tracking-wider mb-4">
            Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-heading text-foreground mb-6">
            Pricing Coming Soon
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're finalizing our pricing plans to offer the best value for teams of all sizes.
            Be the first to know when we launch.
          </p>
        </div>
      </section>

      {/* Email Signup Section */}
      <section className="pb-24 px-6">
        <div
          ref={formRef}
          className={`max-w-xl mx-auto transition-all duration-700 delay-200 ${
            formVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Bell className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold font-heading text-foreground mb-2">
              Get Notified
            </h2>
            <p className="text-muted-foreground mb-8">
              Enter your email and we'll let you know when pricing is available.
              No spam, just one email when we're ready.
            </p>

            {isSubmitted ? (
              <div className="py-6">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-foreground font-medium">You're on the list!</p>
                <p className="text-muted-foreground text-sm mt-1">
                  We'll be in touch soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="sr-only">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-border pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                >
                  Notify Me
                </Button>
              </form>
            )}
          </div>

          {/* What to expect */}
          <div className="mt-12 grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground mb-1">Flexible</div>
              <p className="text-sm text-muted-foreground">Plans for teams of all sizes</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground mb-1">Transparent</div>
              <p className="text-sm text-muted-foreground">No hidden fees or surprises</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground mb-1">Fair</div>
              <p className="text-sm text-muted-foreground">Pay only for what you use</p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              Want to learn more about Mirror Labs?{" "}
              <a href="/contact" className="text-primary hover:underline">
                Contact us
              </a>{" "}
              for early access.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
