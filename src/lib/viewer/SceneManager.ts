import * as THREE from 'three';
import type {
  GaussianSplatRenderer,
  SplatMetadata,
  SplatLoadProgress,
} from './renderers';

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

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.objects = new Map();
    this.annotations = new Map();
    this.measurements = new Map();
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
   * @returns Promise that resolves with metadata when loading completes
   */
  async loadSplat(
    url: string,
    onProgress?: (progress: SplatLoadProgress) => void
  ): Promise<SplatMetadata> {
    if (!this.splatRenderer) {
      throw new Error('No splat renderer configured. Call setSplatRenderer first.');
    }

    // Clear any existing main model
    if (this.objects.has('main-model')) {
      this.removeObject('main-model');
    }

    // Load the splat scene
    const metadata = await this.splatRenderer.loadFromUrl(url, onProgress);

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
   * Add an annotation to the scene
   */
  addAnnotation(id: string, position: THREE.Vector3, data: any): void {
    // Create annotation group (placeholder for now)
    const group = new THREE.Group();
    group.position.copy(position);
    group.userData = { type: 'annotation', data };

    this.annotations.set(id, group);
    this.scene.add(group);
  }

  /**
   * Remove an annotation from the scene
   */
  removeAnnotation(id: string): void {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    this.scene.remove(annotation);
    this.annotations.delete(id);
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
   * Perform raycasting to detect objects under the cursor
   */
  raycast(
    camera: THREE.Camera,
    pointer: THREE.Vector2,
    targetObjects?: THREE.Object3D[]
  ): THREE.Intersection[] {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);

    const objects = targetObjects || Array.from(this.objects.values());
    return raycaster.intersectObjects(objects, true);
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearObjects();

    this.annotations.forEach((annotation, id) => {
      this.removeAnnotation(id);
    });

    this.measurements.forEach((measurement, id) => {
      this.removeMeasurement(id);
    });

    // Dispose splat renderer
    if (this.splatRenderer) {
      this.splatRenderer.dispose();
      this.splatRenderer = null;
    }
  }
}

export default SceneManager;
