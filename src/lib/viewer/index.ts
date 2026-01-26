// Scene management
export { SceneManager } from './SceneManager';

// Annotation system
export {
  AnnotationRenderer,
  STATUS_COLORS,
  type AnnotationData,
  type AnnotationStatus,
  type AnnotationType,
  type MarkerState,
  type MarkerConfig,
} from './AnnotationRenderer';

// Measurement system
export {
  MeasurementRenderer,
  MEASUREMENT_COLORS,
  type MeasurementData,
  type MeasurementState,
  type MeasurementConfig,
} from './MeasurementRenderer';

export {
  MeasurementCalculator,
  UNIT_DISPLAY,
  AREA_UNIT_DISPLAY,
  type MeasurementUnit,
} from './MeasurementCalculator';

// Picking system
export {
  SplatPickingSystem,
  type PickResult,
} from './SplatPickingSystem';

// Occlusion checking
export {
  OcclusionChecker,
  type OcclusionState,
} from './OcclusionChecker';

// Drawing / Markup
export {
  DrawingEngine,
  DEFAULT_STROKE_STYLE,
  type Point2D,
  type CameraSnapshot,
  type StrokeStyle,
  type MarkupTool,
  type Markup,
} from './DrawingEngine';

// Camera animation
export {
  CameraAnimator,
  EASING,
  type CameraState,
  type EasingFunction,
  type AnimationOptions,
} from './CameraAnimator';

// Annotation clustering
export {
  AnnotationClusterer,
  type AnnotationWithScreenPos,
  type AnnotationCluster,
} from './AnnotationClusterer';

// Renderers
export {
  SparkSplatRenderer,
  createSparkRenderer,
} from './renderers/SparkSplatRenderer';

export type {
  GaussianSplatRenderer,
  SplatMetadata,
  SplatLoadProgress,
  SplatLoadOptions,
} from './renderers/GaussianSplatRenderer';
