import * as THREE from 'three';

/**
 * Splat orientation in Euler angles (radians)
 * @deprecated Use SplatTransform instead for full transform support
 */
export interface SplatOrientation {
  x: number;  // radians
  y: number;
  z: number;
}

/**
 * 3D vector for position and scale
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Full transform for splat mesh (position, rotation, scale)
 */
export interface SplatTransform {
  position: Vector3D;
  rotation: Vector3D;  // Euler angles in radians
  scale: Vector3D;
}

/**
 * Transform modes for the gizmo
 */
export type TransformMode = 'translate' | 'rotate' | 'scale';

/**
 * Active axis being manipulated by the transform gizmo
 * Matches TransformControls.axis values from Three.js
 */
export type TransformAxis = 'X' | 'Y' | 'Z' | 'XY' | 'XZ' | 'YZ' | 'XYZ' | null;

/**
 * Default transform: 180° X-axis rotation to fix common coordinate convention issues
 * (e.g., SuperSplat/NeRF conventions vs Three.js Y-up convention)
 */
export const DEFAULT_SPLAT_TRANSFORM: SplatTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: Math.PI, y: 0, z: 0 },  // 180° X-axis rotation
  scale: { x: 1, y: 1, z: 1 },
};

/**
 * Default orientation: 180° X-axis rotation to fix common coordinate convention issues
 * (e.g., SuperSplat/NeRF conventions vs Three.js Y-up convention)
 * @deprecated Use DEFAULT_SPLAT_TRANSFORM instead
 */
export const DEFAULT_SPLAT_ORIENTATION: SplatOrientation = {
  x: Math.PI,  // 180° X-axis rotation
  y: 0,
  z: 0,
};

/**
 * Convert legacy SplatOrientation to full SplatTransform
 */
export function orientationToTransform(orientation: SplatOrientation): SplatTransform {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: orientation.x, y: orientation.y, z: orientation.z },
    scale: { x: 1, y: 1, z: 1 },
  };
}

/**
 * Extract orientation from SplatTransform (for backward compatibility)
 */
export function transformToOrientation(transform: SplatTransform): SplatOrientation {
  return {
    x: transform.rotation.x,
    y: transform.rotation.y,
    z: transform.rotation.z,
  };
}

/**
 * Check if stored data is legacy orientation or full transform
 */
export function isLegacyOrientation(data: unknown): data is SplatOrientation {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.z === 'number' &&
    !('position' in obj) &&
    !('rotation' in obj) &&
    !('scale' in obj)
  );
}

/**
 * Check if stored data is full SplatTransform
 */
export function isSplatTransform(data: unknown): data is SplatTransform {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.position === 'object' &&
    typeof obj.rotation === 'object' &&
    typeof obj.scale === 'object'
  );
}

export type MeasurementType = 'distance' | 'area' | 'angle';
export type AnnotationType = 'pin' | 'comment' | 'markup';
export type AnnotationStatus = 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived';
export type MarkupToolType = 'freehand' | 'circle' | 'rectangle' | 'arrow' | 'cloud' | 'text' | null;
export type ViewMode = 'solid' | 'wireframe' | 'points';
export type CollaborationTab = 'annotations' | 'measurements' | 'views';

/**
 * Supported splat file formats
 */
export type SplatFileFormat = 'ply' | 'spz' | 'splat' | 'ksplat' | 'pcsogs';

/**
 * Loading state for splat files
 */
export type SplatLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Metadata about a loaded splat scene
 */
export interface SplatSceneMetadata {
  splatCount: number;
  boundingBox: THREE.Box3 | null;
  fileType: string;
  loadTimeMs: number;
  url: string;
}

/**
 * Progress information during splat loading
 */
export interface SplatLoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Error information for splat loading failures
 */
export interface SplatLoadError {
  message: string;
  code?: string;
  url?: string;
}

export interface Measurement {
  id: string;
  type: MeasurementType;
  points: THREE.Vector3[];
  value: number;
  unit: string;
  label?: string;
  createdAt: string;
  createdBy: string;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  position: THREE.Vector3;
  content: string;
  status: AnnotationStatus;
  createdAt: string;
  createdBy: string;
  /** Display name of the creator (resolved from profile) */
  createdByName?: string;
  replies?: AnnotationReply[];
  /** Camera position when annotation was created (for fly-to) */
  cameraSnapshot?: CameraState;
}

export interface AnnotationReply {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  /** Display name of the creator (resolved from profile) */
  createdByName?: string;
}

/**
 * Camera position and orientation for saved views
 */
export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
}

/**
 * A saved camera view (waypoint)
 */
export interface SavedView {
  id: string;
  scanId: string;
  name: string;
  camera: CameraState;
  thumbnail?: string;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
}

/**
 * Pending measurement being created (multi-point collection)
 */
export interface PendingMeasurement {
  type: 'distance' | 'area';
  points: THREE.Vector3[];
}

/**
 * Selected measurement point for editing (shows gizmo at point location)
 */
export interface SelectedMeasurementPoint {
  measurementId: string;
  pointIndex: number; // 0 = start, 1 = end (for distance), 0..n for area
}

/**
 * Supported measurement units
 */
export type MeasurementUnit = 'ft' | 'm' | 'in' | 'cm';

export interface ViewerState {
  activeTool: string | null;
  viewMode: ViewMode;
  showGrid: boolean;
  showMeasurements: boolean;
  showAnnotations: boolean;
  showSavedViews: boolean;
  selectedObjectId: string | null;
  measurements: Measurement[];
  annotations: Annotation[];
  savedViews: SavedView[];
  activeSavedViewId: string | null;

  // Collaboration panel state
  isCollaborationPanelOpen: boolean;
  activeCollaborationTab: CollaborationTab;

  // Annotation state
  selectedAnnotationId: string | null;
  hoveredAnnotationId: string | null;
  isAnnotationPanelOpen: boolean;
  isAnnotationModalOpen: boolean;
  pendingAnnotationPosition: THREE.Vector3 | null;

  // Measurement state
  pendingMeasurement: PendingMeasurement | null;
  selectedMeasurementId: string | null;
  hoveredMeasurementId: string | null;
  measurementUnit: MeasurementUnit;
  selectedMeasurementPoint: SelectedMeasurementPoint | null;

  // Markup state
  activeMarkupTool: MarkupToolType;
  isDrawingMode: boolean;

  // Splat loading state
  splatLoadingState: SplatLoadingState;
  splatLoadProgress: SplatLoadProgress | null;
  splatLoadError: SplatLoadError | null;
  splatMetadata: SplatSceneMetadata | null;
}

export interface ViewerSettings {
  backgroundColor: string;
  gridColor: string;
  gridSize: number;
  gridDivisions: number;
  enableShadows: boolean;
  enableAntialiasing: boolean;
}

export const defaultViewerSettings: ViewerSettings = {
  backgroundColor: '#0f0f10',
  gridColor: '#FBBF24',
  gridSize: 20,
  gridDivisions: 20,
  enableShadows: true,
  enableAntialiasing: true,
};

export const defaultViewerState: ViewerState = {
  activeTool: null,
  viewMode: 'solid',
  showGrid: true,
  showMeasurements: true,
  showAnnotations: true,
  showSavedViews: true,
  selectedObjectId: null,
  measurements: [],
  annotations: [],
  savedViews: [],
  activeSavedViewId: null,

  // Collaboration panel state
  isCollaborationPanelOpen: false,
  activeCollaborationTab: 'annotations',

  // Annotation state
  selectedAnnotationId: null,
  hoveredAnnotationId: null,
  isAnnotationPanelOpen: false,
  isAnnotationModalOpen: false,
  pendingAnnotationPosition: null,

  // Measurement state
  pendingMeasurement: null,
  selectedMeasurementId: null,
  hoveredMeasurementId: null,
  measurementUnit: 'ft', // Default to feet (US construction standard)
  selectedMeasurementPoint: null,

  // Markup state
  activeMarkupTool: null,
  isDrawingMode: false,

  // Splat loading state
  splatLoadingState: 'idle',
  splatLoadProgress: null,
  splatLoadError: null,
  splatMetadata: null,
};

// Tool definitions for the viewer toolbar
export interface ToolDefinition {
  id: string;
  name: string;
  icon: string;
  group: 'navigate' | 'measure' | 'annotate' | 'view' | 'export';
  requiresPermission?: 'canMeasure' | 'canAnnotate' | 'canExport' | 'canShare';
  shortcut?: string;
}

export const viewerTools: ToolDefinition[] = [
  // Navigate
  { id: 'reset', name: 'Reset View', icon: 'Maximize', group: 'navigate', shortcut: 'V' },

  // Measure
  { id: 'distance', name: 'Distance', icon: 'Ruler', group: 'measure', requiresPermission: 'canMeasure', shortcut: 'D' },
  { id: 'area', name: 'Area', icon: 'Square', group: 'measure', requiresPermission: 'canMeasure', shortcut: 'A' },

  // Annotate
  { id: 'pin', name: 'Pin', icon: 'MapPin', group: 'annotate', requiresPermission: 'canAnnotate' },
  { id: 'comment', name: 'Comment', icon: 'MessageSquare', group: 'annotate', requiresPermission: 'canAnnotate', shortcut: 'C' },

  // View
  { id: 'wireframe', name: 'Wireframe', icon: 'Box', group: 'view', shortcut: 'W' },
  { id: 'grid', name: 'Toggle Grid', icon: 'Grid3X3', group: 'view', shortcut: 'T' },

  // Export
  { id: 'download', name: 'Download', icon: 'Download', group: 'export', requiresPermission: 'canExport' },
  { id: 'share', name: 'Share', icon: 'Share2', group: 'export', requiresPermission: 'canShare' },
];
