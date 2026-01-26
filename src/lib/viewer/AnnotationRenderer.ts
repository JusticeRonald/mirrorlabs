import * as THREE from 'three';
import type { AnnotationType, AnnotationStatus } from '@/types/viewer';

// Re-export for backward compatibility
export type { AnnotationType, AnnotationStatus };

/**
 * Data associated with an annotation marker
 */
export interface AnnotationData {
  id: string;
  scanId: string;
  type: AnnotationType;
  status: AnnotationStatus;
  content: string;
  createdBy: string;
  /** Display name of the creator (resolved from profile) */
  createdByName?: string;
  createdAt: string;
  replyCount?: number;
  /** Camera snapshot for fly-to feature */
  cameraSnapshot?: {
    position: THREE.Vector3;
    target: THREE.Vector3;
    fov: number;
  };
}

/**
 * Visual state of annotation marker
 */
export type MarkerState = 'default' | 'hovered' | 'selected' | 'occluded';

/**
 * Status colors matching construction industry standards (Bluebeam-style)
 */
export const STATUS_COLORS: Record<AnnotationStatus, number> = {
  open: 0xEF4444,       // Red - Needs attention
  in_progress: 0xF59E0B, // Yellow/Amber - Being worked on
  resolved: 0x22C55E,    // Green - Complete
  reopened: 0xF97316,    // Orange - Reopened issue
  archived: 0x6B7280,    // Gray - Archived
};

/**
 * Configuration for marker visual appearance
 */
export interface MarkerConfig {
  /** Sphere radius (default: 0.15) */
  sphereRadius: number;
  /** Cone height (default: 0.2) */
  coneHeight: number;
  /** Cone radius (default: 0.06) */
  coneRadius: number;
  /** Emissive intensity for glow effect (default: 0.3) */
  emissiveIntensity: number;
  /** Hover scale multiplier (default: 1.2) */
  hoverScale: number;
  /** Selected scale multiplier (default: 1.4) */
  selectedScale: number;
  /** Occluded opacity (default: 0.4) */
  occludedOpacity: number;
}

const DEFAULT_MARKER_CONFIG: MarkerConfig = {
  sphereRadius: 0.15,
  coneHeight: 0.2,
  coneRadius: 0.06,
  emissiveIntensity: 0.3,
  hoverScale: 1.2,
  selectedScale: 1.4,
  occludedOpacity: 0.4,
};

/**
 * AnnotationRenderer - Manages 3D annotation markers in the scene
 *
 * Creates pin-style markers (sphere head + cone shaft) with:
 * - Status-based colors (red/yellow/green)
 * - Hover and selection states
 * - Occlusion handling (fade when behind geometry)
 * - Screen-space scaling (consistent marker size regardless of distance)
 */
export class AnnotationRenderer {
  private scene: THREE.Scene;
  private parentObject: THREE.Object3D;
  private markers: Map<string, THREE.Group>;
  private config: MarkerConfig;

  // Shared geometries for performance
  private sphereGeometry: THREE.SphereGeometry;
  private coneGeometry: THREE.ConeGeometry;

  // Current state
  private hoveredId: string | null = null;
  private selectedId: string | null = null;

  constructor(scene: THREE.Scene, config: Partial<MarkerConfig> = {}) {
    this.scene = scene;
    this.parentObject = scene; // Default to scene
    this.markers = new Map();
    this.config = { ...DEFAULT_MARKER_CONFIG, ...config };

    // Create shared geometries
    this.sphereGeometry = new THREE.SphereGeometry(
      this.config.sphereRadius,
      16,
      12
    );
    this.coneGeometry = new THREE.ConeGeometry(
      this.config.coneRadius,
      this.config.coneHeight,
      8
    );
  }

  /**
   * Set the parent object for annotations (e.g., splat mesh).
   * When set, annotations will transform with the parent.
   */
  setParentObject(parent: THREE.Object3D | null): void {
    const newParent = parent ?? this.scene;
    if (newParent === this.parentObject) return;

    // Re-parent existing markers
    this.markers.forEach((marker) => {
      this.parentObject.remove(marker);
      newParent.add(marker);
    });

    this.parentObject = newParent;
  }

  /**
   * Get the current parent object
   */
  getParentObject(): THREE.Object3D {
    return this.parentObject;
  }

  /**
   * Get annotation marker position in world space (for HTML overlay)
   */
  getMarkerWorldPosition(id: string): THREE.Vector3 | null {
    const marker = this.markers.get(id);
    if (!marker) return null;

    // Use getWorldPosition() which correctly applies all ancestor transforms
    const worldPos = new THREE.Vector3();
    marker.getWorldPosition(worldPos);
    return worldPos;
  }

  /**
   * Create and add an annotation marker to the scene
   */
  addAnnotation(
    position: THREE.Vector3,
    data: AnnotationData
  ): THREE.Group {
    // Remove existing marker with same ID if present
    if (this.markers.has(data.id)) {
      this.removeAnnotation(data.id);
    }

    const color = STATUS_COLORS[data.status] || STATUS_COLORS.open;
    const marker = this.createMarker(color, data);

    // Convert world position to parent's local space
    const localPosition = position.clone();
    this.parentObject.worldToLocal(localPosition);
    marker.position.copy(localPosition);

    // Store data in userData for picking
    marker.userData = {
      type: 'annotation',
      id: data.id,
      data,
    };

    // Add to parent object and tracking
    this.parentObject.add(marker);
    this.markers.set(data.id, marker);

    return marker;
  }

  /**
   * Create an invisible position tracker for annotations
   *
   * Note: Visible 3D geometry (sphere + cone) has been removed.
   * The HTML overlay (AnnotationIconOverlay) handles all visual rendering.
   * This empty group is kept for:
   * - Position tracking via getMarkerWorldPosition()
   * - Transform parenting (annotations follow splat rotation)
   */
  private createMarker(_color: number, data: AnnotationData): THREE.Group {
    const group = new THREE.Group();
    group.name = `annotation-${data.id}`;
    // No visible geometry - HTML overlay handles rendering
    return group;
  }

  /**
   * Update an annotation's visual appearance
   */
  updateAnnotation(id: string, updates: Partial<AnnotationData>): void {
    const marker = this.markers.get(id);
    if (!marker) return;

    const currentData = marker.userData.data as AnnotationData;
    const newData = { ...currentData, ...updates };
    marker.userData.data = newData;

    // Update color if status changed (for non-HTML-overlay modes)
    if (updates.status && updates.status !== currentData.status) {
      const newColor = STATUS_COLORS[updates.status];
      this.updateMarkerColor(marker, newColor);
    }
    // Note: Reply badge removed - HTML overlay handles reply count display
  }

  /**
   * Update an annotation marker's position (for drag-to-reposition)
   * @param id Annotation ID
   * @param worldPosition New world position
   */
  updatePosition(id: string, worldPosition: THREE.Vector3): void {
    const marker = this.markers.get(id);
    if (!marker) return;

    // Convert world position to parent's local space
    const localPosition = worldPosition.clone();
    this.parentObject.worldToLocal(localPosition);
    marker.position.copy(localPosition);
  }

  /**
   * Update marker color (for status changes)
   */
  private updateMarkerColor(marker: THREE.Group, color: number): void {
    marker.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name !== 'reply-badge') {
        const material = child.material as THREE.MeshStandardMaterial;
        material.color.setHex(color);
        if (material.emissive) {
          material.emissive.setHex(color);
        }
      }
    });
  }

  /**
   * Remove an annotation from the scene
   */
  removeAnnotation(id: string): void {
    const marker = this.markers.get(id);
    if (!marker) return;

    // Remove from parent object
    this.parentObject.remove(marker);

    // Dispose of geometries and materials
    marker.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Don't dispose shared geometries
        if (child.geometry !== this.sphereGeometry && child.geometry !== this.coneGeometry) {
          child.geometry?.dispose();
        }
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.markers.delete(id);

    // Clear state if this was hovered/selected
    if (this.hoveredId === id) this.hoveredId = null;
    if (this.selectedId === id) this.selectedId = null;
  }

  /**
   * Set the hovered annotation
   */
  setHovered(id: string | null): void {
    // Unhover previous
    if (this.hoveredId && this.hoveredId !== id) {
      const prevMarker = this.markers.get(this.hoveredId);
      if (prevMarker) {
        this.applyState(prevMarker, this.selectedId === this.hoveredId ? 'selected' : 'default');
      }
    }

    this.hoveredId = id;

    // Apply hover to new
    if (id) {
      const marker = this.markers.get(id);
      if (marker) {
        this.applyState(marker, 'hovered');
      }
    }
  }

  /**
   * Set the selected annotation
   */
  setSelected(id: string | null): void {
    // Unselect previous
    if (this.selectedId && this.selectedId !== id) {
      const prevMarker = this.markers.get(this.selectedId);
      if (prevMarker) {
        this.applyState(prevMarker, this.hoveredId === this.selectedId ? 'hovered' : 'default');
      }
    }

    this.selectedId = id;

    // Apply selection to new
    if (id) {
      const marker = this.markers.get(id);
      if (marker) {
        this.applyState(marker, 'selected');
      }
    }
  }

  /**
   * Apply visual state to a marker
   */
  private applyState(marker: THREE.Group, state: MarkerState): void {
    let scale = 1;
    let opacity = 1;
    let emissiveMultiplier = 1;

    switch (state) {
      case 'hovered':
        scale = this.config.hoverScale;
        emissiveMultiplier = 1.5;
        break;
      case 'selected':
        scale = this.config.selectedScale;
        emissiveMultiplier = 2;
        break;
      case 'occluded':
        opacity = this.config.occludedOpacity;
        break;
      case 'default':
      default:
        scale = 1;
        opacity = 1;
        emissiveMultiplier = 1;
    }

    // Apply scale
    marker.scale.setScalar(scale);

    // Apply opacity and emissive
    marker.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material.transparent !== undefined) {
          material.opacity = opacity;
        }
        if (material.emissiveIntensity !== undefined) {
          material.emissiveIntensity = this.config.emissiveIntensity * emissiveMultiplier;
        }
      }
    });
  }

  /**
   * Update occlusion state for all markers
   * Call this each frame or when camera moves significantly
   */
  updateOcclusion(
    camera: THREE.Camera,
    checkOcclusion: (position: THREE.Vector3) => boolean
  ): void {
    this.markers.forEach((marker, id) => {
      const isOccluded = !checkOcclusion(marker.position);
      const isHovered = this.hoveredId === id;
      const isSelected = this.selectedId === id;

      if (isOccluded && !isSelected && !isHovered) {
        this.applyState(marker, 'occluded');
      } else if (isSelected) {
        this.applyState(marker, 'selected');
      } else if (isHovered) {
        this.applyState(marker, 'hovered');
      } else {
        this.applyState(marker, 'default');
      }
    });
  }

  /**
   * Get all marker objects for raycasting
   */
  getMarkerObjects(): THREE.Object3D[] {
    return Array.from(this.markers.values());
  }

  /**
   * Get a marker by ID
   */
  getMarker(id: string): THREE.Group | undefined {
    return this.markers.get(id);
  }

  /**
   * Get annotation data by ID
   */
  getAnnotationData(id: string): AnnotationData | undefined {
    const marker = this.markers.get(id);
    return marker?.userData.data as AnnotationData | undefined;
  }

  /**
   * Get all annotation IDs
   */
  getAnnotationIds(): string[] {
    return Array.from(this.markers.keys());
  }

  /**
   * Get the currently selected annotation ID
   */
  getSelectedId(): string | null {
    return this.selectedId;
  }

  /**
   * Get the currently hovered annotation ID
   */
  getHoveredId(): string | null {
    return this.hoveredId;
  }

  /**
   * Clear all annotations
   */
  clear(): void {
    const ids = Array.from(this.markers.keys());
    ids.forEach((id) => this.removeAnnotation(id));
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();
    this.sphereGeometry.dispose();
    this.coneGeometry.dispose();
  }
}

export default AnnotationRenderer;
