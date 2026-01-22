import React from "react";

interface IllustrationProps {
  className?: string;
}

// Shared color constants - Amber palette
const COLORS = {
  primary: "#FBBF24",
  primaryLight: "#FCD34D",
  primaryDark: "#F59E0B",
  secondary: "#D97706",
  secondaryLight: "#FDE68A",
  secondaryDark: "#B45309",
  muted: "rgba(251, 191, 36, 0.15)",
  subtle: "rgba(251, 191, 36, 0.08)",
};

/**
 * Interactive 3D Scene Viewer Illustration
 * Shows the ability to navigate/explore 3D spaces with an abstract isometric grid and navigation elements
 */
export const ViewerIllustration: React.FC<IllustrationProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Interactive 3D Scene Viewer illustration"
    >
      <defs>
        {/* Gradient for the main plane */}
        <linearGradient id="viewer-plane-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.2" />
          <stop offset="100%" stopColor={COLORS.secondary} stopOpacity="0.05" />
        </linearGradient>

        {/* Gradient for the cube faces */}
        <linearGradient id="viewer-cube-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={COLORS.primaryLight} />
          <stop offset="100%" stopColor={COLORS.primary} />
        </linearGradient>
        <linearGradient id="viewer-cube-left" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={COLORS.primary} />
          <stop offset="100%" stopColor={COLORS.primaryDark} />
        </linearGradient>
        <linearGradient id="viewer-cube-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.secondary} />
          <stop offset="100%" stopColor={COLORS.secondaryDark} />
        </linearGradient>

        {/* Glow filter */}
        <filter id="viewer-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid - isometric perspective */}
      <g className="opacity-30">
        {/* Horizontal grid lines with perspective */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={`h-${i}`}
            d={`M ${50 + i * 15} ${200 - i * 20} L ${350 - i * 15} ${200 - i * 20}`}
            stroke={COLORS.primary}
            strokeWidth="0.5"
            strokeOpacity={0.3 - i * 0.04}
          />
        ))}
        {/* Vertical grid lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <path
            key={`v-${i}`}
            d={`M ${80 + i * 35} 200 L ${130 + i * 25} 100`}
            stroke={COLORS.primary}
            strokeWidth="0.5"
            strokeOpacity={0.2}
          />
        ))}
      </g>

      {/* Isometric floor plane */}
      <path
        d="M 200 220 L 320 160 L 200 100 L 80 160 Z"
        fill="url(#viewer-plane-grad)"
        stroke={COLORS.primary}
        strokeWidth="1"
        strokeOpacity="0.3"
        className="transition-all duration-500 group-hover:opacity-80"
      />

      {/* Main 3D cube - representing the viewable scene */}
      <g className="transition-transform duration-500 group-hover:-translate-y-2">
        {/* Left face */}
        <path
          d="M 160 180 L 160 120 L 200 100 L 200 160 Z"
          fill="url(#viewer-cube-left)"
          fillOpacity="0.8"
        />
        {/* Right face */}
        <path
          d="M 200 160 L 200 100 L 240 120 L 240 180 Z"
          fill="url(#viewer-cube-right)"
          fillOpacity="0.8"
        />
        {/* Top face */}
        <path
          d="M 160 120 L 200 100 L 240 120 L 200 140 Z"
          fill="url(#viewer-cube-top)"
          fillOpacity="0.9"
        />
      </g>

      {/* Smaller floating cube - depth indicator */}
      <g className="transition-transform duration-700 group-hover:translate-x-2 group-hover:-translate-y-1" style={{ transformOrigin: "280px 130px" }}>
        <path
          d="M 265 150 L 265 125 L 280 117 L 280 142 Z"
          fill={COLORS.secondary}
          fillOpacity="0.6"
        />
        <path
          d="M 280 142 L 280 117 L 295 125 L 295 150 Z"
          fill={COLORS.secondaryDark}
          fillOpacity="0.6"
        />
        <path
          d="M 265 125 L 280 117 L 295 125 L 280 133 Z"
          fill={COLORS.secondaryLight}
          fillOpacity="0.7"
        />
      </g>

      {/* Navigation orbit ring */}
      <ellipse
        cx="200"
        cy="140"
        rx="90"
        ry="25"
        fill="none"
        stroke={COLORS.primary}
        strokeWidth="1.5"
        strokeDasharray="8 4"
        strokeOpacity="0.4"
        className="transition-all duration-500 group-hover:stroke-opacity-60"
      />

      {/* Navigation indicator dot - animated position on orbit */}
      <circle
        cx="290"
        cy="140"
        r="6"
        fill={COLORS.primary}
        filter="url(#viewer-glow)"
        className="transition-all duration-300 group-hover:scale-125"
        style={{ transformOrigin: "290px 140px" }}
      />

      {/* Camera/eye indicator */}
      <g className="transition-opacity duration-300 group-hover:opacity-100 opacity-70">
        <path
          d="M 285 140 L 220 130"
          stroke={COLORS.primary}
          strokeWidth="1"
          strokeDasharray="4 2"
          strokeOpacity="0.5"
        />
        {/* Camera icon */}
        <circle cx="295" cy="140" r="3" fill="none" stroke={COLORS.primaryLight} strokeWidth="1.5" />
        <circle cx="295" cy="140" r="1" fill={COLORS.primaryLight} />
      </g>

      {/* Zoom controls indicator */}
      <g className="transition-all duration-300 group-hover:opacity-100 opacity-60">
        <rect x="320" y="180" width="28" height="60" rx="4" fill={COLORS.subtle} stroke={COLORS.primary} strokeWidth="1" strokeOpacity="0.3" />
        <text x="334" y="200" fill={COLORS.primary} fontSize="14" textAnchor="middle" fontWeight="500">+</text>
        <line x1="326" y1="210" x2="342" y2="210" stroke={COLORS.primary} strokeWidth="1" strokeOpacity="0.3" />
        <text x="334" y="230" fill={COLORS.secondary} fontSize="14" textAnchor="middle" fontWeight="500">-</text>
      </g>

      {/* Coordinate axes hint */}
      <g className="opacity-50 transition-opacity duration-300 group-hover:opacity-70">
        <line x1="60" y1="250" x2="90" y2="250" stroke={COLORS.primary} strokeWidth="2" />
        <line x1="60" y1="250" x2="60" y2="220" stroke={COLORS.secondaryLight} strokeWidth="2" />
        <line x1="60" y1="250" x2="45" y2="265" stroke={COLORS.secondary} strokeWidth="2" />
        <text x="95" y="253" fill={COLORS.primary} fontSize="10" fontWeight="500">X</text>
        <text x="57" y="215" fill={COLORS.secondaryLight} fontSize="10" fontWeight="500">Y</text>
        <text x="38" y="275" fill={COLORS.secondary} fontSize="10" fontWeight="500">Z</text>
      </g>
    </svg>
  );
};

/**
 * In-scene Measurements Illustration
 * Shows measurement tools in a 3D environment with dimension lines and values
 */
export const MeasurementIllustration: React.FC<IllustrationProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="In-scene Measurements illustration"
    >
      <defs>
        <linearGradient id="measure-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.15" />
          <stop offset="100%" stopColor={COLORS.secondary} stopOpacity="0.05" />
        </linearGradient>

        <linearGradient id="measure-wall" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={COLORS.primaryDark} stopOpacity="0.4" />
          <stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.2" />
        </linearGradient>

        <filter id="measure-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Marker pattern */}
        <marker id="arrow-start" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M 6 2 L 2 4 L 6 6" fill="none" stroke={COLORS.primary} strokeWidth="1.5" />
        </marker>
        <marker id="arrow-end" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M 2 2 L 6 4 L 2 6" fill="none" stroke={COLORS.primary} strokeWidth="1.5" />
        </marker>
      </defs>

      {/* Background grid */}
      <g className="opacity-20">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <line
            key={`grid-h-${i}`}
            x1="50"
            y1={60 + i * 25}
            x2="350"
            y2={60 + i * 25}
            stroke={COLORS.primary}
            strokeWidth="0.5"
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line
            key={`grid-v-${i}`}
            x1={50 + i * 50}
            y1="60"
            x2={50 + i * 50}
            y2="260"
            stroke={COLORS.primary}
            strokeWidth="0.5"
          />
        ))}
      </g>

      {/* 3D Room corner representation */}
      {/* Floor */}
      <path
        d="M 80 200 L 200 250 L 320 200 L 200 150 Z"
        fill="url(#measure-grad-1)"
        stroke={COLORS.primary}
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* Left wall */}
      <path
        d="M 80 200 L 80 100 L 200 50 L 200 150 Z"
        fill="url(#measure-wall)"
        stroke={COLORS.primary}
        strokeWidth="1"
        strokeOpacity="0.4"
      />

      {/* Right wall */}
      <path
        d="M 200 150 L 200 50 L 320 100 L 320 200 Z"
        fill={COLORS.subtle}
        stroke={COLORS.secondary}
        strokeWidth="1"
        strokeOpacity="0.4"
      />

      {/* Horizontal measurement line - width */}
      <g className="transition-all duration-500 group-hover:opacity-100 opacity-80">
        <line
          x1="95"
          y1="230"
          x2="185"
          y2="265"
          stroke={COLORS.primary}
          strokeWidth="2"
          markerStart="url(#arrow-start)"
          markerEnd="url(#arrow-end)"
          filter="url(#measure-glow)"
        />
        {/* Measurement label */}
        <rect x="115" y="235" width="50" height="22" rx="4" fill="hsl(240, 6%, 9%)" stroke={COLORS.primary} strokeWidth="1" />
        <text x="140" y="251" fill={COLORS.primaryLight} fontSize="12" textAnchor="middle" fontWeight="600">3.2m</text>
      </g>

      {/* Vertical measurement line - height on left wall */}
      <g className="transition-all duration-500 group-hover:opacity-100 opacity-80">
        <line
          x1="65"
          y1="110"
          x2="65"
          y2="190"
          stroke={COLORS.secondary}
          strokeWidth="2"
          markerStart="url(#arrow-start)"
          markerEnd="url(#arrow-end)"
          filter="url(#measure-glow)"
        />
        {/* Extension lines */}
        <line x1="65" y1="110" x2="85" y2="105" stroke={COLORS.secondary} strokeWidth="1" strokeOpacity="0.5" />
        <line x1="65" y1="190" x2="85" y2="195" stroke={COLORS.secondary} strokeWidth="1" strokeOpacity="0.5" />
        {/* Measurement label */}
        <rect x="30" y="138" width="45" height="22" rx="4" fill="hsl(240, 6%, 9%)" stroke={COLORS.secondary} strokeWidth="1" />
        <text x="52" y="154" fill={COLORS.secondaryLight} fontSize="12" textAnchor="middle" fontWeight="600">2.4m</text>
      </g>

      {/* Diagonal measurement - room diagonal */}
      <g className="transition-all duration-500 group-hover:opacity-100 opacity-70">
        <line
          x1="100"
          y1="185"
          x2="295"
          y2="115"
          stroke={COLORS.primaryLight}
          strokeWidth="1.5"
          strokeDasharray="6 3"
          markerStart="url(#arrow-start)"
          markerEnd="url(#arrow-end)"
        />
        {/* Measurement label */}
        <rect x="175" y="130" width="50" height="22" rx="4" fill="hsl(240, 6%, 9%)" stroke={COLORS.primaryLight} strokeWidth="1" />
        <text x="200" y="146" fill={COLORS.primaryLight} fontSize="12" textAnchor="middle" fontWeight="600">5.1m</text>
      </g>

      {/* Measurement points */}
      <g filter="url(#measure-glow)">
        <circle cx="95" cy="193" r="5" fill={COLORS.primary} className="transition-transform duration-300 group-hover:scale-125" style={{ transformOrigin: "95px 193px" }} />
        <circle cx="185" cy="227" r="5" fill={COLORS.primary} className="transition-transform duration-300 group-hover:scale-125" style={{ transformOrigin: "185px 227px" }} />
        <circle cx="80" cy="105" r="4" fill={COLORS.secondary} className="transition-transform duration-300 group-hover:scale-125" style={{ transformOrigin: "80px 105px" }} />
        <circle cx="80" cy="195" r="4" fill={COLORS.secondary} className="transition-transform duration-300 group-hover:scale-125" style={{ transformOrigin: "80px 195px" }} />
      </g>

      {/* Ruler indicator */}
      <g className="opacity-60 transition-opacity duration-300 group-hover:opacity-80">
        <rect x="310" y="70" width="60" height="16" rx="2" fill={COLORS.subtle} stroke={COLORS.primary} strokeWidth="1" strokeOpacity="0.4" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line
            key={`ruler-${i}`}
            x1={318 + i * 8}
            y1={i % 2 === 0 ? 78 : 80}
            x2={318 + i * 8}
            y2={86}
            stroke={COLORS.primary}
            strokeWidth="1"
            strokeOpacity="0.6"
          />
        ))}
      </g>

      {/* Precision indicator badge */}
      <g className="transition-all duration-300 group-hover:opacity-100 opacity-70">
        <rect x="310" y="240" width="70" height="28" rx="6" fill={COLORS.subtle} stroke={COLORS.primary} strokeWidth="1" strokeOpacity="0.3" />
        <text x="345" y="250" fill={COLORS.muted} fontSize="8" textAnchor="middle">PRECISION</text>
        <text x="345" y="262" fill={COLORS.primaryLight} fontSize="11" textAnchor="middle" fontWeight="600">+/- 1mm</text>
      </g>
    </svg>
  );
};

/**
 * Annotations & Notes Illustration
 * Shows pins/notes attached to locations in 3D with conversation threads
 */
export const AnnotationsIllustration: React.FC<IllustrationProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Annotations and Notes illustration"
    >
      <defs>
        <linearGradient id="anno-floor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.12" />
          <stop offset="100%" stopColor={COLORS.secondary} stopOpacity="0.04" />
        </linearGradient>

        <linearGradient id="anno-card" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(240, 5%, 12%)" />
          <stop offset="100%" stopColor="hsl(240, 6%, 9%)" />
        </linearGradient>

        <filter id="anno-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.3)" />
        </filter>

        <filter id="anno-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background scattered dots - point cloud aesthetic */}
      <g className="opacity-20">
        {[
          [60, 80], [120, 60], [180, 90], [240, 70], [300, 85], [340, 65],
          [80, 130], [140, 140], [220, 125], [280, 145], [320, 120],
          [70, 180], [130, 200], [190, 175], [250, 195], [310, 185],
          [90, 240], [150, 255], [210, 235], [270, 250], [330, 240],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.5" fill={COLORS.primary} />
        ))}
      </g>

      {/* Isometric floor plane */}
      <path
        d="M 200 260 L 350 185 L 200 110 L 50 185 Z"
        fill="url(#anno-floor)"
        stroke={COLORS.primary}
        strokeWidth="1"
        strokeOpacity="0.2"
      />

      {/* Abstract 3D structure representation */}
      <g className="opacity-60">
        {/* Simple structure outlines */}
        <path
          d="M 120 210 L 120 150 L 170 125 L 170 185 Z"
          fill={COLORS.subtle}
          stroke={COLORS.secondary}
          strokeWidth="1"
          strokeOpacity="0.4"
        />
        <path
          d="M 230 200 L 230 140 L 280 115 L 280 175 Z"
          fill={COLORS.subtle}
          stroke={COLORS.primary}
          strokeWidth="1"
          strokeOpacity="0.4"
        />
      </g>

      {/* Annotation Pin 1 - Main with expanded note card */}
      <g className="transition-transform duration-500 group-hover:-translate-y-1">
        {/* Connection line */}
        <path
          d="M 145 165 L 145 90"
          stroke={COLORS.primary}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          strokeOpacity="0.6"
        />

        {/* Pin base */}
        <circle
          cx="145"
          cy="168"
          r="8"
          fill={COLORS.primary}
          filter="url(#anno-glow)"
          className="transition-transform duration-300 group-hover:scale-110"
          style={{ transformOrigin: "145px 168px" }}
        />
        <circle cx="145" cy="168" r="4" fill="hsl(240, 6%, 9%)" />

        {/* Note card */}
        <g filter="url(#anno-shadow)">
          <rect x="80" y="45" width="130" height="50" rx="6" fill="url(#anno-card)" stroke={COLORS.primary} strokeWidth="1" strokeOpacity="0.4" />
          {/* Header line */}
          <rect x="88" y="53" width="60" height="3" rx="1.5" fill={COLORS.primary} fillOpacity="0.8" />
          {/* Text lines */}
          <rect x="88" y="64" width="100" height="2" rx="1" fill={COLORS.muted} />
          <rect x="88" y="72" width="80" height="2" rx="1" fill={COLORS.muted} />
          <rect x="88" y="80" width="50" height="2" rx="1" fill={COLORS.muted} />
          {/* User avatar */}
          <circle cx="190" cy="60" r="10" fill={COLORS.secondary} fillOpacity="0.3" stroke={COLORS.secondary} strokeWidth="1" />
          <text x="190" y="64" fill={COLORS.secondaryLight} fontSize="10" textAnchor="middle" fontWeight="600">JR</text>
        </g>
      </g>

      {/* Annotation Pin 2 - Collapsed/smaller */}
      <g className="transition-transform duration-500 group-hover:-translate-y-1" style={{ transitionDelay: "50ms" }}>
        {/* Connection line */}
        <path
          d="M 255 155 L 255 110"
          stroke={COLORS.secondary}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          strokeOpacity="0.5"
        />

        {/* Pin */}
        <circle
          cx="255"
          cy="158"
          r="7"
          fill={COLORS.secondary}
          filter="url(#anno-glow)"
          className="transition-transform duration-300 group-hover:scale-110"
          style={{ transformOrigin: "255px 158px" }}
        />
        <circle cx="255" cy="158" r="3" fill="hsl(240, 6%, 9%)" />

        {/* Mini note badge */}
        <g filter="url(#anno-shadow)">
          <rect x="235" y="85" width="40" height="28" rx="4" fill="url(#anno-card)" stroke={COLORS.secondary} strokeWidth="1" strokeOpacity="0.4" />
          <rect x="242" y="92" width="26" height="2" rx="1" fill={COLORS.secondary} fillOpacity="0.7" />
          <rect x="242" y="99" width="18" height="2" rx="1" fill={COLORS.muted} />
          <text x="268" y="108" fill={COLORS.secondaryLight} fontSize="8" fontWeight="600">3</text>
        </g>
      </g>

      {/* Annotation Pin 3 - Warning/highlight style */}
      <g className="transition-transform duration-500 group-hover:-translate-y-1" style={{ transitionDelay: "100ms" }}>
        {/* Connection line */}
        <path
          d="M 180 195 L 180 155"
          stroke={COLORS.primaryLight}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          strokeOpacity="0.5"
        />

        {/* Pin with pulse effect */}
        <circle
          cx="180"
          cy="198"
          r="6"
          fill={COLORS.primaryLight}
          filter="url(#anno-glow)"
          className="transition-transform duration-300 group-hover:scale-110"
          style={{ transformOrigin: "180px 198px" }}
        />
        <circle cx="180" cy="198" r="2.5" fill="hsl(240, 6%, 9%)" />

        {/* Exclamation indicator */}
        <circle cx="180" cy="145" r="12" fill={COLORS.primaryLight} fillOpacity="0.2" stroke={COLORS.primaryLight} strokeWidth="1" />
        <text x="180" y="150" fill={COLORS.primaryLight} fontSize="14" textAnchor="middle" fontWeight="700">!</text>
      </g>

      {/* Thread/conversation indicator */}
      <g className="transition-opacity duration-300 group-hover:opacity-100 opacity-60">
        <rect x="300" y="55" width="80" height="70" rx="6" fill="url(#anno-card)" stroke={COLORS.primary} strokeWidth="1" strokeOpacity="0.3" />
        {/* Mini conversation bubbles */}
        <rect x="308" y="63" width="50" height="14" rx="3" fill={COLORS.subtle} />
        <rect x="308" y="67" width="35" height="2" rx="1" fill={COLORS.muted} />
        <rect x="308" y="72" width="25" height="2" rx="1" fill={COLORS.muted} />

        <rect x="322" y="82" width="50" height="14" rx="3" fill={COLORS.primary} fillOpacity="0.15" />
        <rect x="327" y="86" width="30" height="2" rx="1" fill={COLORS.primary} fillOpacity="0.5" />
        <rect x="327" y="91" width="20" height="2" rx="1" fill={COLORS.primary} fillOpacity="0.3" />

        <rect x="308" y="101" width="45" height="14" rx="3" fill={COLORS.subtle} />
        <rect x="313" y="105" width="28" height="2" rx="1" fill={COLORS.muted} />
        <rect x="313" y="110" width="18" height="2" rx="1" fill={COLORS.muted} />
      </g>

      {/* Annotation count badge */}
      <g className="transition-all duration-300 group-hover:opacity-100 opacity-70">
        <rect x="45" y="55" width="55" height="28" rx="6" fill={COLORS.subtle} stroke={COLORS.primary} strokeWidth="1" strokeOpacity="0.3" />
        <circle cx="60" cy="69" r="8" fill={COLORS.primary} fillOpacity="0.2" />
        <text x="60" y="73" fill={COLORS.primary} fontSize="10" textAnchor="middle" fontWeight="700">3</text>
        <text x="85" y="73" fill={COLORS.muted} fontSize="10">Notes</text>
      </g>

      {/* Connected users indicator */}
      <g className="transition-opacity duration-300 group-hover:opacity-100 opacity-60">
        <circle cx="320" cy="240" r="12" fill={COLORS.primary} fillOpacity="0.2" stroke={COLORS.primary} strokeWidth="1" />
        <circle cx="340" cy="240" r="12" fill={COLORS.secondary} fillOpacity="0.2" stroke={COLORS.secondary} strokeWidth="1" />
        <circle cx="360" cy="240" r="12" fill={COLORS.primaryLight} fillOpacity="0.2" stroke={COLORS.primaryLight} strokeWidth="1" />
        <text x="320" y="244" fill={COLORS.primary} fontSize="9" textAnchor="middle" fontWeight="600">JR</text>
        <text x="340" y="244" fill={COLORS.secondary} fontSize="9" textAnchor="middle" fontWeight="600">MK</text>
        <text x="360" y="244" fill={COLORS.primaryLight} fontSize="9" textAnchor="middle" fontWeight="600">+2</text>
      </g>
    </svg>
  );
};

// Export all illustrations
export const FeatureIllustrations = {
  Viewer: ViewerIllustration,
  Measurement: MeasurementIllustration,
  Annotations: AnnotationsIllustration,
};

export default FeatureIllustrations;
