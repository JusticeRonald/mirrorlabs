import * as THREE from 'three';

export type MeasurementType = 'distance' | 'area' | 'angle';
export type AnnotationType = 'pin' | 'comment' | 'markup';
export type ViewMode = 'solid' | 'wireframe' | 'points';
export type NavigationTool = 'pan' | 'orbit' | 'zoom';

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
  createdAt: string;
  createdBy: string;
  replies?: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface ViewerState {
  activeTool: string | null;
  viewMode: ViewMode;
  showGrid: boolean;
  showMeasurements: boolean;
  showAnnotations: boolean;
  selectedObjectId: string | null;
  measurements: Measurement[];
  annotations: Annotation[];

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
  selectedObjectId: null,
  measurements: [],
  annotations: [],

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
  { id: 'pan', name: 'Pan', icon: 'Hand', group: 'navigate', shortcut: 'P' },
  { id: 'orbit', name: 'Orbit', icon: 'RotateCcw', group: 'navigate', shortcut: 'O' },
  { id: 'zoom', name: 'Zoom', icon: 'ZoomIn', group: 'navigate', shortcut: 'Z' },
  { id: 'reset', name: 'Reset View', icon: 'Maximize', group: 'navigate', shortcut: 'R' },

  // Measure
  { id: 'distance', name: 'Distance', icon: 'Ruler', group: 'measure', requiresPermission: 'canMeasure', shortcut: 'D' },
  { id: 'area', name: 'Area', icon: 'Square', group: 'measure', requiresPermission: 'canMeasure', shortcut: 'A' },
  { id: 'angle', name: 'Angle', icon: 'Triangle', group: 'measure', requiresPermission: 'canMeasure' },

  // Annotate
  { id: 'pin', name: 'Pin', icon: 'MapPin', group: 'annotate', requiresPermission: 'canAnnotate' },
  { id: 'comment', name: 'Comment', icon: 'MessageSquare', group: 'annotate', requiresPermission: 'canAnnotate', shortcut: 'C' },

  // View
  { id: 'wireframe', name: 'Wireframe', icon: 'Box', group: 'view', shortcut: 'W' },
  { id: 'section', name: 'Section', icon: 'Scissors', group: 'view' },
  { id: 'layers', name: 'Layers', icon: 'Layers', group: 'view', shortcut: 'L' },

  // Export
  { id: 'download', name: 'Download', icon: 'Download', group: 'export', requiresPermission: 'canExport' },
  { id: 'share', name: 'Share', icon: 'Share2', group: 'export', requiresPermission: 'canShare' },
];
