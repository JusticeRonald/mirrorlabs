import * as THREE from 'three';

/**
 * Occlusion state for a point
 */
export interface OcclusionState {
  /** Whether the point is fully visible */
  isVisible: boolean;
  /** Occlusion factor (0 = fully visible, 1 = fully occluded) */
  occlusionFactor: number;
  /** Distance from camera to the point */
  distanceToCamera: number;
  /** Distance from camera to the first occluding surface (if any) */
  distanceToOccluder?: number;
}

/**
 * OcclusionChecker - Determines visibility of 3D points from the camera
 *
 * Used to fade annotation markers when they're behind geometry (Gaussian splats).
 * Supports multiple strategies for occlusion detection:
 * 1. Raycasting - Check if ray from camera to point hits geometry
 * 2. Screen-space offset - Check depth at slightly offset screen positions
 */
export class OcclusionChecker {
  private raycaster: THREE.Raycaster;
  private occlusionCache: Map<string, { state: OcclusionState; timestamp: number }>;
  private cacheDurationMs: number;

  /** Tolerance for depth comparisons (in world units) */
  private depthTolerance: number = 0.05;

  constructor(cacheDurationMs: number = 100) {
    this.raycaster = new THREE.Raycaster();
    this.occlusionCache = new Map();
    this.cacheDurationMs = cacheDurationMs;
  }

  /**
   * Check if a point is occluded from the camera's view
   *
   * @param camera - The camera to check from
   * @param point - The 3D world position to check
   * @param occluders - Objects that can occlude the point
   * @param cacheKey - Optional key for caching the result
   * @returns OcclusionState with visibility information
   */
  check(
    camera: THREE.Camera,
    point: THREE.Vector3,
    occluders: THREE.Object3D[],
    cacheKey?: string
  ): OcclusionState {
    // Check cache first
    if (cacheKey) {
      const cached = this.occlusionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheDurationMs) {
        return cached.state;
      }
    }

    // Get camera position
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);

    // Calculate distance to camera
    const distanceToCamera = cameraPos.distanceTo(point);

    // Create ray from camera to point
    const direction = point.clone().sub(cameraPos).normalize();
    this.raycaster.set(cameraPos, direction);
    this.raycaster.far = distanceToCamera + this.depthTolerance;

    // Check for intersections
    const intersections = this.raycaster.intersectObjects(occluders, true);

    let state: OcclusionState;

    if (intersections.length === 0) {
      // No occlusion - point is fully visible
      state = {
        isVisible: true,
        occlusionFactor: 0,
        distanceToCamera,
      };
    } else {
      // Check if first intersection is before the point
      const firstHit = intersections[0];

      if (firstHit.distance < distanceToCamera - this.depthTolerance) {
        // Occluded - something is in front
        const occlusionFactor = Math.min(
          1,
          (distanceToCamera - firstHit.distance) / distanceToCamera
        );

        state = {
          isVisible: false,
          occlusionFactor,
          distanceToCamera,
          distanceToOccluder: firstHit.distance,
        };
      } else {
        // Hit is at or beyond the point - visible
        state = {
          isVisible: true,
          occlusionFactor: 0,
          distanceToCamera,
        };
      }
    }

    // Cache the result
    if (cacheKey) {
      this.occlusionCache.set(cacheKey, {
        state,
        timestamp: Date.now(),
      });
    }

    return state;
  }

  /**
   * Check multiple points for occlusion (batch operation)
   *
   * @param camera - The camera to check from
   * @param points - Array of {id, position} objects to check
   * @param occluders - Objects that can occlude the points
   * @returns Map of id -> OcclusionState
   */
  checkBatch(
    camera: THREE.Camera,
    points: Array<{ id: string; position: THREE.Vector3 }>,
    occluders: THREE.Object3D[]
  ): Map<string, OcclusionState> {
    const results = new Map<string, OcclusionState>();

    for (const { id, position } of points) {
      results.set(id, this.check(camera, position, occluders, id));
    }

    return results;
  }

  /**
   * Calculate opacity based on occlusion state
   *
   * @param state - The occlusion state
   * @param minOpacity - Minimum opacity when fully occluded (default: 0.3)
   * @returns Opacity value between minOpacity and 1
   */
  static getOpacity(state: OcclusionState, minOpacity: number = 0.3): number {
    if (state.isVisible) return 1;
    return minOpacity + (1 - minOpacity) * (1 - state.occlusionFactor);
  }

  /**
   * Check if a point is in the camera's view frustum
   */
  isInFrustum(camera: THREE.Camera, point: THREE.Vector3): boolean {
    // Create frustum from camera
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);

    return frustum.containsPoint(point);
  }

  /**
   * Get screen position of a 3D point
   */
  getScreenPosition(
    camera: THREE.Camera,
    point: THREE.Vector3,
    screenWidth: number,
    screenHeight: number
  ): { x: number; y: number; z: number } | null {
    const vector = point.clone().project(camera);

    // Check if point is behind camera
    if (vector.z > 1) return null;

    return {
      x: ((vector.x + 1) / 2) * screenWidth,
      y: ((-vector.y + 1) / 2) * screenHeight,
      z: vector.z,
    };
  }

  /**
   * Clear the occlusion cache
   */
  clearCache(): void {
    this.occlusionCache.clear();
  }

  /**
   * Set cache duration
   */
  setCacheDuration(ms: number): void {
    this.cacheDurationMs = ms;
  }

  /**
   * Set depth tolerance for occlusion detection
   */
  setDepthTolerance(tolerance: number): void {
    this.depthTolerance = tolerance;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.occlusionCache.clear();
  }
}

export default OcclusionChecker;
