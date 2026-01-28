import * as THREE from 'three';
import {
  SparkRenderer as SparkRendererCore,
  SplatMesh,
  SplatFileType
} from '@sparkjsdev/spark';
import type {
  GaussianSplatRenderer,
  SplatMetadata,
  SplatLoadProgress,
  SplatLoadOptions
} from './GaussianSplatRenderer';
import { DEFAULT_SPLAT_ORIENTATION, DEFAULT_SPLAT_TRANSFORM, type SplatOrientation, type SplatTransform, type SplatViewMode } from '@/types/viewer';
import { SplatVisualizationOverlay } from '@/lib/viewer/SplatVisualizationOverlay';

/**
 * Spark-based implementation of GaussianSplatRenderer.
 * Uses @sparkjsdev/spark for high-performance Gaussian Splat rendering.
 */
export class SparkSplatRenderer implements GaussianSplatRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private sparkRenderer: SparkRendererCore | null = null;
  private splatMesh: SplatMesh | null = null;
  private metadata: SplatMetadata | null = null;
  private clock: THREE.Clock;
  private currentViewMode: SplatViewMode = 'model';
  private overlay: SplatVisualizationOverlay | null = null;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.clock = new THREE.Clock();

    // Note: WASM initialization is handled internally by Spark library when first SplatMesh is created
    // Manual staticInitialize() was causing "failed to match magic number" errors
    this.initializeSparkRenderer();
  }

  private initializeSparkRenderer(): void {
    // Create the Spark renderer with the WebGL renderer
    this.sparkRenderer = new SparkRendererCore({
      renderer: this.renderer,
      autoUpdate: true,
      premultipliedAlpha: true,
    });

    // Add the Spark renderer to the scene (it's a THREE.Mesh)
    this.scene.add(this.sparkRenderer);
  }

  async loadFromUrl(
    url: string,
    onProgress?: (progress: SplatLoadProgress) => void,
    options?: SplatLoadOptions
  ): Promise<SplatMetadata> {
    const startTime = performance.now();

    // Dispose of any existing splat mesh
    if (this.splatMesh) {
      this.scene.remove(this.splatMesh);
      this.splatMesh.dispose();
      this.splatMesh = null;
    }

    // Determine file type from URL
    const fileType = this.getFileTypeFromUrl(url);

    // Track if an error occurred during loading
    let loadError: Error | null = null;

    // Create a new SplatMesh with the URL
    this.splatMesh = new SplatMesh({
      url,
      fileType,
      onLoad: () => {
        // Loading complete - progress is 100%
        onProgress?.({
          loaded: 1,
          total: 1,
          percentage: 100,
        });
      },
      onError: (error: unknown) => {
        loadError = error instanceof Error ? error : new Error(String(error));
      },
    });

    // Add the splat mesh to the scene
    this.scene.add(this.splatMesh);

    // Apply initial transform (full transform takes precedence over legacy orientation)
    if (options?.initialTransform) {
      const t = options.initialTransform;
      this.splatMesh.position.set(t.position.x, t.position.y, t.position.z);
      this.splatMesh.rotation.set(t.rotation.x, t.rotation.y, t.rotation.z, 'XYZ');
      this.splatMesh.scale.set(t.scale.x, t.scale.y, t.scale.z);
    } else {
      // Apply initial orientation (defaults to 180° X-axis rotation to fix common convention issues)
      const orientation = options?.initialOrientation ?? DEFAULT_SPLAT_ORIENTATION;
      this.splatMesh.rotation.set(orientation.x, orientation.y, orientation.z, 'XYZ');
    }

    // Simulate progress while loading (since Spark doesn't expose download progress)
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    if (onProgress) {
      let simulatedProgress = 0;
      progressInterval = setInterval(() => {
        // Gradually increase progress, slowing down as we approach 90%
        const remaining = 90 - simulatedProgress;
        simulatedProgress += Math.max(1, remaining * 0.1);
        simulatedProgress = Math.min(simulatedProgress, 90);
        onProgress({
          loaded: simulatedProgress,
          total: 100,
          percentage: Math.round(simulatedProgress),
        });
      }, 500);
    }

    // Wait for initialization with timeout to prevent infinite hang
    const timeoutMs = 120000; // 120 second timeout for large files
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Splat loading timed out after ${timeoutMs / 1000} seconds`)), timeoutMs)
    );

    try {
      await Promise.race([this.splatMesh.initialized, timeoutPromise]);
    } finally {
      // Always clear the progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }

    // Check if an error occurred during loading
    if (loadError) {
      throw loadError;
    }

    // Calculate metadata
    const loadTimeMs = performance.now() - startTime;
    const boundingBox = this.splatMesh.getBoundingBox();
    const splatCount = this.splatMesh.packedSplats?.numSplats ?? 0;

    this.metadata = {
      splatCount,
      boundingBox,
      fileType: fileType ?? 'unknown',
      loadTimeMs,
    };

    return this.metadata;
  }

  private getFileTypeFromUrl(url: string): SplatFileType | undefined {
    const extension = url.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'ply':
        return SplatFileType.PLY;
      case 'spz':
        return SplatFileType.SPZ;
      case 'splat':
        return SplatFileType.SPLAT;
      case 'ksplat':
        return SplatFileType.KSPLAT;
      default:
        // Let Spark auto-detect
        return undefined;
    }
  }

  getMesh(): THREE.Object3D | null {
    return this.splatMesh;
  }

  getSplatCount(): number {
    return this.metadata?.splatCount ?? 0;
  }

  getBoundingBox(): THREE.Box3 | null {
    if (!this.splatMesh) return null;
    return this.splatMesh.getBoundingBox();
  }

  isLoaded(): boolean {
    return this.splatMesh?.isInitialized ?? false;
  }

  update(_camera: THREE.Camera, _deltaTime: number): void {
    // With autoUpdate: true, SparkRenderer automatically updates during renderer.render()
    // No manual update needed - the incorrect viewToWorld parameter was causing render issues
  }

  setOrientation(orientation: SplatOrientation): void {
    if (this.splatMesh) {
      this.splatMesh.rotation.set(orientation.x, orientation.y, orientation.z, 'XYZ');
    }
  }

  getOrientation(): SplatOrientation | null {
    if (!this.splatMesh) return null;
    return {
      x: this.splatMesh.rotation.x,
      y: this.splatMesh.rotation.y,
      z: this.splatMesh.rotation.z,
    };
  }

  setTransform(transform: SplatTransform): void {
    if (this.splatMesh) {
      this.splatMesh.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
      this.splatMesh.rotation.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
        'XYZ'
      );
      this.splatMesh.scale.set(
        transform.scale.x,
        transform.scale.y,
        transform.scale.z
      );
    }
  }

  getTransform(): SplatTransform | null {
    if (!this.splatMesh) return null;
    return {
      position: {
        x: this.splatMesh.position.x,
        y: this.splatMesh.position.y,
        z: this.splatMesh.position.z,
      },
      rotation: {
        x: this.splatMesh.rotation.x,
        y: this.splatMesh.rotation.y,
        z: this.splatMesh.rotation.z,
      },
      scale: {
        x: this.splatMesh.scale.x,
        y: this.splatMesh.scale.y,
        z: this.splatMesh.scale.z,
      },
    };
  }

  setSplatViewMode(mode: SplatViewMode): void {
    if (!this.splatMesh || mode === this.currentViewMode) return;

    this.currentViewMode = mode;

    // Lazy-init the overlay
    if (!this.overlay) {
      this.overlay = new SplatVisualizationOverlay(this.scene);
    }

    switch (mode) {
      case 'model':
        // Restore original splat rendering, hide all overlays
        this.splatMesh.visible = true;
        this.overlay.hideCenters();
        break;

      case 'pointcloud':
        // Hide splat rendering, show point-cloud overlay
        this.splatMesh.visible = false;
        if (!this.overlay.isCentersBuilt) {
          this.overlay.buildCenters(this.splatMesh);
        }
        this.overlay.syncTransform();
        this.overlay.showCenters();
        break;
    }
  }

  /**
   * Sync the overlay point cloud transform with the splat mesh.
   * Call every frame to keep the point cloud aligned during gizmo transforms.
   */
  updateOverlay(): void {
    this.overlay?.syncTransform();
  }

  dispose(): void {
    if (this.overlay) {
      this.overlay.dispose();
      this.overlay = null;
    }

    if (this.splatMesh) {
      this.scene.remove(this.splatMesh);
      this.splatMesh.dispose();
      this.splatMesh = null;
    }

    if (this.sparkRenderer) {
      this.scene.remove(this.sparkRenderer);
      this.sparkRenderer = null;
    }

    this.metadata = null;
  }
}

/**
 * Factory function to create a SparkSplatRenderer
 */
export function createSparkRenderer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): GaussianSplatRenderer {
  return new SparkSplatRenderer(renderer, scene);
}
