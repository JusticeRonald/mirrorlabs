import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import type {
  GaussianSplatRenderer,
  SplatMetadata,
  SplatLoadProgress,
} from './renderers';
import type { SplatOrientation, SplatTransform, SplatViewMode, MeasurementUnit } from '@/types/viewer';
import { AnnotationRenderer, type AnnotationData, type AnnotationStatus } from './AnnotationRenderer';
import { MeasurementRenderer, type MeasurementData } from './MeasurementRenderer';
import { SplatPickingSystem, type PickResult } from './SplatPickingSystem';

/**
 * SceneManager - Orchestrates Three.js scene operations
 *
 * This class provides a clean API for managing 3D objects, annotations,
 * measurements, and other scene entities. It works with vanilla Three.js
 * to provide advanced scene management capabilities.
 */
export class SceneManager {
  private scene: THREE.Scene;
  private objects: Map<string, THREE.Object3D>;
  private annotations: Map<string, THREE.Group>;
  private measurements: Map<string, THREE.Group>;
  private splatRenderer: GaussianSplatRenderer | null = null;

  // Annotation system
  private annotationRenderer: AnnotationRenderer | null = null;
  private measurementRenderer: MeasurementRenderer | null = null;
  private pickingSystem: SplatPickingSystem | null = null;
  private raycaster: THREE.Raycaster;

  // Track mesh transform state for view mode switching
  // When switching to point cloud mode, we store the mesh's world matrix.
  // When switching back, we calculate the delta to adjust marker positions.
  private storedMeshMatrix: THREE.Matrix4 | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.objects = new Map();
    this.annotations = new Map();
    this.measurements = new Map();
    this.raycaster = new THREE.Raycaster();

    // Initialize annotation renderer
    this.annotationRenderer = new AnnotationRenderer(scene);

    // Initialize measurement renderer
    this.measurementRenderer = new MeasurementRenderer(scene);
  }

  /**
   * Initialize the picking system (requires renderer)
   */
  initPickingSystem(renderer: THREE.WebGLRenderer): void {
    if (this.pickingSystem) {
      this.pickingSystem.dispose();
    }
    this.pickingSystem = new SplatPickingSystem(renderer, this.scene);
  }

  /**
   * Get the annotation renderer
   */
  getAnnotationRenderer(): AnnotationRenderer | null {
    return this.annotationRenderer;
  }

  /**
   * Get the measurement renderer
   */
  getMeasurementRenderer(): MeasurementRenderer | null {
    return this.measurementRenderer;
  }

  /**
   * Get the picking system
   */
  getPickingSystem(): SplatPickingSystem | null {
    return this.pickingSystem;
  }

  /**
   * Set the Gaussian Splat renderer to use
   */
  setSplatRenderer(renderer: GaussianSplatRenderer): void {
    // Dispose of existing renderer if any
    if (this.splatRenderer) {
      this.splatRenderer.dispose();
    }
    this.splatRenderer = renderer;
  }

  /**
   * Get the current splat renderer
   */
  getSplatRenderer(): GaussianSplatRenderer | null {
    return this.splatRenderer;
  }

  /**
   * Load a Gaussian Splat scene from a URL
   * @param url URL to the splat file
   * @param onProgress Optional progress callback
   * @param initialOrientation Optional initial orientation to apply after loading (deprecated, use initialTransform)
   * @param initialTransform Optional initial full transform to apply after loading
   * @returns Promise that resolves with metadata when loading completes
   */
  async loadSplat(
    url: string,
    onProgress?: (progress: SplatLoadProgress) => void,
    initialOrientation?: SplatOrientation,
    initialTransform?: SplatTransform
  ): Promise<SplatMetadata> {
    if (!this.splatRenderer) {
      throw new Error('No splat renderer configured. Call setSplatRenderer first.');
    }

    // Clear any existing main model
    if (this.objects.has('main-model')) {
      this.removeObject('main-model');
    }

    // Load the splat scene with optional initial transform or orientation
    const metadata = await this.splatRenderer.loadFromUrl(url, onProgress, {
      initialOrientation,
      initialTransform,
    });

    // Track the splat mesh as the main model
    const mesh = this.splatRenderer.getMesh();
    if (mesh) {
      this.objects.set('splat-scene', mesh);

      // Parent annotations and measurements to the splat mesh
      // so they transform with the splat when rotated/scaled/moved
      this.setRenderersParentObject(mesh);
    }

    return metadata;
  }

  /**
   * Clear the current splat scene
   */
  clearSplat(): void {
    if (this.splatRenderer) {
      this.splatRenderer.dispose();
    }
    this.objects.delete('splat-scene');
  }

  /**
   * Check if a splat scene is loaded
   */
  hasSplatLoaded(): boolean {
    return this.splatRenderer?.isLoaded() ?? false;
  }

  /**
   * Update the splat renderer (call each frame)
   */
  updateSplat(camera: THREE.Camera, deltaTime: number): void {
    this.splatRenderer?.update(camera, deltaTime);
  }

  /**
   * Sync overlay (point cloud) transform with the splat mesh.
   * Call every frame to keep the point cloud aligned during gizmo transforms.
   */
  syncOverlay(): void {
    this.splatRenderer?.updateOverlay?.();
  }

  /**
   * Get the splat scene bounding box
   */
  getSplatBoundingBox(): THREE.Box3 | null {
    return this.splatRenderer?.getBoundingBox() ?? null;
  }

  /**
   * Set the full transform (position, rotation, scale) of the splat mesh
   * @param transform The transform to apply
   */
  setSplatTransform(transform: SplatTransform): void {
    this.splatRenderer?.setTransform(transform);
  }

  /**
   * Get the current full transform of the splat mesh
   * @returns Current transform or null if no mesh loaded
   */
  getSplatTransform(): SplatTransform | null {
    return this.splatRenderer?.getTransform() ?? null;
  }

  /**
   * Get the splat mesh object (for TransformControls attachment)
   * @returns The splat mesh or null if not loaded
   */
  getSplatMesh(): THREE.Object3D | null {
    return this.splatRenderer?.getMesh() ?? null;
  }

  /**
   * Set the splat visualization mode ('model' or 'pointcloud')
   *
   * When switching to point cloud mode, markers are reparented to the scene
   * because Three.js hides children of invisible parents (splatMesh.visible=false).
   *
   * To handle transforms that occur during point cloud mode:
   * 1. Store mesh's world matrix when entering point cloud mode
   * 2. When exiting, calculate delta between stored and current matrix
   * 3. Apply delta to all marker positions before reparenting back to mesh
   */
  setSplatViewMode(mode: SplatViewMode): void {
    this.splatRenderer?.setSplatViewMode(mode);

    const splatMesh = this.splatRenderer?.getMesh();
    if (!splatMesh) return;

    if (mode === 'pointcloud') {
      // Hide markers in point cloud mode (UX: static markers are confusing during transforms)
      this.measurementRenderer?.setVisible(false);
      this.annotationRenderer?.setVisible(false);

      // Store current mesh transform before reparenting to scene
      splatMesh.updateMatrixWorld(true);
      this.storedMeshMatrix = splatMesh.matrixWorld.clone();

      // Reparent to scene (converts mesh-local → world coords)
      this.measurementRenderer?.setParentObject(this.scene);
      this.annotationRenderer?.setParentObject(this.scene);
    } else {
      // Switching back to model mode
      if (this.storedMeshMatrix) {
        // Calculate delta: how the mesh moved during point cloud mode
        // deltaMatrix = currentMatrix × storedMatrix⁻¹
        splatMesh.updateMatrixWorld(true);
        const currentMatrix = splatMesh.matrixWorld;
        const inverseStored = this.storedMeshMatrix.clone().invert();
        const deltaMatrix = new THREE.Matrix4().multiplyMatrices(currentMatrix, inverseStored);

        // Apply delta to all markers (adjusts their world positions)
        // This must happen BEFORE setParentObject() reparents them
        this.measurementRenderer?.applyWorldTransform(deltaMatrix);
        this.annotationRenderer?.applyWorldTransform(deltaMatrix);

        this.storedMeshMatrix = null;
      }

      // Reparent back to mesh (converts world → mesh-local coords)
      this.measurementRenderer?.setParentObject(splatMesh);
      this.annotationRenderer?.setParentObject(splatMesh);

      // Show markers when returning to model mode (at correct updated positions)
      this.measurementRenderer?.setVisible(true);
      this.annotationRenderer?.setVisible(true);
    }
  }

  /**
   * Add a 3D object to the scene
   */
  addObject(id: string, object: THREE.Object3D): void {
    if (this.objects.has(id)) {
      console.warn(`Object with id ${id} already exists`);
      return;
    }

    this.objects.set(id, object);
    this.scene.add(object);
  }

  /**
   * Remove a 3D object from the scene
   */
  removeObject(id: string): void {
    const object = this.objects.get(id);
    if (!object) {
      console.warn(`Object with id ${id} not found`);
      return;
    }

    this.scene.remove(object);
    this.objects.delete(id);

    // Dispose of geometry and materials
    if (object instanceof THREE.Mesh) {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material?.dispose();
      }
    }
  }

  /**
   * Get an object by ID
   */
  getObject(id: string): THREE.Object3D | undefined {
    return this.objects.get(id);
  }

  /**
   * Clear all objects from the scene
   */
  clearObjects(): void {
    this.objects.forEach((object, id) => {
      this.removeObject(id);
    });
  }

  /**
   * Calculate the bounding box of all objects in the scene
   */
  calculateBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();

    this.objects.forEach(object => {
      const objectBox = new THREE.Box3().setFromObject(object);
      box.union(objectBox);
    });

    return box;
  }

  /**
   * Center the camera on the scene objects
   */
  getCenterPoint(): THREE.Vector3 {
    const box = this.calculateBoundingBox();
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  /**
   * Get the optimal camera distance for viewing all objects
   */
  getOptimalCameraDistance(): number {
    const box = this.calculateBoundingBox();
    const size = new THREE.Vector3();
    box.getSize(size);

    // Calculate distance based on the largest dimension
    const maxDim = Math.max(size.x, size.y, size.z);
    return maxDim * 2;
  }

  /**
   * Add an annotation to the scene using the AnnotationRenderer
   */
  addAnnotation(id: string, position: THREE.Vector3, data: AnnotationData): void {
    if (this.annotationRenderer) {
      const marker = this.annotationRenderer.addAnnotation(position, data);
      this.annotations.set(id, marker);
    } else {
      // Fallback: Create simple annotation group
      const group = new THREE.Group();
      group.position.copy(position);
      group.userData = { type: 'annotation', id, data };
      this.annotations.set(id, group);
      this.scene.add(group);
    }
  }

  /**
   * Update an annotation's data
   */
  updateAnnotation(id: string, updates: Partial<AnnotationData>): void {
    if (this.annotationRenderer) {
      this.annotationRenderer.updateAnnotation(id, updates);
    }
  }

  /**
   * Remove an annotation from the scene
   */
  removeAnnotation(id: string): void {
    if (this.annotationRenderer) {
      this.annotationRenderer.removeAnnotation(id);
    } else {
      const annotation = this.annotations.get(id);
      if (!annotation) return;
      this.scene.remove(annotation);
    }
    this.annotations.delete(id);
  }

  /**
   * Set hovered annotation (for visual feedback)
   */
  setHoveredAnnotation(id: string | null): void {
    this.annotationRenderer?.setHovered(id);
  }

  /**
   * Set selected annotation (for visual feedback)
   */
  setSelectedAnnotation(id: string | null): void {
    this.annotationRenderer?.setSelected(id);
  }

  /**
   * Get annotation data by ID
   */
  getAnnotationData(id: string): AnnotationData | undefined {
    return this.annotationRenderer?.getAnnotationData(id);
  }

  /**
   * Update an annotation's position (for drag-to-reposition)
   */
  updateAnnotationPosition(id: string, worldPosition: THREE.Vector3): void {
    this.annotationRenderer?.updatePosition(id, worldPosition);
  }

  /**
   * Get all annotation IDs
   */
  getAnnotationIds(): string[] {
    return this.annotationRenderer?.getAnnotationIds() ?? Array.from(this.annotations.keys());
  }

  /**
   * Clear all annotations
   */
  clearAnnotations(): void {
    if (this.annotationRenderer) {
      this.annotationRenderer.clear();
    }
    this.annotations.clear();
  }

  /**
   * Add a distance measurement to the scene
   */
  addDistanceMeasurement(
    id: string,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    data: Omit<MeasurementData, 'type' | 'points' | 'value'>
  ): THREE.Group | null {
    if (!this.measurementRenderer) return null;

    const group = this.measurementRenderer.addDistanceMeasurement(id, p1, p2, data);
    this.measurements.set(id, group);
    return group;
  }

  /**
   * Add an area measurement to the scene
   */
  addAreaMeasurement(
    id: string,
    points: THREE.Vector3[],
    data: Omit<MeasurementData, 'type' | 'points' | 'value'>
  ): THREE.Group | null {
    if (!this.measurementRenderer) return null;

    const group = this.measurementRenderer.addAreaMeasurement(id, points, data);
    this.measurements.set(id, group);
    return group;
  }

  /**
   * Add a measurement to the scene (legacy method for backward compatibility)
   */
  addMeasurement(
    id: string,
    points: THREE.Vector3[],
    data: Omit<MeasurementData, 'type' | 'points' | 'value'>
  ): void {
    if (points.length === 2) {
      this.addDistanceMeasurement(id, points[0], points[1], data);
    } else if (points.length >= 3) {
      this.addAreaMeasurement(id, points, data);
    }
  }

  /**
   * Remove a measurement from the scene
   */
  removeMeasurement(id: string): void {
    if (this.measurementRenderer) {
      this.measurementRenderer.removeMeasurement(id);
    }
    this.measurements.delete(id);
  }

  /**
   * Update a measurement's unit
   */
  updateMeasurementUnit(id: string, unit: MeasurementUnit): void {
    this.measurementRenderer?.updateMeasurement(id, unit);
  }

  /**
   * Set hovered measurement
   */
  setHoveredMeasurement(id: string | null): void {
    this.measurementRenderer?.setHovered(id);
  }

  /**
   * Set selected measurement
   */
  setSelectedMeasurement(id: string | null): void {
    this.measurementRenderer?.setSelected(id);
  }

  /**
   * Show distance preview (while measuring)
   */
  showDistancePreview(p1: THREE.Vector3, p2: THREE.Vector3): void {
    this.measurementRenderer?.showDistancePreview(p1, p2);
  }

  /**
   * Show area preview (while measuring)
   */
  showAreaPreview(points: THREE.Vector3[], cursorPoint?: THREE.Vector3): void {
    this.measurementRenderer?.showAreaPreview(points, cursorPoint);
  }

  /**
   * Clear measurement preview
   */
  clearMeasurementPreview(): void {
    this.measurementRenderer?.clearPreview();
  }

  /**
   * Temporarily hide measurement preview for magnifier capture.
   * Used during two-pass rendering to exclude preview line from magnifier view.
   */
  setMeasurementPreviewVisible(visible: boolean): void {
    this.measurementRenderer?.setPreviewVisible(visible);
  }

  /**
   * Check if measurement preview is active.
   * Used to determine if two-pass rendering is needed for magnifier.
   */
  hasMeasurementPreview(): boolean {
    return this.measurementRenderer?.hasActivePreview() ?? false;
  }

  /**
   * Update a measurement point's position (for point editing with gizmo)
   */
  updateMeasurementPoint(id: string, pointIndex: number, newPosition: THREE.Vector3): void {
    this.measurementRenderer?.updateMeasurementPoint(id, pointIndex, newPosition);
  }

  /**
   * Snap a world position to the splat surface by projecting from camera
   * Used when dragging measurement points with the gizmo to ensure they stay on the surface.
   *
   * @param camera - The camera being used for rendering
   * @param worldPosition - The world position to snap (e.g., gizmo helper position)
   * @returns The snapped position on the splat surface, or the original position if no intersection
   */
  snapPositionToSplatSurface(camera: THREE.Camera, worldPosition: THREE.Vector3): THREE.Vector3 {
    if (!this.pickingSystem) return worldPosition;

    const splatMesh = this.splatRenderer?.getMesh() ?? null;
    if (!splatMesh) return worldPosition;

    // Get camera position
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);

    // Create ray from camera toward the world position
    const direction = worldPosition.clone().sub(cameraPos).normalize();
    this.raycaster.set(cameraPos, direction);

    try {
      const intersections = this.raycaster.intersectObject(splatMesh, false);
      if (intersections.length > 0) {
        return intersections[0].point.clone();
      }
    } catch {
      // WASM may fail - return original position
    }

    return worldPosition;
  }

  /**
   * Clear all measurements
   */
  clearMeasurements(): void {
    if (this.measurementRenderer) {
      this.measurementRenderer.clear();
    }
    this.measurements.clear();
  }

  /**
   * Get measurement point position in world space (for HTML overlay)
   */
  getMeasurementPointWorldPosition(id: string, pointIndex: number): THREE.Vector3 | null {
    return this.measurementRenderer?.getPointWorldPosition(id, pointIndex) ?? null;
  }

  /**
   * Get annotation marker position in world space (for HTML overlay)
   */
  getAnnotationWorldPosition(id: string): THREE.Vector3 | null {
    return this.annotationRenderer?.getMarkerWorldPosition(id) ?? null;
  }

  /**
   * Set the parent object for annotations and measurements (for transform parenting)
   */
  setRenderersParentObject(parent: THREE.Object3D | null): void {
    this.annotationRenderer?.setParentObject(parent);
    this.measurementRenderer?.setParentObject(parent);
  }

  /**
   * Pick a 3D position on the splat surface
   *
   * @param camera - The camera being used for rendering
   * @param pointer - Normalized device coordinates (-1 to 1)
   * @returns PickResult if a point was found, null otherwise
   */
  pickSplatPosition(camera: THREE.Camera, pointer: THREE.Vector2): PickResult | null {
    if (!this.pickingSystem) return null;

    const splatMesh = this.splatRenderer?.getMesh() ?? null;
    return this.pickingSystem.pick(camera, pointer, splatMesh);
  }

  /**
   * Pick an annotation marker
   *
   * @param camera - The camera being used for rendering
   * @param pointer - Normalized device coordinates (-1 to 1)
   * @returns Annotation ID if found, null otherwise
   */
  pickAnnotation(camera: THREE.Camera, pointer: THREE.Vector2): string | null {
    if (!this.annotationRenderer) return null;

    const markers = this.annotationRenderer.getMarkerObjects();
    if (markers.length === 0) return null;

    this.raycaster.setFromCamera(pointer, camera);
    const hits = this.raycaster.intersectObjects(markers, true);

    if (hits.length > 0) {
      // Find parent annotation group
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData.id) {
        obj = obj.parent;
      }
      return obj?.userData.id ?? null;
    }

    return null;
  }

  /**
   * Perform raycasting to detect objects under the cursor
   */
  raycast(
    camera: THREE.Camera,
    pointer: THREE.Vector2,
    targetObjects?: THREE.Object3D[]
  ): THREE.Intersection[] {
    this.raycaster.setFromCamera(pointer, camera);

    let objects = targetObjects || Array.from(this.objects.values());

    // Filter out SplatMesh if WASM isn't initialized to prevent raycast errors
    // SplatMesh.isStaticInitialized indicates whether the WASM module is loaded
    if (!SplatMesh.isStaticInitialized) {
      objects = objects.filter(obj => !(obj instanceof SplatMesh));
    }

    // Wrap in try/catch for additional safety against WASM initialization race conditions
    try {
      return this.raycaster.intersectObjects(objects, true);
    } catch (error) {
      console.warn('Raycasting failed:', error);
      return [];
    }
  }

  /**
   * Check if a point is visible from the camera (not occluded)
   */
  isPointVisible(camera: THREE.Camera, point: THREE.Vector3): boolean {
    if (!this.pickingSystem) return true;

    const splatMesh = this.splatRenderer?.getMesh() ?? null;
    return this.pickingSystem.isPointVisible(camera, point, splatMesh);
  }

  /**
   * Update occlusion state for all annotations
   */
  updateAnnotationOcclusion(camera: THREE.Camera): void {
    if (!this.annotationRenderer) return;

    this.annotationRenderer.updateOcclusion(camera, (position) =>
      this.isPointVisible(camera, position)
    );
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearObjects();

    // Clear annotations using the renderer
    if (this.annotationRenderer) {
      this.annotationRenderer.dispose();
      this.annotationRenderer = null;
    }
    this.annotations.clear();

    // Clear measurements using the renderer
    if (this.measurementRenderer) {
      this.measurementRenderer.dispose();
      this.measurementRenderer = null;
    }
    this.measurements.clear();

    // Dispose picking system
    if (this.pickingSystem) {
      this.pickingSystem.dispose();
      this.pickingSystem = null;
    }

    // Dispose splat renderer
    if (this.splatRenderer) {
      this.splatRenderer.dispose();
      this.splatRenderer = null;
    }
  }
}

export default SceneManager;
