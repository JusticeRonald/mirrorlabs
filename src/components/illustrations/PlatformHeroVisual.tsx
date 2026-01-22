import { useParallax } from "@/hooks/use-scroll-animation";

interface PlatformHeroVisualProps {
  className?: string;
}

const PlatformHeroVisual = ({ className = "" }: PlatformHeroVisualProps) => {
  const { offset } = useParallax(0.5);

  return (
    <div className={`relative w-full h-full min-h-[400px] ${className}`}>
      {/* Isometric Grid Base */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Animated Grid Lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="grid-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0" />
            <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines with Animation */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={40 + i * 40}
            x2="400"
            y2={40 + i * 40}
            stroke="url(#grid-line-gradient)"
            strokeWidth="1"
            className="animate-pulse-slow"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}

        {/* Vertical Grid Lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <line
            key={`v-${i}`}
            x1={40 + i * 40}
            y1="0"
            x2={40 + i * 40}
            y2="300"
            stroke="#FBBF24"
            strokeWidth="0.5"
            strokeOpacity="0.1"
          />
        ))}
      </svg>

      {/* Floating UI Elements */}
      <div
        className="absolute top-[15%] left-[10%] w-32 h-24 rounded-xl bg-card/80 border border-border backdrop-blur-sm shadow-xl"
        style={{ transform: `translateY(${offset * 0.1}px)` }}
      >
        <div className="p-3">
          <div className="h-2 w-16 bg-mirror-amber-400/30 rounded mb-2" />
          <div className="h-2 w-12 bg-muted rounded mb-2" />
          <div className="h-2 w-20 bg-muted rounded" />
        </div>
      </div>

      {/* Main 3D Scene Representation */}
      <div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 w-48 h-48"
        style={{ transform: `translateX(-50%) translateY(${offset * 0.05}px)` }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="cube-top" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            <linearGradient id="cube-left" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="cube-right" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          {/* Isometric Cube */}
          <g className="animate-float" style={{ transformOrigin: "100px 100px" }}>
            {/* Left face */}
            <path
              d="M 60 130 L 60 70 L 100 50 L 100 110 Z"
              fill="url(#cube-left)"
              fillOpacity="0.6"
            />
            {/* Right face */}
            <path
              d="M 100 110 L 100 50 L 140 70 L 140 130 Z"
              fill="url(#cube-right)"
              fillOpacity="0.6"
            />
            {/* Top face */}
            <path
              d="M 60 70 L 100 50 L 140 70 L 100 90 Z"
              fill="url(#cube-top)"
              fillOpacity="0.8"
            />
          </g>

          {/* Orbit ring */}
          <ellipse
            cx="100"
            cy="100"
            rx="70"
            ry="25"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="1"
            strokeDasharray="6 4"
            strokeOpacity="0.3"
            className="animate-spin-slow"
            style={{ transformOrigin: "100px 100px", animationDuration: "20s" }}
          />

          {/* Indicator dots */}
          <circle cx="170" cy="100" r="4" fill="#FBBF24" fillOpacity="0.8" />
          <circle cx="30" cy="100" r="3" fill="#D97706" fillOpacity="0.6" />
        </svg>
      </div>

      {/* Measurement Indicator */}
      <div
        className="absolute bottom-[25%] right-[15%] flex items-center gap-2"
        style={{ transform: `translateY(${offset * -0.08}px)` }}
      >
        <div className="w-2 h-2 rounded-full bg-mirror-amber-400" />
        <div className="w-16 h-px bg-gradient-to-r from-mirror-amber-400 to-mirror-amber-600" />
        <div className="w-2 h-2 rounded-full bg-mirror-amber-400" />
        <div className="px-2 py-1 rounded bg-card border border-border text-xs text-foreground font-medium">
          4.2m
        </div>
      </div>

      {/* Annotation Pin */}
      <div
        className="absolute top-[40%] right-[20%] flex items-center gap-2"
        style={{ transform: `translateY(${offset * 0.06}px)` }}
      >
        <div className="w-8 h-8 rounded-full bg-mirror-amber-500 flex items-center justify-center shadow-lg">
          <span className="text-xs font-bold text-background">1</span>
        </div>
        <div className="px-3 py-2 rounded-lg bg-card border border-border shadow-lg">
          <p className="text-xs text-foreground font-medium">Check clearance</p>
        </div>
      </div>

      {/* Bottom Toolbar Mock */}
      <div
        className="absolute bottom-[10%] left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-xl bg-card/90 border border-border backdrop-blur-sm shadow-xl"
        style={{ transform: `translateX(-50%) translateY(${offset * 0.04}px)` }}
      >
        <div className="w-6 h-6 rounded bg-mirror-amber-400/20 flex items-center justify-center">
          <div className="w-3 h-3 border border-mirror-amber-400 rounded-sm" />
        </div>
        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
        </div>
        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
          <div className="w-3 h-0.5 bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

export default PlatformHeroVisual;
