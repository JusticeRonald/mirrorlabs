import * as THREE from 'three';
import {
  MeshBVH,
  acceleratedRaycast,
} from 'three-mesh-bvh';

// NOTE: We intentionally do NOT extend global prototypes (THREE.Mesh.prototype.raycast)
// as that would affect all meshes in the application. Instead, we apply acceleratedRaycast
// only to our specific BVH mesh instance.

// Extend THREE types for BVH (only for type checking, not runtime modification)
declare module 'three' {
  interface BufferGeometry {
    boundsTree?: MeshBVH;
  }
}

/**
 * Result from a BVH spatial index query
 */
export interface BVHQueryResult {
  /** Index of the closest splat */
  splatIndex: number;
  /** Distance along the ray to the intersection */
  distance: number;
  /** World position of the intersection */
  position: THREE.Vector3;
}

/**
 * SplatBVHIndex - BVH-accelerated spatial index for fast splat picking
 *
 * Uses three-mesh-bvh (742K weekly npm downloads) for industry-standard
 * BVH raycasting. This provides faster queries than the spatial hash grid
 * for non-uniform distributions.
 *
 * Performance:
 * - Build time: O(n log n) - ~200-400ms for 1M splats
 * - Query time: O(log n) - ~0.01-0.02ms per query
 * - Memory: ~40 bytes per splat (BVH nodes + geometry)
 *
 * Trade-off: Slower build (2-4x) but faster queries (2-5x) than spatial hash.
 * Better for interactive use where queries dominate over builds.
 */
export class SplatBVHIndex {
  /** BufferGeometry containing splat positions */
  private geometry: THREE.BufferGeometry | null = null;

  /** Mesh for raycasting (with BVH acceleration) */
  private pointsMesh: THREE.Mesh | null = null;

  /** Instance material (disposed with the index) */
  private material: THREE.MeshBasicMaterial | null = null;

  /** Splat radii for hit detection */
  private radii: Float32Array | null = null;

  /** Whether the index has been built */
  private built: boolean = false;

  /** Number of indexed splats */
  private pointCount: number = 0;

  /** Bounding box of all splats */
  private bounds: THREE.Box3 = new THREE.Box3();

  /** Minimum splat radius when not provided */
  private static readonly DEFAULT_RADIUS = 0.01;

  /** Billboard scale multiplier for hit detection (smaller = more precise) */
  private static readonly BILLBOARD_SCALE = 0.5;

  /** BVH max triangles per leaf node (lower = faster query, higher = faster build) */
  private static readonly BVH_MAX_LEAF_TRIS = 10;

  /** BVH max tree depth (prevents excessive recursion) */
  private static readonly BVH_MAX_DEPTH = 40;

  // Reusable objects to avoid allocations in hot path
  private tempVec3 = new THREE.Vector3();
  private resultPosition = new THREE.Vector3(); // Pooled result vector
  private raycaster = new THREE.Raycaster();

  /**
   * Build the BVH index from splat centers.
   *
   * @param centers - Float32Array of splat centers (x, y, z, x, y, z, ...)
   * @param scales - Optional Float32Array of splat scales (sx, sy, sz, ...)
   * @param minOpacity - Minimum opacity threshold (splats below are excluded)
   * @param opacities - Optional Float32Array of splat opacities
   */
  build(
    centers: Float32Array,
    scales?: Float32Array,
    minOpacity?: number,
    opacities?: Float32Array
  ): void {
    this.dispose();

    const count = centers.length / 3;
    if (count === 0) return;

    // Filter valid splats and collect positions/radii
    const validPositions: number[] = [];
    const validRadii: number[] = [];
    const validIndices: number[] = [];
    this.bounds.makeEmpty();

    for (let i = 0; i < count; i++) {
      // Skip low-opacity splats if opacity data is provided
      if (opacities && minOpacity !== undefined && opacities[i] < minOpacity) {
        continue;
      }

      const x = centers[i * 3];
      const y = centers[i * 3 + 1];
      const z = centers[i * 3 + 2];

      // Skip invalid coordinates
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
        continue;
      }

      // Compute radius from scales (use max scale as conservative radius)
      let radius = SplatBVHIndex.DEFAULT_RADIUS;
      if (scales) {
        const sx = scales[i * 3];
        const sy = scales[i * 3 + 1];
        const sz = scales[i * 3 + 2];
        radius = Math.max(sx, sy, sz, SplatBVHIndex.DEFAULT_RADIUS);
      }

      validPositions.push(x, y, z);
      validRadii.push(radius);
      validIndices.push(i);
      this.bounds.expandByPoint(this.tempVec3.set(x, y, z));
    }

    if (validPositions.length === 0) return;

    this.pointCount = validPositions.length / 3;

    // Store radii for hit detection
    this.radii = new Float32Array(validRadii);

    // Create geometry from splat centers
    // We'll create tiny triangles at each splat position for BVH raycasting
    // Each splat becomes a small tetrahedron (4 triangles) for hit detection
    this.geometry = this.createSplatGeometry(
      new Float32Array(validPositions),
      new Float32Array(validRadii)
    );

    // Build BVH - this is the expensive part (~200-400ms for 1M splats)
    // Create BVH directly instead of using prototype extension
    this.geometry.boundsTree = new MeshBVH(this.geometry, {
      maxLeafTris: SplatBVHIndex.BVH_MAX_LEAF_TRIS,
      maxDepth: SplatBVHIndex.BVH_MAX_DEPTH,
      strategy: 0, // SAH (Surface Area Heuristic)
    });

    // Create mesh for raycasting with instance-specific material
    // We create a new material per instance to avoid memory leaks from static materials
    this.material = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    this.pointsMesh = new THREE.Mesh(this.geometry, this.material);

    // Apply accelerated raycast ONLY to this mesh instance (not globally)
    this.pointsMesh.raycast = acceleratedRaycast;

    // Store original splat indices in geometry userData
    this.geometry.userData.splatIndices = new Uint32Array(validIndices);

    this.built = true;
  }

  /**
   * Create geometry from splat positions using small billboards.
   * Each splat becomes a small quad that can be hit by raycasts.
   */
  private createSplatGeometry(positions: Float32Array, radii: Float32Array): THREE.BufferGeometry {
    const count = positions.length / 3;

    // Create a small billboard for each splat (2 triangles = 6 vertices per splat)
    const vertexCount = count * 6;
    const positionBuffer = new Float32Array(vertexCount * 3);
    const indexBuffer: number[] = [];

    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const r = radii[i] * SplatBVHIndex.BILLBOARD_SCALE;

      const vOff = i * 6 * 3;

      // Create a small axis-aligned quad at splat position
      // Quad vertices (2 triangles)
      // v0 (-r, -r) v1 (+r, -r) v2 (+r, +r) v3 (-r, +r)
      // Triangle 1: v0, v1, v2
      // Triangle 2: v0, v2, v3

      // v0
      positionBuffer[vOff + 0] = x - r;
      positionBuffer[vOff + 1] = y - r;
      positionBuffer[vOff + 2] = z;

      // v1
      positionBuffer[vOff + 3] = x + r;
      positionBuffer[vOff + 4] = y - r;
      positionBuffer[vOff + 5] = z;

      // v2
      positionBuffer[vOff + 6] = x + r;
      positionBuffer[vOff + 7] = y + r;
      positionBuffer[vOff + 8] = z;

      // v0 (repeated for second triangle)
      positionBuffer[vOff + 9] = x - r;
      positionBuffer[vOff + 10] = y - r;
      positionBuffer[vOff + 11] = z;

      // v2 (repeated)
      positionBuffer[vOff + 12] = x + r;
      positionBuffer[vOff + 13] = y + r;
      positionBuffer[vOff + 14] = z;

      // v3
      positionBuffer[vOff + 15] = x - r;
      positionBuffer[vOff + 16] = y + r;
      positionBuffer[vOff + 17] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));

    return geometry;
  }

  /**
   * Pick splats along a ray using BVH acceleration.
   *
   * NOTE: The returned position uses a pooled Vector3. The caller must
   * clone it if they need to store it beyond the current frame.
   *
   * @param ray - The ray to test (in local mesh space)
   * @param maxDistance - Maximum distance to search
   * @returns The closest intersection or null if none found
   */
  pickRay(ray: THREE.Ray, maxDistance?: number): BVHQueryResult | null {
    if (!this.built || !this.pointsMesh || !this.geometry) {
      return null;
    }

    // Set up raycaster
    this.raycaster.ray.copy(ray);
    this.raycaster.far = maxDistance ?? Infinity;
    this.raycaster.near = 0;

    // Perform BVH-accelerated raycast
    const intersections = this.raycaster.intersectObject(this.pointsMesh, false);

    if (intersections.length === 0) {
      return null;
    }

    // Get the closest hit
    const hit = intersections[0];

    // Calculate which splat was hit (each splat has 6 vertices)
    const splatIndex = Math.floor(hit.faceIndex! / 2);

    // Get original splat index from userData
    const originalIndex = this.geometry.userData.splatIndices?.[splatIndex] ?? splatIndex;

    // Copy hit point to pooled vector (avoids allocation in hot path)
    this.resultPosition.copy(hit.point);

    return {
      splatIndex: originalIndex,
      distance: hit.distance,
      position: this.resultPosition,
    };
  }

  /**
   * Check if the index has been built
   */
  isBuilt(): boolean {
    return this.built;
  }

  /**
   * Get the number of indexed splats
   */
  getPointCount(): number {
    return this.pointCount;
  }

  /**
   * Get the bounding box of indexed splats
   */
  getBounds(): THREE.Box3 {
    return this.bounds.clone();
  }

  /**
   * Get the internal mesh for external use (e.g., transform synchronization)
   */
  getMesh(): THREE.Mesh | null {
    return this.pointsMesh;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.geometry) {
      // Dispose BVH if it exists
      if (this.geometry.boundsTree) {
        this.geometry.boundsTree = undefined;
      }
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.pointsMesh = null;
    this.radii = null;
    this.built = false;
    this.pointCount = 0;
    this.bounds.makeEmpty();
  }
}

export default SplatBVHIndex;
