import { useState, useEffect } from "react";
import { ConstructionIcon, RealEstateIcon, HospitalityIcon, ForensicsIcon, InsuranceIcon } from "@/components/icons";

interface IndustryShowcaseProps {
  className?: string;
}

const industries = [
  {
    icon: ConstructionIcon,
    name: "Construction",
    description: "Coordinate trades and track progress",
    color: "#FBBF24",
  },
  {
    icon: RealEstateIcon,
    name: "Real Estate",
    description: "Market and manage properties",
    color: "#FCD34D",
  },
  {
    icon: HospitalityIcon,
    name: "Hospitality",
    description: "Document and renovate venues",
    color: "#F59E0B",
  },
  {
    icon: ForensicsIcon,
    name: "Forensics",
    description: "Preserve scenes with precision",
    color: "#D97706",
  },
  {
    icon: InsuranceIcon,
    name: "Insurance",
    description: "Accelerate claims investigation",
    color: "#B45309",
  },
];

const IndustryShowcase = ({ className = "" }: IndustryShowcaseProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Auto-rotate through industries when not hovering
  useEffect(() => {
    if (isHovering) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % industries.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isHovering]);

  const activeIndustry = industries[activeIndex];

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Central Icon Display */}
      <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
        {/* Active Industry Icon */}
        <div className="relative mb-6">
          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-30 transition-colors duration-500"
            style={{ backgroundColor: activeIndustry.color }}
          />

          {/* Icon container */}
          <div
            className="relative w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl"
            style={{ backgroundColor: `${activeIndustry.color}20`, borderColor: activeIndustry.color }}
          >
            <activeIndustry.icon
              className="w-12 h-12 transition-all duration-500"
              style={{ color: activeIndustry.color }}
            />
          </div>
        </div>

        {/* Industry Name & Description */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold font-heading text-foreground mb-1 transition-all duration-300">
            {activeIndustry.name}
          </h3>
          <p className="text-sm text-muted-foreground transition-all duration-300">
            {activeIndustry.description}
          </p>
        </div>

        {/* Industry Selector Dots */}
        <div className="flex items-center gap-3">
          {industries.map((industry, index) => {
            const Icon = industry.icon;
            const isActive = index === activeIndex;

            return (
              <button
                key={industry.name}
                onClick={() => setActiveIndex(index)}
                className={`relative p-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-card border border-border shadow-lg scale-110'
                    : 'bg-transparent hover:bg-card/50'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                  }`}
                  style={{ color: isActive ? industry.color : undefined }}
                />

                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: industry.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Progress bar for auto-rotation */}
        {!isHovering && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/30 overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                backgroundColor: activeIndustry.color,
                animation: 'progress 3s linear infinite',
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default IndustryShowcase;
