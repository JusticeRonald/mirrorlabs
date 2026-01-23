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
    console.log('[SparkSplatRenderer] Constructor called');
    this.renderer = renderer;
    this.scene = scene;
    this.clock = new THREE.Clock();
    this.initializeSparkRenderer();
  }

  private initializeSparkRenderer(): void {
    console.log('[SparkSplatRenderer] Initializing SparkRenderer...');
    // Create the Spark renderer with the WebGL renderer
    this.sparkRenderer = new SparkRendererCore({
      renderer: this.renderer,
      autoUpdate: true,
      premultipliedAlpha: true,
    });
    console.log('[SparkSplatRenderer] SparkRendererCore created:', {
      isValid: !!this.sparkRenderer,
    });

    // Add the Spark renderer to the scene (it's a THREE.Mesh)
    this.scene.add(this.sparkRenderer);
    console.log('[SparkSplatRenderer] SparkRenderer added to scene');
  }

  async loadFromUrl(
    url: string,
    onProgress?: (progress: SplatLoadProgress) => void
  ): Promise<SplatMetadata> {
    const startTime = performance.now();
    console.log('[SparkSplatRenderer] Starting splat load from:', url);

    // Dispose of any existing splat mesh
    if (this.splatMesh) {
      console.log('[SparkSplatRenderer] Disposing existing splat mesh');
      this.scene.remove(this.splatMesh);
      this.splatMesh.dispose();
      this.splatMesh = null;
    }

    // Determine file type from URL
    const fileType = this.getFileTypeFromUrl(url);
    console.log('[SparkSplatRenderer] Detected file type:', fileType);

    // Track if an error occurred during loading
    let loadError: Error | null = null;

    // Create a new SplatMesh with the URL
    console.log('[SparkSplatRenderer] Creating SplatMesh with options:', { url, fileType });
    this.splatMesh = new SplatMesh({
      url,
      fileType,
      onLoad: () => {
        console.log('[SparkSplatRenderer] onLoad callback fired - loading complete');
        // Loading complete - progress is 100%
        onProgress?.({
          loaded: 1,
          total: 1,
          percentage: 100,
        });
      },
      onError: (error: unknown) => {
        console.error('[SparkSplatRenderer] onError callback fired:', error);
        loadError = error instanceof Error ? error : new Error(String(error));
      },
    });
    console.log('[SparkSplatRenderer] SplatMesh created:', {
      isValid: !!this.splatMesh,
      isInitialized: this.splatMesh.isInitialized,
    });

    // Add the splat mesh to the scene
    this.scene.add(this.splatMesh);

    // Fix orientation: rotate 180 degrees around X-axis to correct upside-down splats
    // This compensates for coordinate system differences (SuperSplat/NeRF conventions vs Three.js)
    this.splatMesh.rotation.x = Math.PI;

    console.log('[SparkSplatRenderer] SplatMesh added to scene with orientation fix, total children:', this.scene.children.length);

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
      console.log('[SparkSplatRenderer] Waiting for initialization (timeout:', timeoutMs / 1000, 'seconds)...');
      await Promise.race([this.splatMesh.initialized, timeoutPromise]);
      console.log('[SparkSplatRenderer] Initialization promise resolved, isInitialized:', this.splatMesh.isInitialized);
    } finally {
      // Always clear the progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }

    // Check if an error occurred during loading
    if (loadError) {
      console.error('[SparkSplatRenderer] Load failed with error:', loadError);
      throw loadError;
    }

    // Calculate metadata
    const loadTimeMs = performance.now() - startTime;
    const boundingBox = this.splatMesh.getBoundingBox();
    const splatCount = this.splatMesh.packedSplats?.numSplats ?? 0;

    console.log('[SparkSplatRenderer] Load complete:', {
      splatCount,
      loadTimeMs: Math.round(loadTimeMs),
      boundingBox: boundingBox ? {
        min: boundingBox.min.toArray(),
        max: boundingBox.max.toArray(),
      } : null,
      isInitialized: this.splatMesh.isInitialized,
    });

    // Validate that splats were actually loaded
    if (splatCount === 0) {
      console.warn('[SparkSplatRenderer] Warning: Splat file loaded but splatCount is 0');
    }

    // Validate bounding box - if empty or invalid, create a default one
    if (!boundingBox || boundingBox.isEmpty()) {
      console.warn('[SparkSplatRenderer] Warning: Bounding box is empty, using default bounds');
    }

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
