import * as THREE from 'three';

/**
 * A single splat point stored in the spatial index
 */
export interface SplatPoint {
  /** Splat center X coordinate (in local mesh space) */
  x: number;
  /** Splat center Y coordinate (in local mesh space) */
  y: number;
  /** Splat center Z coordinate (in local mesh space) */
  z: number;
  /** Original splat index */
  index: number;
  /** Approximate splat radius for ray-sphere intersection */
  radius: number;
}

/**
 * Result from a spatial index query
 */
export interface SpatialQueryResult {
  /** The splat point that was hit */
  splat: SplatPoint;
  /** Distance along the ray to the intersection */
  t: number;
  /** World position of the intersection */
  position: THREE.Vector3;
}

/**
 * SplatSpatialIndex - Spatial hash grid for fast splat picking
 *
 * Architecture:
 * - Uses a 3D spatial hash grid for O(1) cell lookups
 * - Samples points along the ray and checks nearby cells
 * - Performs ray-sphere intersection on candidate splats
 *
 * Performance:
 * - Build time: O(n) where n = splat count
 * - Query time: O(k) where k = candidates (typically 10-50)
 * - Memory: ~24 bytes per splat + grid overhead
 *
 * Optimizations (Phase 2a):
 * - Integer hash keys instead of string keys (5400 fewer allocations per pick)
 * - Generation counter instead of Set for visited tracking (no allocation per pick)
 * - Object pooling for Vector3 results (no allocation per pick)
 *
 * This approach is preferred over KD-trees for ray queries because:
 * - KD-trees are optimal for nearest-neighbor queries
 * - Spatial hashing is optimal for range queries along a ray
 * - We're essentially doing a range query at each ray sample point
 */
export class SplatSpatialIndex {
  /** All splat points (flat array for memory efficiency) */
  private points: SplatPoint[] = [];

  /** Spatial hash grid: maps integer hash to array of splat indices */
  private grid: Map<number, number[]> = new Map();

  /** Cell size for spatial hashing (auto-computed from bounding box) */
  private cellSize: number = 1.0;

  /** Whether the index has been built */
  private built: boolean = false;

  /** Bounding box of all splats */
  private bounds: THREE.Box3 = new THREE.Box3();

  /** Minimum cell size to prevent excessive grid density */
  private static readonly MIN_CELL_SIZE = 0.01;

  /** Maximum cells per axis to limit memory usage */
  private static readonly MAX_CELLS_PER_AXIS = 256;

  /** Default splat radius when not provided */
  private static readonly DEFAULT_RADIUS = 0.01;

  /** Ray sampling step (fraction of cell size) */
  private static readonly RAY_SAMPLE_STEP_RATIO = 0.5;

  /** Maximum ray distance to search */
  private static readonly MAX_RAY_DISTANCE = 100;

  /** Maximum candidates to consider (early exit) */
  private static readonly MAX_CANDIDATES = 100;

  // Prime numbers for spatial hash (avoid collisions)
  private static readonly HASH_PRIME_X = 73856093;
  private static readonly HASH_PRIME_Y = 19349663;
  private static readonly HASH_PRIME_Z = 83492791;

  // Generation counter for visited tracking (replaces Set allocation)
  private visitedGeneration: Uint32Array | null = null;
  private currentGeneration: number = 0;

  // Reusable objects to avoid allocations in hot path
  private tempVec3 = new THREE.Vector3();
  private tempSphereCenter = new THREE.Vector3();
  private tempBoundsIntersect = new THREE.Vector3(); // For bounds check
  private resultPosition = new THREE.Vector3(); // Pooled result vector

  /**
   * Build the spatial index from splat centers
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
    this.clear();

    const count = centers.length / 3;
    if (count === 0) return;

    // First pass: collect valid splats and compute bounding box
    this.bounds.makeEmpty();
    this.points = [];

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
      let radius = SplatSpatialIndex.DEFAULT_RADIUS;
      if (scales) {
        const sx = scales[i * 3];
        const sy = scales[i * 3 + 1];
        const sz = scales[i * 3 + 2];
        radius = Math.max(sx, sy, sz, SplatSpatialIndex.DEFAULT_RADIUS);
      }

      this.points.push({ x, y, z, index: i, radius });
      this.bounds.expandByPoint(this.tempVec3.set(x, y, z));
    }

    if (this.points.length === 0) return;

    // Compute optimal cell size based on bounding box
    const size = new THREE.Vector3();
    this.bounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    // Target ~8-16 splats per cell on average for good balance
    const targetSplatsPerCell = 12;
    const idealCellSize = Math.cbrt(
      (maxDim ** 3 * targetSplatsPerCell) / this.points.length
    );

    // Clamp cell size to reasonable range
    this.cellSize = Math.max(
      SplatSpatialIndex.MIN_CELL_SIZE,
      Math.min(idealCellSize, maxDim / SplatSpatialIndex.MAX_CELLS_PER_AXIS)
    );

    // Allocate visited tracking array (replaces Set allocation per query)
    this.visitedGeneration = new Uint32Array(this.points.length);
    this.currentGeneration = 0;

    // Second pass: insert splats into grid cells using integer hash
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const cellHash = this.getCellHash(point.x, point.y, point.z);

      let cell = this.grid.get(cellHash);
      if (!cell) {
        cell = [];
        this.grid.set(cellHash, cell);
      }
      cell.push(i);
    }

    this.built = true;
  }

  /**
   * Query splats along a ray using the spatial index
   *
   * @param ray - The ray to query (in local mesh space)
   * @param maxDistance - Maximum distance along the ray to search
   * @returns Array of candidate splat points near the ray
   */
  queryRay(ray: THREE.Ray, maxDistance?: number): SplatPoint[] {
    if (!this.built || this.points.length === 0 || !this.visitedGeneration) return [];

    const candidates: SplatPoint[] = [];

    // Increment generation counter instead of creating new Set
    // This is O(1) vs O(n) for Set.clear() and avoids allocation
    this.currentGeneration++;
    // Handle overflow (extremely rare, would need billions of queries)
    if (this.currentGeneration === 0) {
      this.visitedGeneration.fill(0);
      this.currentGeneration = 1;
    }

    const searchDistance = maxDistance ?? SplatSpatialIndex.MAX_RAY_DISTANCE;
    const step = this.cellSize * SplatSpatialIndex.RAY_SAMPLE_STEP_RATIO;

    // Sample points along ray and gather candidates from nearby cells
    for (let t = 0; t < searchDistance; t += step) {
      // Get sample point on ray
      this.tempVec3.copy(ray.direction).multiplyScalar(t).add(ray.origin);

      // Get cell and neighboring cells
      const cellX = Math.floor(this.tempVec3.x / this.cellSize);
      const cellY = Math.floor(this.tempVec3.y / this.cellSize);
      const cellZ = Math.floor(this.tempVec3.z / this.cellSize);

      // Check 3x3x3 neighborhood (27 cells) using integer hash
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const hash = this.getCellHashFromCoords(cellX + dx, cellY + dy, cellZ + dz);
            const cell = this.grid.get(hash);
            if (!cell) continue;

            for (const pointIdx of cell) {
              // Use generation counter instead of Set.has()
              if (this.visitedGeneration[pointIdx] === this.currentGeneration) continue;
              this.visitedGeneration[pointIdx] = this.currentGeneration;
              candidates.push(this.points[pointIdx]);
            }
          }
        }
      }

      // Early exit if we have enough candidates
      if (candidates.length >= SplatSpatialIndex.MAX_CANDIDATES) break;
    }

    return candidates;
  }

  /**
   * Find the closest splat intersection along a ray
   *
   * NOTE: The returned position uses a pooled Vector3. The caller must
   * clone it if they need to store it beyond the current frame.
   *
   * @param ray - The ray to test (in local mesh space)
   * @param maxDistance - Maximum distance to search
   * @returns The closest intersection or null if none found
   */
  pickRay(ray: THREE.Ray, maxDistance?: number): SpatialQueryResult | null {
    // Early exit if ray doesn't intersect bounds at all
    if (!this.built || this.bounds.isEmpty()) return null;
    if (!ray.intersectBox(this.bounds, this.tempBoundsIntersect)) return null;

    const candidates = this.queryRay(ray, maxDistance);
    if (candidates.length === 0) return null;

    let closestT = Infinity;
    let closestSplat: SplatPoint | null = null;

    for (const splat of candidates) {
      this.tempSphereCenter.set(splat.x, splat.y, splat.z);
      const t = this.raySphereIntersect(ray, this.tempSphereCenter, splat.radius);

      if (t !== null && t > 0 && t < closestT) {
        closestT = t;
        closestSplat = splat;
      }
    }

    if (!closestSplat) return null;

    // Use pooled vector (caller must clone if storing beyond current frame)
    ray.at(closestT, this.resultPosition);
    return {
      splat: closestSplat,
      t: closestT,
      position: this.resultPosition,
    };
  }

  /**
   * Ray-sphere intersection test (optimized for normalized rays)
   *
   * Since ray.direction is always normalized (unit vector), a = dot(d,d) = 1.
   * This simplifies the quadratic formula, saving 3 multiplications per test.
   *
   * @param ray - The ray to test (direction must be normalized)
   * @param center - Sphere center
   * @param radius - Sphere radius
   * @returns Distance along ray to intersection, or null if no intersection
   */
  private raySphereIntersect(
    ray: THREE.Ray,
    center: THREE.Vector3,
    radius: number
  ): number | null {
    // Vector from ray origin to sphere center
    const oc = this.tempVec3.subVectors(ray.origin, center);

    // Simplified quadratic formula for normalized ray direction (a = 1):
    // Original: b² - 4ac, t = (-b - √disc) / 2a
    // Simplified: (2*oc·d)² - 4*1*(oc·oc - r²) = 4*(oc·d)² - 4*(oc·oc - r²)
    // Let b' = oc·d, then discriminant' = b'² - (oc·oc - r²), t = -b' - √disc'
    const b = oc.dot(ray.direction);
    const c = oc.dot(oc) - radius * radius;

    const discriminant = b * b - c;
    if (discriminant < 0) return null;

    // Return the closer intersection point (entering the sphere)
    const t = -b - Math.sqrt(discriminant);
    return t > 0 ? t : null;
  }

  /**
   * Get integer hash for a world position
   * Uses prime multiplication to minimize collisions
   */
  private getCellHash(x: number, y: number, z: number): number {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return this.getCellHashFromCoords(cx, cy, cz);
  }

  /**
   * Get integer hash for cell coordinates (already floored)
   * Prime multiplication gives good distribution for 3D grids
   */
  private getCellHashFromCoords(cx: number, cy: number, cz: number): number {
    // Use unsigned right shift (>>> 0) to ensure positive 32-bit integer
    return ((cx * SplatSpatialIndex.HASH_PRIME_X) ^
            (cy * SplatSpatialIndex.HASH_PRIME_Y) ^
            (cz * SplatSpatialIndex.HASH_PRIME_Z)) >>> 0;
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
    return this.points.length;
  }

  /**
   * Get the cell size used for spatial hashing
   */
  getCellSize(): number {
    return this.cellSize;
  }

  /**
   * Get the number of grid cells
   */
  getCellCount(): number {
    return this.grid.size;
  }

  /**
   * Get the bounding box of indexed splats
   */
  getBounds(): THREE.Box3 {
    return this.bounds.clone();
  }

  /**
   * Clear and dispose of the index
   */
  clear(): void {
    this.points = [];
    this.grid.clear();
    this.bounds.makeEmpty();
    this.built = false;
    this.visitedGeneration = null;
    this.currentGeneration = 0;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();
  }
}

export default SplatSpatialIndex;
