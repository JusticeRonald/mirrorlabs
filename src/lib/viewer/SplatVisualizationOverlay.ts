import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';

/**
 * Maximum number of splats to render as center points.
 * Above this threshold, splats are subsampled for performance.
 */
const MAX_CENTER_POINTS = 500_000;

/** Uniform blue color for center points, matching SuperSplat's centers mode. */
const CENTER_COLOR = 0x0000ff;

/** Opacity for center points, matching SuperSplat's rgba(0,0,1,0.5). */
const CENTER_OPACITY = 0.5;

/**
 * Minimum opacity threshold for including a splat in overlays.
 * Splats below this are skipped entirely to reduce visual noise.
 */
const MIN_OPACITY_THRESHOLD = 0.15;

/**
 * SplatVisualizationOverlay renders a point cloud visualization for Gaussian Splats:
 * - **Centers**: A THREE.Points point cloud at each splat center with uniform blue color
 *
 * The overlay is added directly to the scene (not parented to splatMesh)
 * to avoid Three.js visibility inheritance issues.
 */
export class SplatVisualizationOverlay {
  private scene: THREE.Scene;
  private pointsCloud: THREE.Points | null = null;
  private sourceMesh: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ─── Centers (THREE.Points) ───────────────────────────────────────

  /**
   * Build the center-points overlay from a SplatMesh.
   * Extracts per-splat positions via forEachSplat()
   * and creates a THREE.Points object with uniform blue color.
   */
  buildCenters(splatMesh: SplatMesh): void {
    this.disposeCenters();

    const packedSplats = splatMesh.packedSplats;
    if (!packedSplats) return;

    const totalSplats = packedSplats.numSplats;
    if (totalSplats === 0) return;

    // Subsample if over the limit
    const step = totalSplats > MAX_CENTER_POINTS
      ? Math.ceil(totalSplats / MAX_CENTER_POINTS)
      : 1;
    const pointCount = Math.ceil(totalSplats / step);

    // Allocate max size — we'll trim after filtering out low-opacity splats
    const positions = new Float32Array(pointCount * 3);

    let pointIndex = 0;

    splatMesh.forEachSplat((index, center, _scales, _quat, opacity) => {
      if (index % step !== 0) return;
      if (pointIndex >= pointCount) return;

      // Skip low-opacity splats entirely to reduce visual noise
      if (opacity < MIN_OPACITY_THRESHOLD) return;

      const off = pointIndex * 3;
      positions[off] = center.x;
      positions[off + 1] = center.y;
      positions[off + 2] = center.z;

      pointIndex++;
    });

    // Trim buffer to actual point count (use slice to create a copy, not subarray which creates a view)
    const actualPositions = positions.slice(0, pointIndex * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(actualPositions, 3));

    const material = new THREE.PointsMaterial({
      size: 2 * window.devicePixelRatio,
      sizeAttenuation: false,
      vertexColors: false,
      color: new THREE.Color(CENTER_COLOR),
      transparent: true,
      opacity: CENTER_OPACITY,
      depthTest: true,
      depthWrite: false,
    });

    this.pointsCloud = new THREE.Points(geometry, material);
    this.pointsCloud.frustumCulled = false;

    // Ensure splat mesh matrix is current before copying transform
    splatMesh.updateMatrix();

    // Sync the point cloud transform with the splat mesh (don't bake into vertices)
    this.pointsCloud.position.copy(splatMesh.position);
    this.pointsCloud.quaternion.copy(splatMesh.quaternion);
    this.pointsCloud.scale.copy(splatMesh.scale);
    this.sourceMesh = splatMesh;

    this.scene.add(this.pointsCloud);

    // Start hidden — caller should call showCenters() explicitly
    this.pointsCloud.visible = false;
  }

  showCenters(): void {
    if (this.pointsCloud) {
      this.pointsCloud.visible = true;
    }
  }

  hideCenters(): void {
    if (this.pointsCloud) {
      this.pointsCloud.visible = false;
    }
  }

  /**
   * Sync the point cloud transform with the source splat mesh.
   * Call this every frame to keep the point cloud aligned after gizmo transforms.
   */
  syncTransform(): void {
    if (this.pointsCloud && this.sourceMesh) {
      this.pointsCloud.position.copy(this.sourceMesh.position);
      this.pointsCloud.quaternion.copy(this.sourceMesh.quaternion);
      this.pointsCloud.scale.copy(this.sourceMesh.scale);
    }
  }

  get isCentersBuilt(): boolean {
    return this.pointsCloud !== null;
  }

  // ─── General ──────────────────────────────────────────────────────

  /**
   * Whether any overlay is currently visible.
   */
  get isVisible(): boolean {
    return this.pointsCloud?.visible ?? false;
  }

  /**
   * Whether any overlay has been built.
   */
  get isBuilt(): boolean {
    return this.pointsCloud !== null;
  }

  private disposeCenters(): void {
    if (this.pointsCloud) {
      this.scene.remove(this.pointsCloud);
      this.pointsCloud.geometry.dispose();
      (this.pointsCloud.material as THREE.Material).dispose();
      this.pointsCloud = null;
    }
    this.sourceMesh = null;
  }

  /**
   * Dispose of all GPU resources.
   */
  dispose(): void {
    this.disposeCenters();
  }
}
