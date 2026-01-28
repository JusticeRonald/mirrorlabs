import * as THREE from 'three';
import type { SplatOrientation, SplatTransform, SplatViewMode } from '@/types/viewer';

/**
 * Metadata about a loaded splat scene
 */
export interface SplatMetadata {
  splatCount: number;
  boundingBox: THREE.Box3;
  fileType: string;
  loadTimeMs: number;
}

/**
 * Progress event during splat loading
 */
export interface SplatLoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Options for loading a splat file
 */
export interface SplatLoadOptions {
  /** Initial orientation to apply after loading (defaults to DEFAULT_SPLAT_ORIENTATION) */
  initialOrientation?: SplatOrientation;
  /** Initial full transform to apply after loading (takes precedence over initialOrientation) */
  initialTransform?: SplatTransform;
}

/**
 * Abstract interface for Gaussian Splat renderers.
 * This abstraction allows swapping rendering implementations
 * (e.g., Spark, custom WebGPU renderer) without changing application code.
 */
export interface GaussianSplatRenderer {
  /**
   * Load a splat scene from a URL
   * @param url URL to the splat file (PLY, SPZ, SOG, etc.)
   * @param onProgress Optional progress callback
   * @param options Optional load options (e.g., initial orientation)
   * @returns Promise that resolves with metadata when loading completes
   */
  loadFromUrl(
    url: string,
    onProgress?: (progress: SplatLoadProgress) => void,
    options?: SplatLoadOptions
  ): Promise<SplatMetadata>;

  /**
   * Get the Three.js object to add to the scene
   * Returns the renderable mesh/object for the splats
   */
  getMesh(): THREE.Object3D | null;

  /**
   * Get the splat count of the loaded scene
   */
  getSplatCount(): number;

  /**
   * Get the bounding box of the loaded scene
   */
  getBoundingBox(): THREE.Box3 | null;

  /**
   * Check if a scene is currently loaded
   */
  isLoaded(): boolean;

  /**
   * Dispose of all resources
   */
  dispose(): void;

  /**
   * Update the renderer (called each frame)
   * @param camera The active camera
   * @param deltaTime Time since last frame
   */
  update(camera: THREE.Camera, deltaTime: number): void;

  /**
   * Set the orientation (rotation) of the splat mesh
   * @param orientation Euler angles in radians
   * @deprecated Use setTransform instead for full transform support
   */
  setOrientation(orientation: SplatOrientation): void;

  /**
   * Get the current orientation of the splat mesh
   * @returns Current orientation or null if no mesh loaded
   * @deprecated Use getTransform instead for full transform support
   */
  getOrientation(): SplatOrientation | null;

  /**
   * Set the full transform (position, rotation, scale) of the splat mesh
   * @param transform The transform to apply
   */
  setTransform(transform: SplatTransform): void;

  /**
   * Get the current full transform of the splat mesh
   * @returns Current transform or null if no mesh loaded
   */
  getTransform(): SplatTransform | null;

  /**
   * Set the splat visualization mode (solid, centers, rings)
   * @param mode The visualization mode to apply
   */
  setSplatViewMode(mode: SplatViewMode): void;

  /**
   * Sync the overlay (point cloud) transform with the splat mesh.
   * Call every frame to keep overlays aligned during gizmo transforms.
   */
  updateOverlay?(): void;
}

/**
 * Factory function type for creating renderers
 */
export type GaussianSplatRendererFactory = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
) => GaussianSplatRenderer;
