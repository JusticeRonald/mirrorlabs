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
import { Mail, Clock, Sparkles } from "lucide-react";

const Contact = () => {
  const { toast } = useToast();
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

    // Basic validation
    if (!formData.fullName || !formData.workEmail || !formData.company || !formData.industry || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.workEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid work email address.",
        variant: "destructive",
      });
      return;
    }

    // Success
    toast({
      title: "Request Submitted!",
      description: "We'll reach out within 48 hours. Thank you for your interest!",
    });

    // Clear form
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
    <div className="min-h-screen bg-gradient-to-b from-mirror-dark via-mirror-darker to-black">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-mirror-blue/10 border border-mirror-blue/30">
            <span className="text-mirror-blue text-sm font-medium">Get in Touch</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-mirror-blue to-white bg-clip-text text-transparent leading-tight">
            Let's Start a
            <br />
            Conversation
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Ready to transform how your team collaborates? Reach out to learn more about Mirror Labs
            and join our early access program.
          </p>
        </div>
      </section>

      {/* Two-Column Layout */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
          {/* Left Column - Contact Form */}
          <div className="bg-mirror-darker/50 backdrop-blur-sm border border-mirror-blue/20 rounded-2xl p-8 shadow-2xl shadow-mirror-blue/5">
            <h2 className="text-3xl font-bold mb-6 text-white">Request Access</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="bg-mirror-dark/50 border-mirror-blue/30 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              {/* Work Email */}
              <div className="space-y-2">
                <Label htmlFor="workEmail" className="text-white">
                  Work Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workEmail"
                  type="email"
                  placeholder="john@company.com"
                  value={formData.workEmail}
                  onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                  className="bg-mirror-dark/50 border-mirror-blue/30 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              {/* Company */}
              <div className="space-y-2">
                <Label htmlFor="company" className="text-white">
                  Company <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Your Company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="bg-mirror-dark/50 border-mirror-blue/30 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-white">
                  Industry <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  required
                >
                  <SelectTrigger className="bg-mirror-dark/50 border-mirror-blue/30 text-white">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-mirror-darker border-mirror-blue/30">
                    <SelectItem value="architecture">Architecture & Design</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="facility-management">Facility Management</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-white">
                  Message <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your project and how Mirror Labs can help..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="bg-mirror-dark/50 border-mirror-blue/30 text-white placeholder:text-gray-500 min-h-32"
                  required
                />
              </div>

              {/* Early Access Checkbox */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="earlyAccess"
                  checked={formData.earlyAccess}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, earlyAccess: checked as boolean })
                  }
                  className="border-mirror-blue/30 data-[state=checked]:bg-mirror-blue data-[state=checked]:border-mirror-blue"
                />
                <Label
                  htmlFor="earlyAccess"
                  className="text-sm text-gray-400 leading-relaxed cursor-pointer"
                >
                  I'd like to join the early access program and receive updates about Mirror Labs
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-mirror-blue to-blue-500 hover:from-blue-500 hover:to-mirror-blue text-white font-semibold py-6"
              >
                Request Access
              </Button>
            </form>
          </div>

          {/* Right Column - Contact Info */}
          <div className="space-y-8">
            <div className="bg-mirror-darker/50 backdrop-blur-sm border border-mirror-blue/20 rounded-2xl p-8 shadow-2xl shadow-mirror-blue/5">
              <div className="flex items-start space-x-4 mb-6">
                <div className="p-3 bg-mirror-blue/10 rounded-lg">
                  <Mail className="w-6 h-6 text-mirror-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Email Us</h3>
                  <a
                    href="mailto:hello@mirrorlabs.io"
                    className="text-mirror-blue hover:text-blue-400 transition-colors"
                  >
                    hello@mirrorlabs.io
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-mirror-blue/10 rounded-lg">
                  <Clock className="w-6 h-6 text-mirror-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Response Time</h3>
                  <p className="text-gray-400">We'll reach out within 48 hours</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-mirror-blue/10 to-purple-500/10 backdrop-blur-sm border border-mirror-blue/30 rounded-2xl p-8 shadow-2xl shadow-mirror-blue/10">
              <div className="flex items-start space-x-4 mb-4">
                <div className="p-3 bg-mirror-blue/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-mirror-blue" />
                </div>
                <h3 className="text-2xl font-bold text-white">Early Access Program</h3>
              </div>
              <p className="text-gray-300 leading-relaxed mb-4">
                Join our early access program to be among the first to experience Mirror Labs. Get:
              </p>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start">
                  <span className="text-mirror-blue mr-2">•</span>
                  Priority access to new features
                </li>
                <li className="flex items-start">
                  <span className="text-mirror-blue mr-2">•</span>
                  Direct feedback channel to our team
                </li>
                <li className="flex items-start">
                  <span className="text-mirror-blue mr-2">•</span>
                  Special pricing for early adopters
                </li>
                <li className="flex items-start">
                  <span className="text-mirror-blue mr-2">•</span>
                  Influence the product roadmap
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Contact;
