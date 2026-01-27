/**
 * Custom SVG cursor constants for the 3D viewer.
 *
 * CURSOR_TARGET — crosshair/target icon shown when an annotation or measurement point
 *   is selected (click-to-relocate mode). Hotspot at center (12,12).
 */

// Target / crosshair cursor (selected state)
const TARGET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="4" stroke="white" stroke-width="1.5" fill="none"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`;

function svgToCursor(svg: string, fallback: string): string {
  const encoded = encodeURIComponent(svg);
  return `url("data:image/svg+xml,${encoded}") 12 12, ${fallback}`;
}

export const CURSOR_TARGET = svgToCursor(TARGET_SVG, 'crosshair');
