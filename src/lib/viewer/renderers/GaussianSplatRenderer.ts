import * as THREE from 'three';

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
 * Abstract interface for Gaussian Splat renderers.
 * This abstraction allows swapping rendering implementations
 * (e.g., Spark, custom WebGPU renderer) without changing application code.
 */
export interface GaussianSplatRenderer {
  /**
   * Load a splat scene from a URL
   * @param url URL to the splat file (PLY, SPZ, SOG, etc.)
   * @param onProgress Optional progress callback
   * @returns Promise that resolves with metadata when loading completes
   */
  loadFromUrl(
    url: string,
    onProgress?: (progress: SplatLoadProgress) => void
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
}

/**
 * Factory function type for creating renderers
 */
export type GaussianSplatRendererFactory = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
) => GaussianSplatRenderer;
