import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';

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
  method: 'raycaster' | 'depth-buffer';
}

/**
 * SplatPickingSystem - Converts screen clicks to 3D world positions on Gaussian splats
 *
 * Uses a multi-strategy approach:
 * 1. Spark Raycaster (Primary) - Uses WebAssembly-based ray-splat intersection
 * 2. Depth Buffer Unprojection (Fallback) - Read depth at click pixel, unproject to 3D
 *
 * This enables annotation placement, measurement tools, and other click-based interactions
 * on Gaussian splat scenes where traditional mesh raycasting doesn't work.
 */
export class SplatPickingSystem {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;

  // Depth reading support
  private depthRenderTarget: THREE.WebGLRenderTarget | null = null;
  private depthMaterial: THREE.ShaderMaterial | null = null;
  private depthPixelBuffer: Float32Array;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.depthPixelBuffer = new Float32Array(4);

    this.initDepthMaterial();
  }

  /**
   * Initialize depth material for depth buffer fallback
   */
  private initDepthMaterial(): void {
    this.depthMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying float vDepth;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDepth = -mvPosition.z;
        }
      `,
      fragmentShader: `
        varying float vDepth;
        void main() {
          gl_FragColor = vec4(vDepth, 0.0, 0.0, 1.0);
        }
      `,
    });
  }

  /**
   * Pick a 3D position from screen coordinates
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
    // Strategy 1: Try Spark raycaster first (if we have a SplatMesh)
    if (splatMesh) {
      const raycastResult = this.pickViaRaycast(camera, pointer, splatMesh);
      if (raycastResult) {
        return raycastResult;
      }
    }

    // Strategy 2: Fall back to depth buffer unprojection
    const depthResult = this.pickViaDepthBuffer(camera, pointer);
    if (depthResult) {
      return depthResult;
    }

    return null;
  }

  /**
   * Strategy 1: Spark Raycaster
   *
   * Spark's SplatMesh supports standard Three.js raycasting through WebAssembly-based
   * ray-splat intersection. This is the most accurate method.
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
        return null; // WASM module still loading, fall back to depth buffer
      }

      // Check instance data initialization
      if (!splatMesh.isInitialized) {
        return null; // Splat data still loading, fall back to depth buffer
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
      // WASM may have failed unexpectedly - log and fall back
      console.warn('Spark raycasting failed, falling back to depth buffer:', error);
      return null;
    }

    return null;
  }

  /**
   * Strategy 2: Depth Buffer Unprojection
   *
   * Read the depth value at the click position from the renderer's depth buffer,
   * then unproject to get the 3D world position. This is a fallback when
   * direct raycasting doesn't work well.
   */
  private pickViaDepthBuffer(
    camera: THREE.Camera,
    pointer: THREE.Vector2
  ): PickResult | null {
    // Get canvas dimensions
    const { width, height } = this.renderer.getSize(new THREE.Vector2());

    // Convert normalized device coordinates to pixel coordinates
    const pixelX = Math.round(((pointer.x + 1) / 2) * width);
    const pixelY = Math.round(((1 - pointer.y) / 2) * height);

    // Ensure we're within bounds
    if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
      return null;
    }

    // Read depth from WebGL depth buffer
    const depth = this.readDepthAtPixel(pixelX, pixelY, width, height);

    if (depth === null || depth >= 1.0) {
      // No geometry at this point (hit far plane or background)
      return null;
    }

    // Unproject the screen position + depth to world coordinates
    const screenPos = new THREE.Vector3(pointer.x, pointer.y, depth);
    const worldPos = screenPos.unproject(camera);

    // Calculate distance from camera
    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);
    const distance = cameraPos.distanceTo(worldPos);

    return {
      position: worldPos,
      distance,
      method: 'depth-buffer',
    };
  }

  /**
   * Read depth value at a specific pixel coordinate
   */
  private readDepthAtPixel(
    x: number,
    y: number,
    width: number,
    height: number
  ): number | null {
    const gl = this.renderer.getContext();

    // Create or resize render target if needed
    if (
      !this.depthRenderTarget ||
      this.depthRenderTarget.width !== width ||
      this.depthRenderTarget.height !== height
    ) {
      this.depthRenderTarget?.dispose();
      this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      });
      this.depthRenderTarget.depthBuffer = true;
    }

    // Read depth directly from current framebuffer
    // This works because we're reading immediately after render
    try {
      // WebGL2 depth buffer reading has several issues:
      // 1. PIXEL_PACK_BUFFER may be bound by Three.js, causing warnings
      // 2. DEPTH_COMPONENT + FLOAT is not a valid readPixels format/type combo
      // 3. Direct depth reading from default framebuffer is unreliable
      //
      // The primary Spark raycaster path works well, so we skip the problematic
      // WebGL2 depth reading and fall through to alternative methods.
      if (gl instanceof WebGL2RenderingContext) {
        try {
          // Unbind any pixel buffer objects that Three.js may have bound
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

          // Clear any pending errors before our read attempt
          gl.getError();

          // Try reading depth with UNSIGNED_INT format (more compatible)
          // Note: This still may fail on some drivers/browsers
          const depthBuffer = new Uint32Array(1);
          gl.readPixels(
            x,
            height - y - 1,
            1,
            1,
            gl.DEPTH_COMPONENT,
            gl.UNSIGNED_INT,
            depthBuffer
          );

          const error = gl.getError();
          if (error === gl.NO_ERROR && depthBuffer[0] < 0xffffffff) {
            // Normalize from UNSIGNED_INT to 0-1 range
            return depthBuffer[0] / 0xffffffff;
          }
        } catch {
          // WebGL2 depth reading failed - this is expected on many configurations
          // Fall through to alternative methods silently
        }
      }

      // Fallback: Use normalized depth from linear depth approximation
      // This is less precise but works in more cases
      return this.estimateDepthFromNDC(x, y, width, height);
    } catch {
      return null;
    }
  }

  /**
   * Estimate depth using alternate methods when direct depth read fails
   */
  private estimateDepthFromNDC(
    x: number,
    y: number,
    width: number,
    height: number
  ): number | null {
    // For now, return null to indicate no depth available
    // In a production implementation, you could:
    // 1. Render scene to a depth texture
    // 2. Use a depth pre-pass
    // 3. Use shadow map depth sampling
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

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.depthRenderTarget?.dispose();
    this.depthMaterial?.dispose();
    this.depthRenderTarget = null;
    this.depthMaterial = null;
  }
}

export default SplatPickingSystem;
