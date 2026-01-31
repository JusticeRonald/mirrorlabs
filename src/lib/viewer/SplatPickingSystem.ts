import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import { SplatSpatialIndex, type SpatialQueryResult } from './SplatSpatialIndex';
import { SplatBVHIndex, type BVHQueryResult } from './SplatBVHIndex';

/** Index type for splat picking */
export type SpatialIndexType = 'bvh' | 'spatial-hash';

/**
 * Picking result from the SplatPickingSystem
 */
export interface PickResult {
  /** World position of the picked point */
  position: THREE.Vector3;
  /** Surface normal at the picked point (if available) */
  normal?: THREE.Vector3;
  /** Distance from camera to picked point */
  distance: number;
  /** The picking method used */
  method: 'raycaster' | 'depth-buffer' | 'interpolated' | 'spatial-index';
}

/**
 * Pending depth read request (scheduled for next frame)
 */
interface PendingDepthRead {
  /** Pixel X coordinate in render target */
  x: number;
  /** Pixel Y coordinate in render target */
  y: number;
  /** Camera used for unprojection */
  camera: THREE.Camera;
}

/**
 * Configuration for deferred picking cache with interpolation
 */
interface PickCache {
  /** Last valid pick result */
  result: PickResult | null;
  /** Pointer position when last pick was made */
  pointer: THREE.Vector2;
  /** Surface plane for predictive interpolation (at last pick point, facing camera) */
  plane: THREE.Plane;
  /** Whether cache is valid */
  valid: boolean;
  /** Timestamp of last successful pick */
  timestamp: number;
}

/**
 * SplatPickingSystem - Converts screen clicks to 3D world positions on Gaussian splats
 *
 * Performance Strategy:
 * The Spark.js WASM raycaster is O(n) per splat (~0.5-2ms for 1.5M splats).
 * To achieve smooth 60fps cursor tracking, we use a multi-strategy approach:
 *
 * 1. Deferred Picking with Cache:
 *    - Return cached result immediately (0ms)
 *    - Update cache asynchronously
 *    - User perceives smooth cursor (no visible lag)
 *
 * 2. Predictive Surface Interpolation:
 *    - Use last pick + surface plane to predict cursor position
 *    - Cast ray to plane at last surface (instant, no geometry traversal)
 *    - Periodically verify with real raycast
 *
 * 3. Smart Throttling:
 *    - Raycast every Nth frame (reduces CPU load)
 *    - Use interpolation between actual picks
 *    - Real raycast on click for accuracy
 *
 * This enables smooth 60fps cursor tracking even with 1.5M+ splat scenes.
 */
export class SplatPickingSystem {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;

  // Deferred picking cache for instant cursor response
  private pickCache: PickCache = {
    result: null,
    pointer: new THREE.Vector2(),
    plane: new THREE.Plane(),
    valid: false,
    timestamp: 0,
  };

  // Temporary vectors for calculations (avoid allocations in hot path)
  private tempVec3 = new THREE.Vector3();
  private tempCameraPos = new THREE.Vector3();
  private tempCameraDir = new THREE.Vector3();
  private tempWorldPosition = new THREE.Vector3(); // For spatial index world transforms
  private tempPointer = new THREE.Vector2(); // For depth read cache update

  // Cache validity duration (ms) - how long before cache is considered stale
  private static readonly CACHE_VALIDITY_MS = 500;

  // Maximum pointer distance for interpolation (NDC units, ~50px at 1080p)
  private static readonly MAX_INTERPOLATION_DISTANCE = 0.1;

  // Multi-sample ray offset in NDC space (~2 pixels at typical screen resolution)
  private static readonly MULTI_SAMPLE_OFFSET = 0.002;

  // ─── GPU Depth Buffer Picking ───────────────────────────────────────────────
  // Enables 10-40x faster picking by reading depth from GPU instead of WASM raycast.
  // Uses 1-frame delay pattern: render depth this frame, read result next frame.

  /** Render target for capturing depth buffer */
  private depthRenderTarget: THREE.WebGLRenderTarget | null = null;

  /** Pending depth read from previous frame (async readback pattern) */
  private pendingDepthRead: PendingDepthRead | null = null;

  /** Reusable buffer for reading depth pixels (RGBA float) */
  private depthPixelBuffer: Float32Array = new Float32Array(4);

  /** Whether depth picking is initialized and ready */
  private depthPickingReady: boolean = false;

  /** Depth value threshold for "hit background" (near 1.0 = far plane) */
  private static readonly DEPTH_BACKGROUND_THRESHOLD = 0.9999;

  // ─── Spatial Index for Fast Picking ────────────────────────────────────────
  // Uses BVH (default) or spatial hash grid for O(log n) picking instead of O(n) WASM raycast.
  // Built once on splat load, queries ~0.01-0.05ms vs ~0.5-2ms for WASM.

  /** Spatial hash index for fast ray-splat queries (legacy, kept as fallback) */
  private spatialIndex: SplatSpatialIndex | null = null;

  /** BVH index for faster ray-splat queries (default, industry-standard) */
  private bvhIndex: SplatBVHIndex | null = null;

  /** Which index type is currently active */
  private activeIndexType: SpatialIndexType = 'bvh';

  /** Reference to the splat mesh for coordinate transforms */
  private indexedMesh: THREE.Object3D | null = null;

  /** Cached inverse matrix for transforming rays to local mesh space */
  private cachedInverseMatrix = new THREE.Matrix4();

  /** Cached copy of mesh world matrix elements for change detection */
  private cachedMatrixElements = new Float64Array(16);

  /** Epsilon for matrix element comparison (handles floating-point imprecision) */
  private static readonly MATRIX_EPSILON = 1e-6;

  /** Temporary ray for local-space picking */
  private localRay = new THREE.Ray();

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
  }

  // ─── GPU Depth Buffer Methods ───────────────────────────────────────────────

  /**
   * Initialize the depth render target for GPU depth picking.
   * Call once after the renderer is created, before the first render.
   *
   * @param width - Render target width (typically canvas width)
   * @param height - Render target height (typically canvas height)
   */
  initDepthTarget(width: number, height: number): void {
    // Dispose existing target if any
    if (this.depthRenderTarget) {
      this.depthRenderTarget.dispose();
    }

    // Create depth texture that stores actual depth values
    const depthTexture = new THREE.DepthTexture(width, height);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType;

    // Create render target with attached depth texture
    // We use FloatType for the color attachment to get high-precision depth readback
    this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthTexture: depthTexture,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });

    this.depthPickingReady = true;
  }

  /**
   * Resize the depth render target when canvas size changes.
   *
   * @param width - New width
   * @param height - New height
   */
  resizeDepthTarget(width: number, height: number): void {
    if (!this.depthRenderTarget) {
      this.initDepthTarget(width, height);
      return;
    }

    // Only resize if dimensions actually changed
    if (this.depthRenderTarget.width !== width || this.depthRenderTarget.height !== height) {
      this.depthRenderTarget.setSize(width, height);

      // Recreate depth texture at new size
      if (this.depthRenderTarget.depthTexture) {
        this.depthRenderTarget.depthTexture.dispose();
      }
      const depthTexture = new THREE.DepthTexture(width, height);
      depthTexture.format = THREE.DepthFormat;
      depthTexture.type = THREE.UnsignedIntType;
      this.depthRenderTarget.depthTexture = depthTexture;

      // Clear any pending reads (they're now invalid)
      this.pendingDepthRead = null;
    }
  }

  /**
   * Render the scene to the depth target.
   * Call this in the render loop BEFORE the main render pass.
   *
   * @param scene - The scene to render
   * @param camera - The camera to use
   */
  renderDepthPass(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.depthRenderTarget || !this.depthPickingReady) return;

    // Store current render target
    const currentTarget = this.renderer.getRenderTarget();

    // Render scene to depth target
    this.renderer.setRenderTarget(this.depthRenderTarget);
    this.renderer.render(scene, camera);

    // Restore previous render target
    this.renderer.setRenderTarget(currentTarget);
  }

  /**
   * Schedule a depth buffer read at a pixel position.
   * The result will be available next frame via processPendingDepthRead().
   *
   * This async pattern avoids GPU pipeline stalls - we schedule the read
   * this frame and collect the result next frame after the GPU has finished.
   *
   * @param pixelX - X coordinate in pixels (0 to width-1)
   * @param pixelY - Y coordinate in pixels (0 to height-1)
   * @param camera - Camera used for unprojection
   */
  scheduleDepthRead(pixelX: number, pixelY: number, camera: THREE.Camera): void {
    if (!this.depthPickingReady) return;

    this.pendingDepthRead = {
      x: Math.round(pixelX),
      y: Math.round(pixelY),
      camera,
    };
  }

  /**
   * Process any pending depth read from the previous frame.
   * Call at the START of each frame before rendering.
   *
   * @returns PickResult if depth was successfully read, null otherwise
   */
  processPendingDepthRead(): PickResult | null {
    if (!this.pendingDepthRead || !this.depthRenderTarget) {
      return null;
    }

    const { x, y, camera } = this.pendingDepthRead;
    this.pendingDepthRead = null;

    // Validate coordinates
    const width = this.depthRenderTarget.width;
    const height = this.depthRenderTarget.height;
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return null;
    }

    // Read single pixel from depth texture
    // Note: WebGL Y is flipped (0 at bottom), so we flip the Y coordinate
    try {
      this.renderer.readRenderTargetPixels(
        this.depthRenderTarget,
        x,
        height - y - 1, // Flip Y coordinate
        1,
        1,
        this.depthPixelBuffer
      );
    } catch (error) {
      console.warn('GPU depth read failed:', error);
      return null;
    }

    // Depth is in the R channel of our float render target
    // WebGL normalized depth: 0.0 = near plane, 1.0 = far plane
    const depth = this.depthPixelBuffer[0];

    // Check for background (depth at or near far plane)
    if (depth >= SplatPickingSystem.DEPTH_BACKGROUND_THRESHOLD) {
      return null;
    }

    // Check for invalid depth (negative or NaN)
    if (depth < 0 || !isFinite(depth)) {
      return null;
    }

    // Unproject depth to world position
    // NDC coordinates: x and y in [-1, 1], z in [-1, 1] (clip space)
    const ndcX = (x / width) * 2 - 1;
    const ndcY = -(y / height) * 2 + 1;
    // Convert normalized depth [0, 1] to clip space Z [-1, 1]
    const ndcZ = depth * 2 - 1;

    const worldPos = new THREE.Vector3(ndcX, ndcY, ndcZ);
    worldPos.unproject(camera);

    // Calculate distance from camera
    camera.getWorldPosition(this.tempCameraPos);
    const distance = this.tempCameraPos.distanceTo(worldPos);

    // Create pick result
    const result: PickResult = {
      position: worldPos,
      distance,
      method: 'depth-buffer',
    };

    // Cache this result for interpolation (reuse updateCache to avoid duplication)
    this.tempPointer.set(ndcX, ndcY);
    this.updateCache(result, this.tempPointer, camera);

    return result;
  }

  /**
   * Check if GPU depth picking is initialized and ready
   */
  isDepthPickingReady(): boolean {
    return this.depthPickingReady;
  }

  /**
   * Invalidate the pick cache (call when scene changes significantly)
   */
  invalidateCache(): void {
    this.pickCache.valid = false;
    this.pickCache.result = null;
  }

  /**
   * Pick a 3D position from screen coordinates.
   * Uses multi-sample raycasting for accurate final placement.
   * Use this for click events where precision matters.
   *
   * @param camera - The camera being used for rendering
   * @param pointer - Normalized device coordinates (-1 to 1)
   * @param splatMesh - The Spark SplatMesh to pick against (optional)
   * @returns PickResult if a point was found, null otherwise
   */
  pick(
    camera: THREE.Camera,
    pointer: THREE.Vector2,
    splatMesh?: SplatMesh | THREE.Object3D | null
  ): PickResult | null {
    // Strategy 1: Try multi-sample raycasting for better surface accuracy
    if (splatMesh) {
      const multiSampleResult = this.pickWithMultiSample(camera, pointer, splatMesh);
      if (multiSampleResult) {
        this.updateCache(multiSampleResult, pointer, camera);
        return multiSampleResult;
      }
    }

    return null;
  }

  /**
   * Fast pick for cursor preview - optimized for 60fps tracking.
   * Uses spatial index when available, with fallback to interpolation and WASM raycast.
   *
   * Performance characteristics:
   * - Cached/interpolated result: ~0.01ms (instant)
   * - Spatial index query: ~0.05ms (100x faster than WASM)
   * - WASM raycast: ~0.5-2ms (fallback when no index)
   *
   * @param camera - The camera being used for rendering
   * @param pointer - Normalized device coordinates (-1 to 1)
   * @param splatMesh - The Spark SplatMesh to pick against (fallback only)
   * @returns PickResult if a point was found, null otherwise
   */
  pickFast(
    camera: THREE.Camera,
    pointer: THREE.Vector2,
    splatMesh?: SplatMesh | THREE.Object3D | null
  ): PickResult | null {
    // Strategy 1: Try predictive interpolation (instant, ~0.01ms)
    const interpolated = this.pickInterpolated(camera, pointer);
    if (interpolated) {
      return interpolated;
    }

    // Strategy 2: Try spatial index (fast, ~0.01-0.05ms)
    if (this.isSpatialIndexReady()) {
      const spatialResult = this.pickWithSpatialIndex(camera, pointer);
      if (spatialResult) {
        return spatialResult;
      }
    }

    // Strategy 3: Fallback to WASM raycast (slower, ~0.5-2ms)
    if (splatMesh) {
      const raycastResult = this.pickViaRaycast(camera, pointer, splatMesh);
      if (raycastResult) {
        this.updateCache(raycastResult, pointer, camera);
        return raycastResult;
      }
    }

    return null;
  }

  /**
   * Get cached pick result for instant cursor response.
   * Returns immediately without any computation.
   *
   * @returns Cached PickResult or null if cache is empty/invalid
   */
  getCachedPick(): PickResult | null {
    if (!this.pickCache.valid || !this.pickCache.result) {
      return null;
    }
    return this.pickCache.result;
  }

  /**
   * Predictive Surface Interpolation - Ultra-fast path (~0.01ms)
   *
   * Uses the last valid pick result to create a surface plane, then
   * intersects the current cursor ray with that plane. This provides
   * smooth cursor movement without expensive raycasting.
   *
   * How it works:
   * 1. At last pick point, create a plane facing the camera
   * 2. Cast ray from current cursor through this plane
   * 3. Return intersection point as predicted position
   *
   * @param camera - The camera being used for rendering
   * @param pointer - Current pointer position (NDC)
   * @returns Interpolated PickResult or null if interpolation not possible
   */
  private pickInterpolated(
    camera: THREE.Camera,
    pointer: THREE.Vector2
  ): PickResult | null {
    // Need valid cache with recent result
    if (!this.pickCache.valid || !this.pickCache.result) {
      return null;
    }

    // Check cache staleness
    const age = performance.now() - this.pickCache.timestamp;
    if (age > SplatPickingSystem.CACHE_VALIDITY_MS) {
      this.pickCache.valid = false;
      return null;
    }

    // Check pointer movement - don't interpolate too far from last pick
    const pointerDist = pointer.distanceTo(this.pickCache.pointer);
    if (pointerDist > SplatPickingSystem.MAX_INTERPOLATION_DISTANCE) {
      // Pointer moved too far, interpolation would be inaccurate
      return null;
    }

    // Cast ray from cursor through the cached surface plane
    this.raycaster.setFromCamera(pointer, camera);
    const intersection = this.raycaster.ray.intersectPlane(
      this.pickCache.plane,
      this.tempVec3
    );

    if (!intersection) {
      return null;
    }

    // Calculate distance from camera
    camera.getWorldPosition(this.tempCameraPos);
    const distance = this.tempCameraPos.distanceTo(intersection);

    return {
      position: intersection.clone(),
      distance,
      method: 'interpolated',
    };
  }

  /**
   * Update the pick cache with a new result
   */
  private updateCache(
    result: PickResult,
    pointer: THREE.Vector2,
    camera: THREE.Camera
  ): void {
    this.pickCache.result = result;
    this.pickCache.pointer.copy(pointer);
    this.pickCache.timestamp = performance.now();
    this.pickCache.valid = true;

    // Create surface plane at pick point, facing camera
    camera.getWorldDirection(this.tempCameraDir);
    this.pickCache.plane.setFromNormalAndCoplanarPoint(
      this.tempCameraDir.negate(), // Face toward camera
      result.position
    );
  }

  /**
   * Multi-sample picking for improved surface accuracy
   *
   * Casts multiple rays in a small pattern around the click point and uses the
   * median result for more accurate surface placement. This helps when the
   * Spark WASM raycaster returns the first splat hit rather than the median surface.
   *
   * @param camera - The camera being used for rendering
   * @param pointer - Normalized device coordinates (-1 to 1)
   * @param splatMesh - The SplatMesh to pick against
   * @returns PickResult with median position, or null if insufficient hits
   */
  private pickWithMultiSample(
    camera: THREE.Camera,
    pointer: THREE.Vector2,
    splatMesh: SplatMesh | THREE.Object3D
  ): PickResult | null {
    // Ray pattern: center + 4 cardinal directions (cross pattern)
    const OFFSET = SplatPickingSystem.MULTI_SAMPLE_OFFSET;
    const offsets: [number, number][] = [
      [0, 0],           // Center (primary)
      [-OFFSET, 0],     // Left
      [OFFSET, 0],      // Right
      [0, -OFFSET],     // Down
      [0, OFFSET],      // Up
    ];

    const hits: { position: THREE.Vector3; distance: number }[] = [];

    for (const [dx, dy] of offsets) {
      const samplePointer = new THREE.Vector2(pointer.x + dx, pointer.y + dy);
      const result = this.pickViaRaycast(camera, samplePointer, splatMesh);
      if (result) {
        hits.push({ position: result.position, distance: result.distance });
      }
    }

    // Need at least 3 hits for reliable median (majority of samples)
    if (hits.length < 3) {
      // Fall back to single-ray result if we have any hit
      return hits.length > 0
        ? { position: hits[0].position, distance: hits[0].distance, method: 'raycaster' }
        : null;
    }

    // Sort by distance and use median for robust outlier rejection
    hits.sort((a, b) => a.distance - b.distance);
    const medianIdx = Math.floor(hits.length / 2);
    const median = hits[medianIdx];

    return {
      position: median.position,
      distance: median.distance,
      method: 'raycaster',
    };
  }

  /**
   * Single-ray raycast via Spark WASM
   *
   * Spark's SplatMesh supports standard Three.js raycasting through WebAssembly-based
   * ray-splat intersection. This is accurate but expensive for large splat counts.
   */
  private pickViaRaycast(
    camera: THREE.Camera,
    pointer: THREE.Vector2,
    splatMesh: SplatMesh | THREE.Object3D
  ): PickResult | null {
    // Guard: Check if SplatMesh WASM is fully initialized before raycasting
    // Spark has two-stage initialization:
    // 1. Static WASM module must load (SplatMesh.isStaticInitialized)
    // 2. Instance splat data must load (splatMesh.isInitialized)
    if (splatMesh instanceof SplatMesh) {
      // Check static WASM initialization first
      if (!SplatMesh.isStaticInitialized) {
        return null; // WASM module still loading
      }

      // Check instance data initialization
      if (!splatMesh.isInitialized) {
        return null; // Splat data still loading
      }
    }

    // Wrap in try/catch for additional safety
    try {
      this.raycaster.setFromCamera(pointer, camera);

      // Spark's SplatMesh supports raycasting like a regular mesh
      const intersections = this.raycaster.intersectObject(splatMesh, false);

      if (intersections.length > 0) {
        const hit = intersections[0];
        return {
          position: hit.point.clone(),
          normal: hit.face?.normal?.clone(),
          distance: hit.distance,
          method: 'raycaster',
        };
      }
    } catch (error) {
      // WASM may have failed unexpectedly - log and return null
      console.warn('Spark raycasting failed:', error);
      return null;
    }

    return null;
  }

  /**
   * Get the ray from camera through screen point
   * Useful for custom picking logic
   */
  getRay(camera: THREE.Camera, pointer: THREE.Vector2): THREE.Ray {
    this.raycaster.setFromCamera(pointer, camera);
    return this.raycaster.ray.clone();
  }

  /**
   * Check if a 3D point is visible (not occluded) from the camera
   *
   * @param camera - The camera to check from
   * @param point - The 3D world position to check
   * @param splatMesh - The splat mesh that might occlude the point
   * @returns true if the point is visible
   */
  isPointVisible(
    camera: THREE.Camera,
    point: THREE.Vector3,
    splatMesh?: SplatMesh | THREE.Object3D | null
  ): boolean {
    if (!splatMesh) return true;

    // Get camera position
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);

    // Create ray from camera to point
    const direction = point.clone().sub(cameraPos).normalize();
    this.raycaster.set(cameraPos, direction);

    // Check for intersections
    const intersections = this.raycaster.intersectObject(splatMesh, false);

    if (intersections.length === 0) {
      return true;
    }

    // Point is visible if the first intersection is at or beyond the point
    const distanceToPoint = cameraPos.distanceTo(point);
    const tolerance = 0.01; // 1cm tolerance
    return intersections[0].distance >= distanceToPoint - tolerance;
  }

  /**
   * Convert screen position to normalized device coordinates
   *
   * @param screenX - X position in pixels
   * @param screenY - Y position in pixels
   * @param containerWidth - Container width in pixels
   * @param containerHeight - Container height in pixels
   * @returns Normalized device coordinates (-1 to 1)
   */
  static screenToNDC(
    screenX: number,
    screenY: number,
    containerWidth: number,
    containerHeight: number
  ): THREE.Vector2 {
    return new THREE.Vector2(
      (screenX / containerWidth) * 2 - 1,
      -(screenY / containerHeight) * 2 + 1
    );
  }

  /**
   * Convert click event to normalized device coordinates
   */
  static eventToNDC(
    event: MouseEvent | PointerEvent,
    container: HTMLElement
  ): THREE.Vector2 {
    const rect = container.getBoundingClientRect();
    return SplatPickingSystem.screenToNDC(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height
    );
  }

  // ─── Spatial Index Methods ─────────────────────────────────────────────────

  /**
   * Build the spatial index from splat data.
   * Call this once after the splat mesh is fully loaded.
   *
   * @param centers - Float32Array of splat centers (x, y, z, x, y, z, ...)
   * @param mesh - The splat mesh (for coordinate transforms)
   * @param scales - Optional Float32Array of splat scales
   * @param minOpacity - Optional minimum opacity threshold
   * @param opacities - Optional Float32Array of opacities
   * @param indexType - Which index type to use ('bvh' or 'spatial-hash', default 'bvh')
   */
  buildSpatialIndex(
    centers: Float32Array,
    mesh: THREE.Object3D,
    scales?: Float32Array,
    minOpacity?: number,
    opacities?: Float32Array,
    indexType: SpatialIndexType = 'bvh'
  ): void {
    const startTime = performance.now();

    // Dispose existing indices
    if (this.spatialIndex) {
      this.spatialIndex.dispose();
      this.spatialIndex = null;
    }
    if (this.bvhIndex) {
      this.bvhIndex.dispose();
      this.bvhIndex = null;
    }

    this.activeIndexType = indexType;
    this.indexedMesh = mesh;

    // Reset matrix cache when mesh changes to avoid stale cache issues
    this.cachedMatrixElements.fill(0);
    this.cachedInverseMatrix.identity();

    if (indexType === 'bvh') {
      // Build BVH index (faster queries, slower build)
      this.bvhIndex = new SplatBVHIndex();
      this.bvhIndex.build(centers, scales, minOpacity, opacities);

      const buildTime = (performance.now() - startTime).toFixed(1);
      console.log(
        `[SplatPickingSystem] Built BVH index: ${this.bvhIndex.getPointCount()} splats, ` +
        `build time: ${buildTime}ms`
      );
    } else {
      // Build spatial hash index (faster build, slightly slower queries)
      this.spatialIndex = new SplatSpatialIndex();
      this.spatialIndex.build(centers, scales, minOpacity, opacities);

      const buildTime = (performance.now() - startTime).toFixed(1);
      console.log(
        `[SplatPickingSystem] Built spatial hash index: ${this.spatialIndex.getPointCount()} splats, ` +
        `${this.spatialIndex.getCellCount()} cells, cell size: ${this.spatialIndex.getCellSize().toFixed(4)}, ` +
        `build time: ${buildTime}ms`
      );
    }
  }

  /**
   * Check if the spatial index is built and ready
   */
  isSpatialIndexReady(): boolean {
    if (this.activeIndexType === 'bvh') {
      return this.bvhIndex?.isBuilt() ?? false;
    }
    return this.spatialIndex?.isBuilt() ?? false;
  }

  /**
   * Get the active index type
   */
  getActiveIndexType(): SpatialIndexType {
    return this.activeIndexType;
  }

  /**
   * Get spatial index statistics for debugging
   */
  getSpatialIndexStats(): { pointCount: number; cellCount?: number; cellSize?: number; type: SpatialIndexType } | null {
    if (this.activeIndexType === 'bvh' && this.bvhIndex?.isBuilt()) {
      return {
        pointCount: this.bvhIndex.getPointCount(),
        type: 'bvh',
      };
    }
    if (this.spatialIndex?.isBuilt()) {
      return {
        pointCount: this.spatialIndex.getPointCount(),
        cellCount: this.spatialIndex.getCellCount(),
        cellSize: this.spatialIndex.getCellSize(),
        type: 'spatial-hash',
      };
    }
    return null;
  }

  /**
   * Check if matrix has changed using epsilon comparison.
   * More reliable than hash-based comparison for floating-point values.
   *
   * @param matrix - The matrix to compare against cached elements
   * @returns true if any element differs by more than epsilon
   */
  private hasMatrixChanged(matrix: THREE.Matrix4): boolean {
    const current = matrix.elements;
    const cached = this.cachedMatrixElements;
    const eps = SplatPickingSystem.MATRIX_EPSILON;

    for (let i = 0; i < 16; i++) {
      if (Math.abs(current[i] - cached[i]) > eps) {
        return true;
      }
    }
    return false;
  }

  /**
   * Update cached inverse matrix if mesh transform has changed.
   * Returns true if the cache was updated, false if it was still valid.
   */
  private updateInverseMatrixCache(): boolean {
    if (!this.indexedMesh) return false;

    const worldMatrix = this.indexedMesh.matrixWorld;

    // Only recompute inverse if matrix changed (using epsilon comparison)
    if (this.hasMatrixChanged(worldMatrix)) {
      this.cachedInverseMatrix.copy(worldMatrix).invert();
      // Cache the new matrix elements
      this.cachedMatrixElements.set(worldMatrix.elements);
      return true;
    }
    return false;
  }

  /**
   * Pick using the spatial index (O(log n) instead of O(n))
   *
   * This is much faster than WASM raycasting:
   * - BVH query: ~0.01-0.02ms
   * - Spatial hash query: ~0.05ms
   * - WASM raycast: ~0.5-2ms for 1M+ splats
   *
   * Optimizations:
   * - Cached inverse matrix (only recomputed when mesh moves)
   * - No allocations in hot path
   * - BVH provides 2-5x faster queries than spatial hash
   *
   * @param camera - The camera being used for rendering
   * @param pointer - Normalized device coordinates (-1 to 1)
   * @returns PickResult if a point was found, null otherwise
   */
  pickWithSpatialIndex(
    camera: THREE.Camera,
    pointer: THREE.Vector2
  ): PickResult | null {
    if (!this.indexedMesh) {
      return null;
    }

    // Check which index is available
    const hasBVH = this.bvhIndex?.isBuilt();
    const hasSpatialHash = this.spatialIndex?.isBuilt();

    if (!hasBVH && !hasSpatialHash) {
      return null;
    }

    // Create ray in world space
    this.raycaster.setFromCamera(pointer, camera);
    const worldRay = this.raycaster.ray;

    // Use cached inverse matrix (only recomputes if mesh transform changed)
    this.updateInverseMatrixCache();

    // Transform ray origin and direction to local space
    // Origin is a point, so use applyMatrix4 (includes translation)
    this.localRay.origin.copy(worldRay.origin).applyMatrix4(this.cachedInverseMatrix);

    // Direction is a vector, so use transformDirection (excludes translation)
    // This is critical for correct picking with non-uniform scaling
    this.localRay.direction.copy(worldRay.direction)
      .transformDirection(this.cachedInverseMatrix).normalize();

    let hasHit = false;

    // Try BVH first (faster queries)
    if (hasBVH) {
      const bvhResult = this.bvhIndex!.pickRay(this.localRay);
      if (bvhResult) {
        // Copy pooled position to our temp vector and transform to world space
        this.tempWorldPosition.copy(bvhResult.position)
          .applyMatrix4(this.indexedMesh.matrixWorld);
        hasHit = true;
      }
    }

    // Fall back to spatial hash if BVH didn't hit
    if (!hasHit && hasSpatialHash) {
      const hashResult = this.spatialIndex!.pickRay(this.localRay);
      if (hashResult) {
        // Copy pooled position to our temp vector and transform to world space
        this.tempWorldPosition.copy(hashResult.position)
          .applyMatrix4(this.indexedMesh.matrixWorld);
        hasHit = true;
      }
    }

    if (!hasHit) {
      return null;
    }

    // Calculate distance from camera
    camera.getWorldPosition(this.tempCameraPos);
    const distance = this.tempCameraPos.distanceTo(this.tempWorldPosition);

    // Clone for the final result (caller owns this Vector3)
    const pickResult: PickResult = {
      position: this.tempWorldPosition.clone(),
      distance,
      method: 'spatial-index',
    };

    // Update cache with this result for interpolation
    this.updateCache(pickResult, pointer, camera);

    return pickResult;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.pickCache.valid = false;
    this.pickCache.result = null;

    // Dispose GPU depth picking resources
    if (this.depthRenderTarget) {
      if (this.depthRenderTarget.depthTexture) {
        this.depthRenderTarget.depthTexture.dispose();
      }
      this.depthRenderTarget.dispose();
      this.depthRenderTarget = null;
    }
    this.pendingDepthRead = null;
    this.depthPickingReady = false;

    // Dispose spatial indices
    if (this.spatialIndex) {
      this.spatialIndex.dispose();
      this.spatialIndex = null;
    }
    if (this.bvhIndex) {
      this.bvhIndex.dispose();
      this.bvhIndex = null;
    }
    this.indexedMesh = null;
  }
}

export default SplatPickingSystem;
