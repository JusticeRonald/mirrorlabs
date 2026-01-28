/**
 * Custom SVG cursor constants for the 3D viewer.
 *
 * CURSOR_TARGET — crosshair/target icon shown when an annotation or measurement point
 *   is selected (click-to-relocate mode). Hotspot at center (12,12).
 */

// Target / crosshair cursor (selected state)
const TARGET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="black"><circle cx="12" cy="12" r="10" stroke-width="3.5" fill="none"/><circle cx="12" cy="12" r="4" stroke-width="3.5" fill="none"/><line x1="12" y1="2" x2="12" y2="6" stroke-width="4"/><line x1="12" y1="18" x2="12" y2="22" stroke-width="4"/><line x1="2" y1="12" x2="6" y2="12" stroke-width="4"/><line x1="18" y1="12" x2="22" y2="12" stroke-width="4"/></g><g stroke="white"><circle cx="12" cy="12" r="10" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="4" stroke-width="1.5" fill="none"/><line x1="12" y1="2" x2="12" y2="6" stroke-width="2"/><line x1="12" y1="18" x2="12" y2="22" stroke-width="2"/><line x1="2" y1="12" x2="6" y2="12" stroke-width="2"/><line x1="18" y1="12" x2="22" y2="12" stroke-width="2"/></g></svg>`;

function svgToCursor(svg: string, fallback: string): string {
  const encoded = encodeURIComponent(svg);
  return `url("data:image/svg+xml,${encoded}") 12 12, ${fallback}`;
}

export const CURSOR_TARGET = svgToCursor(TARGET_SVG, 'crosshair');

// Move-arrows cursor (gizmo drag state)
const GIZMO_DRAG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-1 -1 18 18"><path fill="white" stroke="black" stroke-width="1.5" paint-order="stroke" d="M2.15 5.15a.5.5 0 1 1 .708.708l-1.15 1.15h2.79a.5.5 0 0 1 .5.5a.5.5 0 0 1-.5.5h-2.79l1.15 1.15a.5.5 0 1 1-.708.708l-2-2a.5.5 0 0 1-.147-.354a.5.5 0 0 1 .147-.354l2-2zm5-5a.5.5 0 0 1 .354-.147a.5.5 0 0 1 .354.147l2 2q.07.071.109.162c.039.091.038.126.038.192a.503.503 0 0 1-.693.463a.5.5 0 0 1-.162-.109L8 1.708v2.79a.5.5 0 0 1-.5.5a.5.5 0 0 1-.5-.5v-2.79l-1.15 1.15a.5.5 0 1 1-.708-.708l2-2zm5.71 5a.5.5 0 1 0-.708.708l1.15 1.15h-2.79a.5.5 0 0 0-.5.5a.5.5 0 0 0 .5.5h2.79l-1.15 1.15a.5.5 0 1 0 .708.708l2-2a.5.5 0 0 0 .147-.354a.5.5 0 0 0-.147-.354l-2-2zM8.01 13.3v-2.79a.5.5 0 0 0-.5-.5a.5.5 0 0 0-.5.5v2.79l-1.15-1.15a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .354.147a.5.5 0 0 0 .354-.147l2-2a.5.5 0 1 0-.708-.708l-1.15 1.15z"/></svg>`;

export const CURSOR_GIZMO_DRAG = svgToCursor(GIZMO_DRAG_SVG, 'move');
