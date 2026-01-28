/**
 * Custom SVG cursor constants for the 3D viewer.
 *
 * CURSOR_PLACEMENT — plus/crosshair icon shown when a placement tool (comment, pin,
 *   distance, area, angle) is active. Hotspot at center (12,12).
 *
 * CURSOR_TARGET — reticle icon shown when an annotation or measurement point
 *   is selected (click-to-relocate mode). Hotspot at center (12,12).
 */

function svgToCursor(svg: string, fallback: string): string {
  const encoded = encodeURIComponent(svg);
  return `url("data:image/svg+xml,${encoded}") 12 12, ${fallback}`;
}

// Placement cursor — plus/crosshair for creating new annotations/measurements
// Dual-layer: black outer stroke for border, white inner stroke for contrast
const PLACEMENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path fill="none" stroke="black" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M12 16v5m0-18v5m4 4h5M3 12h5m4 0h.01"/>
  <path fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v5m0-18v5m4 4h5M3 12h5m4 0h.01"/>
</svg>`;
export const CURSOR_PLACEMENT = svgToCursor(PLACEMENT_SVG, 'crosshair');

// Target / reticle cursor (selected state — click-to-relocate)
// 16×16 viewBox scaled to 24×24 cursor size, black stroke border + white fill
const TARGET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16">
  <path fill="white" stroke="black" stroke-width="0.8" paint-order="stroke" d="M5.822 1.874a.5.5 0 1 1 .335.942a5.52 5.52 0 0 0-3.34 3.341a.5.5 0 1 1-.943-.335a6.52 6.52 0 0 1 3.948-3.948M1.864 10.15a.5.5 0 1 1 .944-.33a5.52 5.52 0 0 0 3.365 3.37a.5.5 0 0 1-.333.943a6.52 6.52 0 0 1-3.976-3.983m8.302 3.981a.5.5 0 1 1-.333-.943a5.52 5.52 0 0 0 3.347-3.332a.5.5 0 1 1 .941.337a6.52 6.52 0 0 1-3.955 3.938m3.968-8.285a.5.5 0 1 1-.943.331A5.52 5.52 0 0 0 9.85 2.82a.5.5 0 0 1 .337-.942a6.52 6.52 0 0 1 3.946 3.968M8.5 3.5a.5.5 0 0 1-1 0V.997a.5.5 0 0 1 1 0zm-4.997 4a.5.5 0 0 1 0 1H1a.5.5 0 0 1 0-1zM7.5 12.497a.5.5 0 0 1 1 0V15a.5.5 0 1 1-1 0zM12.497 8.5a.5.5 0 0 1 0-1H15a.5.5 0 1 1 0 1zM8 9a1 1 0 1 1 0-2a1 1 0 0 1 0 2"/>
</svg>`;
export const CURSOR_TARGET = svgToCursor(TARGET_SVG, 'crosshair');

// Move-arrows cursor (gizmo drag state)
const GIZMO_DRAG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-1 -1 18 18"><path fill="white" stroke="black" stroke-width="1.5" paint-order="stroke" d="M2.15 5.15a.5.5 0 1 1 .708.708l-1.15 1.15h2.79a.5.5 0 0 1 .5.5a.5.5 0 0 1-.5.5h-2.79l1.15 1.15a.5.5 0 1 1-.708.708l-2-2a.5.5 0 0 1-.147-.354a.5.5 0 0 1 .147-.354l2-2zm5-5a.5.5 0 0 1 .354-.147a.5.5 0 0 1 .354.147l2 2q.07.071.109.162c.039.091.038.126.038.192a.503.503 0 0 1-.693.463a.5.5 0 0 1-.162-.109L8 1.708v2.79a.5.5 0 0 1-.5.5a.5.5 0 0 1-.5-.5v-2.79l-1.15 1.15a.5.5 0 1 1-.708-.708l2-2zm5.71 5a.5.5 0 1 0-.708.708l1.15 1.15h-2.79a.5.5 0 0 0-.5.5a.5.5 0 0 0 .5.5h2.79l-1.15 1.15a.5.5 0 1 0 .708.708l2-2a.5.5 0 0 0 .147-.354a.5.5 0 0 0-.147-.354l-2-2zM8.01 13.3v-2.79a.5.5 0 0 0-.5-.5a.5.5 0 0 0-.5.5v2.79l-1.15-1.15a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .354.147a.5.5 0 0 0 .354-.147l2-2a.5.5 0 1 0-.708-.708l-1.15 1.15z"/></svg>`;

export const CURSOR_GIZMO_DRAG = svgToCursor(GIZMO_DRAG_SVG, 'move');
