import * as THREE from 'three';
import type { TransformAxis } from '@/types/viewer';

/**
 * Axis colors matching Three.js TransformControls convention
 */
const AXIS_COLORS: Record<string, number> = {
  X: 0xff0000, // Red
  Y: 0x00ff00, // Green
  Z: 0x0000ff, // Blue
};

/**
 * Provides Godot-style visual feedback during rotation gizmo interaction.
 * Shows:
 * 1. A filled arc (sector) showing rotation amount
 * 2. A text label displaying angle in degrees
 */
export class RotationGizmoFeedback {
  private scene: THREE.Scene;
  private arcMesh: THREE.Mesh | null = null;
  private labelSprite: THREE.Sprite | null = null;
  private arcGroup: THREE.Group | null = null;

  private activeAxis: TransformAxis = null;
  private initialQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private worldPosition: THREE.Vector3 = new THREE.Vector3();

  // Cumulative rotation tracking for 360°+ support
  private previousQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private cumulativeAngle: number = 0;

  private arcRadius = 0.75;  // Dynamic, set by gizmo size

  // Reusable canvas for label sprites (avoids DOM allocation on every update)
  private labelCanvas: HTMLCanvasElement | null = null;
  private labelCtx: CanvasRenderingContext2D | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Start showing rotation feedback
   * @param axis - The axis being rotated (X, Y, Z)
   * @param startQuaternion - The object's quaternion at drag start
   * @param worldPosition - The world position of the object being rotated
   * @param gizmoSize - The size of the transform gizmo (default 0.75)
   */
  startRotation(axis: TransformAxis, startQuaternion: THREE.Quaternion, worldPosition: THREE.Vector3, gizmoSize = 0.75): void {
    // Only show feedback for single-axis rotation
    if (!axis || !['X', 'Y', 'Z'].includes(axis)) {
      return;
    }

    this.arcRadius = gizmoSize * 0.6;  // 60% of gizmo size to keep arc contained
    this.activeAxis = axis;
    this.initialQuaternion.copy(startQuaternion);
    this.worldPosition.copy(worldPosition);

    // Initialize cumulative rotation tracking
    this.previousQuaternion.copy(startQuaternion);
    this.cumulativeAngle = 0;

    // Create a group to hold arc and label
    this.arcGroup = new THREE.Group();
    this.arcGroup.position.copy(worldPosition);
    this.scene.add(this.arcGroup);

    // Create initial arc (will be updated in updateRotation)
    this.createArc(0);
    this.createLabel(0);
  }

  /**
   * Update the feedback display during rotation
   * @param currentQuaternion - The object's current quaternion
   */
  updateRotation(currentQuaternion: THREE.Quaternion): void {
    if (!this.activeAxis || !this.arcGroup) {
      return;
    }

    // Calculate small delta from PREVIOUS frame (not initial)
    // Frame-to-frame deltas are always small, so quaternion shortest-path isn't an issue
    const frameDelta = this.calculateFrameDelta(currentQuaternion);

    // Accumulate the delta for unlimited rotation tracking
    this.cumulativeAngle += frameDelta;

    // Update previous quaternion for next frame
    this.previousQuaternion.copy(currentQuaternion);

    // Update visuals with cumulative angle
    this.updateArc(this.cumulativeAngle);
    this.updateLabel(this.cumulativeAngle);
  }

  /**
   * End rotation feedback and clean up visuals
   */
  endRotation(): void {
    this.cleanup();
    this.activeAxis = null;
    this.cumulativeAngle = 0;
  }

  /**
   * Clean up all Three.js resources
   */
  dispose(): void {
    this.cleanup();
  }

  /**
   * Calculate rotation delta from previous frame to current frame.
   * Frame-to-frame deltas are always small, so quaternion shortest-path isn't an issue.
   * This allows unlimited accumulation for 360°+ rotations.
   */
  private calculateFrameDelta(currentQuaternion: THREE.Quaternion): number {
    if (!this.activeAxis) return 0;

    // Delta from previous frame: deltaQ = currentQ * prevQ^(-1)
    const deltaQuat = currentQuaternion.clone()
      .multiply(this.previousQuaternion.clone().invert());

    // Extract angle from delta quaternion
    let angle = 2 * Math.acos(Math.max(-1, Math.min(1, deltaQuat.w)));

    // Handle near-zero rotation
    if (angle < 0.0001) return 0;

    // Get the rotation axis from the quaternion
    const sinHalfAngle = Math.sqrt(1 - deltaQuat.w * deltaQuat.w);
    if (sinHalfAngle < 0.0001) return 0;

    const axis = new THREE.Vector3(
      deltaQuat.x / sinHalfAngle,
      deltaQuat.y / sinHalfAngle,
      deltaQuat.z / sinHalfAngle
    );

    // Determine sign based on active axis component
    const axisMap: Record<string, number> = { X: axis.x, Y: axis.y, Z: axis.z };
    const axisComponent = axisMap[this.activeAxis];

    if (axisComponent < 0) {
      angle = -angle;
    }

    // NO normalization - allow unlimited accumulation
    return angle;
  }

  /**
   * Create the arc geometry as a filled sector
   */
  private createArc(angle: number): void {
    if (!this.arcGroup || !this.activeAxis) return;

    const geometry = this.createArcGeometry(0, angle, this.arcRadius);
    const material = new THREE.MeshBasicMaterial({
      color: AXIS_COLORS[this.activeAxis] ?? 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthTest: false,
    });

    this.arcMesh = new THREE.Mesh(geometry, material);
    this.arcMesh.renderOrder = 999;

    // Orient arc based on rotation axis
    this.orientArc();

    this.arcGroup.add(this.arcMesh);
  }

  /**
   * Update the arc to show current rotation amount
   */
  private updateArc(angle: number): void {
    if (!this.arcMesh || !this.arcGroup || !this.activeAxis) return;

    // Remove old mesh
    this.arcGroup.remove(this.arcMesh);
    this.arcMesh.geometry.dispose();

    // Create new geometry with updated angle
    const geometry = this.createArcGeometry(0, angle, this.arcRadius);
    this.arcMesh.geometry = geometry;

    // Re-orient arc
    this.orientArc();

    this.arcGroup.add(this.arcMesh);
  }

  /**
   * Orient the arc mesh based on the active rotation axis
   */
  private orientArc(): void {
    if (!this.arcMesh || !this.activeAxis) return;

    // Reset rotation first
    this.arcMesh.rotation.set(0, 0, 0);

    switch (this.activeAxis) {
      case 'X':
        // YZ plane - rotate around Y
        this.arcMesh.rotation.y = Math.PI / 2;
        break;
      case 'Y':
        // XZ plane - rotate around X
        this.arcMesh.rotation.x = -Math.PI / 2;
        break;
      case 'Z':
        // XY plane - no rotation needed
        break;
    }
  }

  /**
   * Create arc geometry as a filled pie-slice shape
   * Arc starts from vertical (top) instead of horizontal (right)
   */
  private createArcGeometry(startAngle: number, endAngle: number, radius: number): THREE.BufferGeometry {
    // Handle zero-angle case
    if (Math.abs(endAngle - startAngle) < 0.001) {
      return new THREE.BufferGeometry();
    }

    // Offset by PI/2 to start arc from vertical (top) instead of horizontal (right)
    const verticalOffset = Math.PI / 2;
    const adjStart = startAngle + verticalOffset;
    const adjEnd = endAngle + verticalOffset;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0); // Center point

    // Direction based on sign of cumulative angle (endAngle contains the cumulative rotation)
    const clockwise = endAngle < 0;

    shape.absarc(0, 0, radius, adjStart, adjEnd, clockwise);
    shape.lineTo(0, 0); // Close to center

    // More segments for smoother arc
    const segments = Math.max(8, Math.ceil(Math.abs(adjEnd - adjStart) * 16));
    return new THREE.ShapeGeometry(shape, segments);
  }

  /**
   * Create the text label sprite
   */
  private createLabel(angle: number): void {
    if (!this.arcGroup) return;

    const degrees = (angle * 180) / Math.PI;
    this.labelSprite = this.createLabelSprite(degrees);
    this.positionLabel(angle);
    this.arcGroup.add(this.labelSprite);
  }

  /**
   * Update the label text and position
   */
  private updateLabel(angle: number): void {
    if (!this.labelSprite || !this.arcGroup) return;

    // Remove old sprite
    this.arcGroup.remove(this.labelSprite);

    // Dispose old texture
    const material = this.labelSprite.material as THREE.SpriteMaterial;
    material.map?.dispose();
    material.dispose();

    // Create new sprite with updated value
    const degrees = (angle * 180) / Math.PI;
    this.labelSprite = this.createLabelSprite(degrees);
    this.positionLabel(angle);
    this.arcGroup.add(this.labelSprite);
  }

  /**
   * Position the label at the gizmo center
   * Label stays fixed at the center (0,0,0) with a slight offset based on axis
   * to avoid z-fighting and ensure visibility
   */
  private positionLabel(_angle: number): void {
    if (!this.labelSprite || !this.activeAxis) return;

    // Position label at gizmo center with slight offset perpendicular to the rotation plane
    // This keeps the label fixed while rotating, making it easier to read
    const offset = 0.02; // Small offset to avoid z-fighting

    switch (this.activeAxis) {
      case 'X': // YZ plane - offset along X
        this.labelSprite.position.set(offset, 0, 0);
        break;
      case 'Y': // XZ plane - offset along Y
        this.labelSprite.position.set(0, offset, 0);
        break;
      case 'Z': // XY plane - offset along Z
        this.labelSprite.position.set(0, 0, offset);
        break;
    }
  }

  /**
   * Create a canvas-based sprite for the angle label
   * Uses 2x resolution canvas with 0.5x sprite scale for sharp text.
   * Reuses a single canvas instance to avoid DOM allocation on every frame.
   */
  private createLabelSprite(angleDegrees: number): THREE.Sprite {
    // Reuse canvas instead of creating new one each frame
    if (!this.labelCanvas) {
      this.labelCanvas = document.createElement('canvas');
      this.labelCanvas.width = 256;  // 2x resolution for sharper text
      this.labelCanvas.height = 128;
      this.labelCtx = this.labelCanvas.getContext('2d');
    }

    const canvas = this.labelCanvas;
    const ctx = this.labelCtx!;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background pill (scaled up for higher res canvas)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    this.roundRect(ctx, 8, 8, 240, 112, 16);
    ctx.fill();

    // Text (larger font for higher res canvas)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${angleDegrees.toFixed(1)}°`, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.2, 0.1, 1);  // Halved scale for sharper appearance
    sprite.renderOrder = 1000;

    return sprite;
  }

  /**
   * Draw a rounded rectangle path (polyfill for older browsers)
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Clean up Three.js objects
   */
  private cleanup(): void {
    if (this.arcMesh) {
      this.arcMesh.geometry.dispose();
      (this.arcMesh.material as THREE.Material).dispose();
      this.arcMesh = null;
    }

    if (this.labelSprite) {
      const material = this.labelSprite.material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.dispose();
      this.labelSprite = null;
    }

    if (this.arcGroup) {
      this.scene.remove(this.arcGroup);
      this.arcGroup = null;
    }

    // Release canvas references (allow GC when feedback is disposed)
    this.labelCanvas = null;
    this.labelCtx = null;
  }
}
