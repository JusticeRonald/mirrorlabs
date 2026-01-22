import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Maximize2, Share2, Pin, Ruler, Eye, RotateCcw, Move3d } from "lucide-react";
import { useParallax } from "@/hooks/use-scroll-animation";

const Hero = () => {
  const { offset } = useParallax(0.6);

  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden">
      {/* Background layers with depth */}
      <div className="absolute inset-0 point-cloud-bg opacity-30" />
      <div className="absolute inset-0 gradient-mesh" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          {/* Badge - refined without pulse */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Now in early access</span>
          </div>

          {/* Headline - staggered line reveal */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading tracking-tight mb-6">
            <span className="block text-foreground animate-line-reveal" style={{ animationDelay: '0ms' }}>
              Fewer mistakes.
            </span>
            <span className="block text-foreground animate-line-reveal" style={{ animationDelay: '100ms' }}>
              Clearer decisions.
            </span>
            <span className="block text-mirror-amber-400 animate-line-reveal" style={{ animationDelay: '200ms' }}>
              Shared 3D context.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "300ms" }}>
            Mirror Labs lets teams explore, measure, and annotate real-world spaces in interactive 3D—so everyone sees the same thing and stays aligned.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "400ms" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/contact">
                Request Access
                <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <Link to="/demo">View Demo</Link>
            </Button>
          </div>
        </div>

        {/* Static Product Mockup with floating UI */}
        <div
          className="max-w-5xl mx-auto animate-fade-up"
          style={{
            animationDelay: "500ms",
            transform: `translateY(${offset * 0.08}px)`
          }}
        >
          <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden card-lift">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
                  mirror-labs.app/project/warehouse-east
                </div>
              </div>
            </div>

            {/* 3D Viewport Mockup - Static screenshot representation */}
            <div className="relative aspect-video bg-gradient-to-br from-secondary via-background to-secondary overflow-hidden">
              {/* Grid Overlay */}
              <div className="absolute inset-0 point-cloud-bg opacity-40" />

              {/* Scene mockup content */}
              <div className="absolute inset-8 rounded-lg border border-border/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-xl bg-card border border-border flex items-center justify-center">
                    <Move3d className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Interactive 3D Scene</p>
                </div>
              </div>

              {/* Floating UI Elements - Measurement Line */}
              <div
                className="absolute top-[30%] left-[20%] w-[35%] flex items-center"
                style={{ transform: `translateY(${offset * -0.05}px)` }}
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="flex-1 h-px bg-gradient-to-r from-primary via-primary to-primary" />
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="absolute left-1/2 -translate-x-1/2 -top-7 px-3 py-1.5 rounded-lg bg-primary text-xs text-primary-foreground font-medium shadow-lg">
                  12.5m
                </div>
              </div>

              {/* Floating Annotation Pin */}
              <div
                className="absolute top-[40%] right-[22%] flex items-center gap-2 group"
                style={{ transform: `translateY(${offset * 0.03}px)` }}
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Pin className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-card border border-border shadow-xl">
                  <p className="text-foreground font-medium text-sm">Check clearance</p>
                  <p className="text-muted-foreground text-xs">Added by Sarah</p>
                </div>
              </div>

              {/* Second measurement */}
              <div
                className="absolute bottom-[35%] left-[45%] flex flex-col items-center"
                style={{ transform: `translateY(${offset * 0.06}px)` }}
              >
                <div className="h-16 w-px bg-gradient-to-b from-mirror-amber-400 via-mirror-amber-500 to-mirror-amber-600" />
                <div className="px-2 py-1 rounded bg-mirror-amber-500 text-xs text-background font-medium mt-1">
                  3.2m
                </div>
              </div>

              {/* View indicator */}
              <div
                className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border"
                style={{ transform: `translateY(${offset * -0.04}px)` }}
              >
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">3 viewers</span>
              </div>

              {/* Bottom Toolbar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border shadow-xl">
                <button className="group p-2.5 rounded-lg hover:bg-secondary transition-all">
                  <Ruler className="w-5 h-5 text-primary" />
                </button>
                <button className="group p-2.5 rounded-lg hover:bg-secondary transition-all">
                  <Pin className="w-5 h-5 text-muted-foreground" />
                </button>
                <button className="group p-2.5 rounded-lg hover:bg-secondary transition-all">
                  <RotateCcw className="w-5 h-5 text-muted-foreground" />
                </button>
                <div className="w-px h-6 bg-border mx-1" />
                <button className="group p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                  <Share2 className="w-5 h-5" />
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
