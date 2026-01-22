import React from "react";

interface IconProps {
  className?: string;
}

// 3D Viewer icon - cube with perspective
export const ViewerIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

// Measure icon - ruler with measurement marks
export const MeasureIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10h18M3 14h18" />
    <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M6 8v8M18 8v8" />
    <path d="M10 10v4M14 10v4" />
  </svg>
);

// Annotate icon - pin with speech element
export const AnnotateIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="10" r="6" />
    <path d="M12 16v5" />
    <path d="M9 7h6M9 10h6M9 13h3" />
  </svg>
);

// Construction icon - building with crane element
export const ConstructionIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="10" width="8" height="11" rx="1" />
    <rect x="13" y="6" width="8" height="15" rx="1" />
    <path d="M6 14h2M6 17h2M16 10h2M16 13h2M16 16h2" />
    <path d="M7 10V7l4-3" />
  </svg>
);

// Real Estate icon - house with window
export const RealEstateIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12l9-8 9 8" />
    <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
    <rect x="9" y="14" width="6" height="7" />
    <rect x="10" y="10" width="4" height="3" />
  </svg>
);

// Hospitality icon - bed/hotel
export const HospitalityIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6" />
    <path d="M3 18h18" />
    <path d="M5 10V6a2 2 0 012-2h10a2 2 0 012 2v4" />
    <circle cx="8" cy="8" r="1.5" />
    <path d="M3 18v3M21 18v3" />
  </svg>
);

// Forensics icon - shield with magnifier
export const ForensicsIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 4v6c0 5.5-3.8 10.3-8 12-4.2-1.7-8-6.5-8-12V6l8-4z" />
    <circle cx="11" cy="11" r="3" />
    <path d="M13.5 13.5L16 16" />
  </svg>
);

// Insurance icon - document with checkmark
export const InsuranceIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
    <path d="M14 2v6h6" />
    <path d="M9 15l2 2 4-4" />
  </svg>
);

// Share icon - nodes connected
export const ShareIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
  </svg>
);

// Capture icon - camera/scan element
export const CaptureIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <circle cx="12" cy="13" r="4" />
    <path d="M8 3h8" />
    <circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

// Collaborate icon - people/team element
export const CollaborateIcon: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
    <path d="M17 14a3 3 0 013 3v4" />
  </svg>
);

// Export all icons
export const Icons = {
  Viewer: ViewerIcon,
  Measure: MeasureIcon,
  Annotate: AnnotateIcon,
  Construction: ConstructionIcon,
  RealEstate: RealEstateIcon,
  Hospitality: HospitalityIcon,
  Forensics: ForensicsIcon,
  Insurance: InsuranceIcon,
  Share: ShareIcon,
  Capture: CaptureIcon,
  Collaborate: CollaborateIcon,
};
