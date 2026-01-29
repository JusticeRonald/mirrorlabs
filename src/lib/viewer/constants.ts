/**
 * Constants for the 3D viewer
 *
 * Centralizes magic numbers and repeated values to improve maintainability
 * and make the codebase easier to understand at a glance.
 */

// ─── Interaction Thresholds ─────────────────────────────────────────────────

/** Maximum time between clicks to register as double-click (milliseconds) */
export const DOUBLE_CLICK_THRESHOLD_MS = 300;

/** Maximum pixels moved during click to still register as click (not drag) */
export const CLICK_DRAG_THRESHOLD_PX = 3;

// ─── Transform Controls ─────────────────────────────────────────────────────

/** Size of the transform gizmo (TransformControls.setSize) */
export const GIZMO_SIZE = 0.75;

/** Translation snap increment when Shift is held (meters) */
export const SHIFT_TRANSLATION_SNAP = 0.1;

/** Rotation snap increment when Shift is held (radians, 10 degrees) */
export const SHIFT_ROTATION_SNAP = Math.PI / 18;

/** Scale snap increment when Shift is held (10%) */
export const SHIFT_SCALE_SNAP = 0.1;

// ─── Camera Defaults ────────────────────────────────────────────────────────

/** Default camera field of view (degrees) */
export const DEFAULT_CAMERA_FOV = 50;

/** Default camera near clipping plane */
export const DEFAULT_CAMERA_NEAR = 0.1;

/** Default camera far clipping plane */
export const DEFAULT_CAMERA_FAR = 1000;

/** Padding multiplier when fitting camera to bounding box */
export const CAMERA_FIT_PADDING = 1.5;

// ─── Controls ───────────────────────────────────────────────────────────────

/** OrbitControls damping factor for smooth camera movement */
export const ORBIT_DAMPING_FACTOR = 0.05;

/** Maximum polar angle for OrbitControls (95% of PI to avoid gimbal lock) */
export const ORBIT_MAX_POLAR_ANGLE = Math.PI * 0.95;

/** Minimum zoom distance for OrbitControls */
export const ORBIT_MIN_DISTANCE = 0.1;

/** Maximum zoom distance for OrbitControls */
export const ORBIT_MAX_DISTANCE = 500;

// ─── Lighting ───────────────────────────────────────────────────────────────

/** Ambient light intensity */
export const AMBIENT_LIGHT_INTENSITY = 0.6;

/** Primary directional light intensity */
export const DIRECTIONAL_LIGHT_INTENSITY = 1;

/** Secondary directional light intensity */
export const DIRECTIONAL_LIGHT_SECONDARY_INTENSITY = 0.3;

/** Hemisphere light intensity (for sky/ground lighting) */
export const HEMISPHERE_LIGHT_INTENSITY = 0.3;

// ─── Grid ───────────────────────────────────────────────────────────────────

/** Grid helper size (units) */
export const GRID_SIZE = 20;

/** Grid divisions (lines per axis) */
export const GRID_DIVISIONS = 20;

/** Grid primary line color (darker gray) */
export const GRID_COLOR_PRIMARY = 0x444444;

/** Grid secondary line color (lighter gray) */
export const GRID_COLOR_SECONDARY = 0x333333;

/** X-axis line color (red) */
export const AXIS_COLOR_X = 0xff4444;

/** Z-axis line color (blue) */
export const AXIS_COLOR_Z = 0x4444ff;

// ─── Placement Tools ────────────────────────────────────────────────────────

/**
 * Tools that place points on the splat surface.
 * Used to determine cursor style and enable magnifier loupe.
 */
export const PLACEMENT_TOOLS = ['comment', 'pin', 'distance', 'area', 'angle'] as const;
export type PlacementTool = typeof PLACEMENT_TOOLS[number];

/**
 * Check if a tool is a placement tool
 */
export function isPlacementTool(tool: string | null): tool is PlacementTool {
  return tool !== null && PLACEMENT_TOOLS.includes(tool as PlacementTool);
}

// ─── Right-click Area Confirm ───────────────────────────────────────────────

/** Maximum duration for right-click tap to confirm area measurement (milliseconds) */
export const RIGHT_CLICK_CONFIRM_MS = 200;

/** Maximum pixels moved for right-click tap to confirm (distinguishes from pan) */
export const RIGHT_CLICK_MOVE_THRESHOLD = 3;

// ─── Measurement ────────────────────────────────────────────────────────────

/** Snap threshold for closing area polygon (~8cm / ~3 inches) */
export const AREA_SNAP_THRESHOLD = 0.08;
