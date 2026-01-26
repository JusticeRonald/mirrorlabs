import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Camera state for animation
 */
export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov?: number;
}

/**
 * Animation easing functions
 */
export type EasingFunction = (t: number) => number;

export const EASING = {
  /** Linear interpolation */
  linear: (t: number) => t,

  /** Smooth acceleration and deceleration */
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  /** Smooth deceleration */
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),

  /** Smooth acceleration */
  easeInCubic: (t: number) => t * t * t,

  /** Exponential deceleration */
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),

  /** Slight overshoot and settle */
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * Animation options
 */
export interface AnimationOptions {
  /** Duration in milliseconds */
  duration?: number;
  /** Easing function */
  easing?: EasingFunction;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Callback during animation */
  onUpdate?: (progress: number) => void;
}

const DEFAULT_ANIMATION_OPTIONS: Required<Omit<AnimationOptions, 'onComplete' | 'onUpdate'>> = {
  duration: 1000,
  easing: EASING.easeInOutCubic,
};

/**
 * CameraAnimator - Smooth camera animations for fly-to functionality
 *
 * Provides smooth camera transitions for:
 * - Flying to annotation positions
 * - Transitioning between saved views
 * - Focusing on objects
 */
export class CameraAnimator {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isAnimating = false;
  private animationId: number | null = null;

  // Animation state
  private startState: CameraState | null = null;
  private endState: CameraState | null = null;
  private startTime = 0;
  private duration = 0;
  private easing: EasingFunction = EASING.easeInOutCubic;
  private onCompleteCallback?: () => void;
  private onUpdateCallback?: (progress: number) => void;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
  }

  /**
   * Fly to a target position looking at a point
   */
  flyTo(target: CameraState, options: AnimationOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      const opts = { ...DEFAULT_ANIMATION_OPTIONS, ...options };

      // Store current state as start
      this.startState = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone(),
        fov: this.camera.fov,
      };

      this.endState = {
        position: target.position.clone(),
        target: target.target.clone(),
        fov: target.fov ?? this.camera.fov,
      };

      this.duration = opts.duration;
      this.easing = opts.easing;
      this.onCompleteCallback = () => {
        opts.onComplete?.();
        resolve();
      };
      this.onUpdateCallback = opts.onUpdate;

      // Start animation
      this.startTime = performance.now();
      this.isAnimating = true;
      this.animate();
    });
  }

  /**
   * Fly to look at an annotation position
   *
   * Positions the camera at an appropriate distance and angle to view the annotation.
   */
  flyToAnnotation(
    annotationPosition: THREE.Vector3,
    options: AnimationOptions & {
      /** Distance from annotation (default: 3) */
      distance?: number;
      /** Height offset (default: 1) */
      heightOffset?: number;
    } = {}
  ): Promise<void> {
    const distance = options.distance ?? 3;
    const heightOffset = options.heightOffset ?? 1;

    // Calculate camera position: offset from annotation with some height
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.negate(); // Point away from current view direction
    cameraDirection.y = 0; // Keep horizontal
    cameraDirection.normalize();

    // If direction is zero (looking straight down), use a default
    if (cameraDirection.length() < 0.01) {
      cameraDirection.set(1, 0, 0);
    }

    const cameraPosition = annotationPosition
      .clone()
      .add(cameraDirection.multiplyScalar(distance))
      .add(new THREE.Vector3(0, heightOffset, 0));

    return this.flyTo(
      {
        position: cameraPosition,
        target: annotationPosition,
      },
      options
    );
  }

  /**
   * Fly to a saved view (camera waypoint)
   */
  flyToSavedView(
    savedView: {
      position: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
      fov?: number;
    },
    options: AnimationOptions = {}
  ): Promise<void> {
    return this.flyTo(
      {
        position: new THREE.Vector3(
          savedView.position.x,
          savedView.position.y,
          savedView.position.z
        ),
        target: new THREE.Vector3(
          savedView.target.x,
          savedView.target.y,
          savedView.target.z
        ),
        fov: savedView.fov,
      },
      options
    );
  }

  /**
   * Focus on a bounding box
   */
  focusOnBounds(
    bounds: THREE.Box3,
    options: AnimationOptions & {
      /** Padding multiplier (default: 1.5) */
      padding?: number;
    } = {}
  ): Promise<void> {
    const padding = options.padding ?? 1.5;

    const center = new THREE.Vector3();
    bounds.getCenter(center);

    const size = new THREE.Vector3();
    bounds.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = (maxDim / (2 * Math.tan(fov / 2))) * padding;

    // Calculate position offset from current direction
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.negate();

    const cameraPosition = center.clone().add(direction.multiplyScalar(distance));

    return this.flyTo(
      {
        position: cameraPosition,
        target: center,
      },
      options
    );
  }

  /**
   * Stop current animation
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
    this.onCompleteCallback?.();
    this.onCompleteCallback = undefined;
    this.onUpdateCallback = undefined;
  }

  /**
   * Check if currently animating
   */
  getIsAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.isAnimating || !this.startState || !this.endState) return;

    const elapsed = performance.now() - this.startTime;
    const rawProgress = Math.min(elapsed / this.duration, 1);
    const progress = this.easing(rawProgress);

    // Interpolate position
    this.camera.position.lerpVectors(
      this.startState.position,
      this.endState.position,
      progress
    );

    // Interpolate target
    this.controls.target.lerpVectors(
      this.startState.target,
      this.endState.target,
      progress
    );

    // Interpolate FOV if different
    if (this.startState.fov !== undefined && this.endState.fov !== undefined) {
      this.camera.fov =
        this.startState.fov + (this.endState.fov - this.startState.fov) * progress;
      this.camera.updateProjectionMatrix();
    }

    // Update controls
    this.controls.update();

    // Notify progress
    this.onUpdateCallback?.(progress);

    // Check if complete
    if (rawProgress >= 1) {
      this.isAnimating = false;
      this.animationId = null;
      this.onCompleteCallback?.();
      this.onCompleteCallback = undefined;
      this.onUpdateCallback = undefined;
      return;
    }

    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  };

  /**
   * Get current camera state
   */
  getCurrentState(): CameraState {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      fov: this.camera.fov,
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stop();
  }
}

export default CameraAnimator;
