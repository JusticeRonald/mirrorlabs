import * as THREE from 'three';
import {
  SparkRenderer as SparkRendererCore,
  SplatMesh,
  SplatFileType
} from '@sparkjsdev/spark';
import type {
  GaussianSplatRenderer,
  SplatMetadata,
  SplatLoadProgress
} from './GaussianSplatRenderer';

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

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.clock = new THREE.Clock();
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
    onProgress?: (progress: SplatLoadProgress) => void
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

    // Fix orientation: rotate 180 degrees around X-axis to correct upside-down splats
    // This compensates for coordinate system differences (SuperSplat/NeRF conventions vs Three.js)

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

  dispose(): void {
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
