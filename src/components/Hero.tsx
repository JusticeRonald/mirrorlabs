import { Button } from "@/components/ui/button";
import { ArrowRight, Maximize2, Share2, Pin, Ruler } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">Now in early access</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            <span className="text-foreground">Fewer mistakes.</span>
            <br />
            <span className="text-foreground">Clearer decisions.</span>
            <br />
            <span className="text-gradient-primary">Shared 3D context.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Mirror Labs lets teams explore, measure, and annotate real-world spaces in interactive 3D—so everyone sees the same thing and stays aligned.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl">
              Request Access
              <ArrowRight className="ml-1" />
            </Button>
            <Button variant="heroOutline" size="xl">
              View Demo
            </Button>
          </div>
        </div>

        {/* Product Mockup */}
        <div className="max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden card-elevated">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-3 h-3 rounded-full bg-muted" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
                  mirror-labs.app/project/warehouse-east
                </div>
              </div>
            </div>

            {/* 3D Viewport Placeholder */}
            <div className="relative aspect-video bg-gradient-to-br from-secondary via-background to-secondary">
              {/* Grid Overlay */}
              <div className="absolute inset-0 grid-pattern opacity-30" />
              
              {/* 3D Scene Placeholder */}
              <div className="absolute inset-8 rounded-lg border border-border/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-xl bg-secondary/50 border border-border flex items-center justify-center">
                    <Maximize2 className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Interactive 3D Scene</p>
                </div>
              </div>

              {/* Floating UI Elements */}
              {/* Measurement Line */}
              <div className="absolute top-1/4 left-1/4 right-1/3 flex items-center">
                <div className="w-full h-px bg-primary/60" />
                <div className="absolute left-1/2 -translate-x-1/2 -top-3 px-2 py-1 rounded bg-primary text-xs text-primary-foreground font-medium">
                  12.5m
                </div>
              </div>

              {/* Annotation Pin */}
              <div className="absolute top-1/3 right-1/4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-float">
                  <Pin className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="px-3 py-2 rounded-lg bg-card border border-border text-xs">
                  <p className="text-foreground font-medium">Check clearance</p>
                  <p className="text-muted-foreground">Added by Sarah</p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-card/90 backdrop-blur-sm border border-border">
                <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                </button>
                <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <Pin className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="w-px h-6 bg-border" />
                <button className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
