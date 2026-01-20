import { Badge } from "@/components/ui/badge";

const Credibility = () => {
  return (
    <section className="py-12 border-y border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 px-4 py-1.5">
            Early Access
          </Badge>
          <p className="text-center text-muted-foreground max-w-md">
            Now accepting early access partners. Be among the first to transform how your team collaborates in 3D.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Credibility;
