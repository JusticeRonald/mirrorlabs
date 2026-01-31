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

// ─── Polygon Offset ─────────────────────────────────────────────────────────

/** Polygon offset for outline/background elements (behind main lines) */
export const POLYGON_OFFSET_OUTLINE = { factor: -0.5, units: -0.5 };

/** Polygon offset for main lines and fills (pushed forward in depth) */
export const POLYGON_OFFSET_MAIN = { factor: -1.0, units: -1.0 };

// ─── Distance-Based Scaling ─────────────────────────────────────────────────

/**
 * Label scaling configuration for distance-based font size
 * Font size = base / cameraDistance, clamped to [minSize, maxSize]
 */
export const LABEL_SCALE = {
  /** Base divisor for distance calculation */
  base: 100,
  /** Minimum font size in pixels */
  minSize: 10,
  /** Maximum font size in pixels */
  maxSize: 14,
};

/**
 * Marker scaling configuration for distance-based icon size
 * Icon size = base / cameraDistance, clamped to [minSize, maxSize]
 */
export const MARKER_SCALE = {
  /** Base divisor for distance calculation */
  base: 150,
  /** Minimum icon size in pixels */
  minSize: 12,
  /** Maximum icon size in pixels */
  maxSize: 24,
};

// ─── Measurement Units ──────────────────────────────────────────────────────

/** Valid measurement unit values */
export const VALID_MEASUREMENT_UNITS = ['ft', 'm', 'in', 'cm'] as const;
export type ValidMeasurementUnit = typeof VALID_MEASUREMENT_UNITS[number];

/**
 * Check if a value is a valid measurement unit
 */
export function isValidMeasurementUnit(unit: string): unit is ValidMeasurementUnit {
  return VALID_MEASUREMENT_UNITS.includes(unit as ValidMeasurementUnit);
}

// ─── Performance ─────────────────────────────────────────────────────────────

/** Splat count threshold for performance warning (1 million splats) */
export const LARGE_SPLAT_COUNT_THRESHOLD = 1_000_000;

// ─── Cursor Picking Performance ─────────────────────────────────────────────

/**
 * Throttle interval for WASM raycasting during cursor tracking.
 * With predictive interpolation, we can raycast less frequently.
 *
 * Value: 4 = raycast every 4th frame = ~15Hz at 60fps
 * - Between raycasts, cursor position is predicted via surface plane interpolation
 * - This reduces CPU load from ~2ms/frame to ~0.5ms average
 * - User perceives smooth 60fps cursor movement
 */
export const PICK_THROTTLE_FRAMES = 4;

/**
 * Maximum time (ms) between real raycasts during cursor tracking.
 * Even if frame throttle hasn't elapsed, force a raycast after this time.
 * Ensures pick cache stays fresh during low-FPS scenarios.
 */
export const PICK_MAX_STALE_MS = 150;

/**
 * Maximum pointer movement (NDC units) before forcing a fresh raycast.
 * If cursor moves more than this since last raycast, interpolation may be inaccurate.
 * ~0.05 NDC ≈ ~25px at 1080p resolution
 */
export const PICK_INTERPOLATION_THRESHOLD = 0.05;

// ─── GPU Depth Picking ──────────────────────────────────────────────────────

/**
 * Whether to use GPU depth buffer picking (10-40x faster than WASM raycast).
 * When enabled, cursor tracking reads depth from GPU instead of raycasting.
 * Falls back to WASM raycast when depth read returns background.
 */
export const USE_GPU_DEPTH_PICKING = true;

/**
 * Depth value threshold for detecting background hits.
 * WebGL normalized depth: 0.0 = near, 1.0 = far.
 * Values >= this are considered "hit background / nothing".
 */
export const GPU_DEPTH_BACKGROUND_THRESHOLD = 0.9999;

// ─── Spatial Index ───────────────────────────────────────────────────────────

/**
 * Minimum opacity threshold for including splats in spatial index.
 * Splats below this opacity are excluded to reduce noise and improve performance.
 * Also used by SplatVisualizationOverlay for point cloud rendering.
 */
export const MIN_SPLAT_OPACITY_THRESHOLD = 0.15;
