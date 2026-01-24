import { Play, ArrowRight } from 'lucide-react';

interface DemoAccessCardProps {
  onDemoAccess: () => void;
}

export function DemoAccessCard({ onDemoAccess }: DemoAccessCardProps) {
  return (
    <button
      onClick={onDemoAccess}
      className="w-full bg-primary/5 border border-primary/20 rounded-lg p-4 text-left transition-all hover:bg-primary/10 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
          <Play className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground">Try Demo</h3>
          <p className="text-sm text-muted-foreground">Explore without an account</p>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}
