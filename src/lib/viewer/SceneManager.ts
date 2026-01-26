import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';
import type {
  GaussianSplatRenderer,
  SplatMetadata,
  SplatLoadProgress,
} from './renderers';
import type { SplatOrientation, SplatTransform } from '@/types/viewer';
import { AnnotationRenderer, type AnnotationData, type AnnotationStatus } from './AnnotationRenderer';
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
  private pickingSystem: SplatPickingSystem | null = null;
  private raycaster: THREE.Raycaster;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.objects = new Map();
    this.annotations = new Map();
    this.measurements = new Map();
    this.raycaster = new THREE.Raycaster();

    // Initialize annotation renderer
    this.annotationRenderer = new AnnotationRenderer(scene);
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
   * Get the splat scene bounding box
   */
  getSplatBoundingBox(): THREE.Box3 | null {
    return this.splatRenderer?.getBoundingBox() ?? null;
  }

  /**
   * Set the orientation of the splat mesh
   * @param orientation Euler angles in radians
   * @deprecated Use setSplatTransform instead for full transform support
   */
  setSplatOrientation(orientation: SplatOrientation): void {
    this.splatRenderer?.setOrientation(orientation);
  }

  /**
   * Get the current orientation of the splat mesh
   * @returns Current orientation or null if no mesh loaded
   * @deprecated Use getSplatTransform instead for full transform support
   */
  getSplatOrientation(): SplatOrientation | null {
    return this.splatRenderer?.getOrientation() ?? null;
  }

  /**
   * Rotate the splat by incremental amounts (in radians)
   * @param deltaX Change in X rotation (radians)
   * @param deltaY Change in Y rotation (radians)
   * @param deltaZ Change in Z rotation (radians)
   * @deprecated Use transform gizmo instead
   */
  rotateSplatBy(deltaX: number, deltaY: number, deltaZ: number): void {
    const current = this.getSplatOrientation();
    if (current) {
      this.setSplatOrientation({
        x: current.x + deltaX,
        y: current.y + deltaY,
        z: current.z + deltaZ,
      });
    }
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
   * Add a measurement to the scene
   */
  addMeasurement(id: string, points: THREE.Vector3[], data: any): void {
    // Create measurement group (placeholder for now)
    const group = new THREE.Group();
    group.userData = { type: 'measurement', points, data };

    this.measurements.set(id, group);
    this.scene.add(group);
  }

  /**
   * Remove a measurement from the scene
   */
  removeMeasurement(id: string): void {
    const measurement = this.measurements.get(id);
    if (!measurement) return;

    this.scene.remove(measurement);
    this.measurements.delete(id);
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

    this.measurements.forEach((measurement, id) => {
      this.removeMeasurement(id);
    });

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
