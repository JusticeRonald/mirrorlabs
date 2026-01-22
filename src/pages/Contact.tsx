import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ui/use-toast";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const Contact = () => {
  const { toast } = useToast();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const [formData, setFormData] = useState({
    fullName: "",
    workEmail: "",
    company: "",
    industry: "",
    message: "",
    earlyAccess: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.workEmail || !formData.company || !formData.industry || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.workEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid work email address.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request Submitted!",
      description: "We'll reach out within 48 hours. Thank you for your interest!",
    });

    setFormData({
      fullName: "",
      workEmail: "",
      company: "",
      industry: "",
      message: "",
      earlyAccess: false,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section - Clean, no gradient on text */}
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
            Get in Touch
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-heading text-foreground mb-6">
            Let's Start a Conversation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ready to transform how your team collaborates? Reach out to learn more about Mirror Labs
            and join our early access program.
          </p>
        </div>
      </section>

      {/* Form Section - Cleaner layout */}
      <section className="pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-2xl font-semibold font-heading text-foreground mb-2">Request Access</h2>
            <p className="text-muted-foreground mb-8">Fill out the form below and we'll get back to you within 48 hours.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workEmail" className="text-foreground">
                    Work Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="workEmail"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.workEmail}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    className="bg-background border-border"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-foreground">
                    Company <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Your Company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="bg-background border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-foreground">
                    Industry <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                    required
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="forensics">Forensics & Investigation</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="architecture">Architecture & Design</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-foreground">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your project and how Mirror Labs can help..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="bg-background border-border min-h-32 resize-none"
                  required
                />
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="earlyAccess"
                  checked={formData.earlyAccess}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, earlyAccess: checked as boolean })
                  }
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                />
                <Label
                  htmlFor="earlyAccess"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I'd like to join the early access program and receive updates about Mirror Labs
                </Label>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
              >
                Request Access
              </Button>
            </form>
          </div>

          {/* Contact info below form */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              Prefer email? Reach us directly at{" "}
              <a
                href="mailto:hello@mirrorlabs.io"
                className="text-primary hover:underline"
              >
                hello@mirrorlabs.io
              </a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
