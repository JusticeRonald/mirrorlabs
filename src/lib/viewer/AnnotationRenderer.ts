import * as THREE from 'three';

/**
 * Status types for annotations matching the database schema
 */
export type AnnotationStatus = 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived';

/**
 * Types of annotations
 */
export type AnnotationType = 'pin' | 'comment' | 'markup';

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

    // Position the marker
    marker.position.copy(position);

    // Store data in userData for picking
    marker.userData = {
      type: 'annotation',
      id: data.id,
      data,
    };

    // Add to scene and tracking
    this.scene.add(marker);
    this.markers.set(data.id, marker);

    return marker;
  }

  /**
   * Create a pin marker with sphere head and cone shaft
   */
  private createMarker(color: number, data: AnnotationData): THREE.Group {
    const group = new THREE.Group();
    group.name = `annotation-${data.id}`;

    // Sphere (selection target - the pin head)
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: this.config.emissiveIntensity,
      metalness: 0.2,
      roughness: 0.8,
      transparent: true,
      opacity: 1.0,
    });
    const sphere = new THREE.Mesh(this.sphereGeometry, sphereMaterial);
    sphere.name = 'pin-head';
    sphere.position.y = this.config.coneHeight + this.config.sphereRadius;
    group.add(sphere);

    // Cone (the pin shaft)
    const coneMaterial = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.2,
      roughness: 0.8,
      transparent: true,
      opacity: 1.0,
    });
    const cone = new THREE.Mesh(this.coneGeometry, coneMaterial);
    cone.name = 'pin-shaft';
    // Rotate cone to point downward and position it
    cone.rotation.x = Math.PI;
    cone.position.y = this.config.coneHeight / 2;
    group.add(cone);

    // Add badge for reply count (if any)
    if (data.replyCount && data.replyCount > 0) {
      this.addReplyBadge(group, data.replyCount);
    }

    return group;
  }

  /**
   * Add a small badge showing reply count
   */
  private addReplyBadge(group: THREE.Group, count: number): void {
    // Create a small sphere as a badge
    const badgeGeometry = new THREE.SphereGeometry(0.08, 8, 6);
    const badgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x3B82F6, // Blue
      emissive: 0x3B82F6,
      emissiveIntensity: 0.5,
    });
    const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
    badge.name = 'reply-badge';
    badge.position.set(
      this.config.sphereRadius,
      this.config.coneHeight + this.config.sphereRadius * 2,
      0
    );
    group.add(badge);
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

    // Update color if status changed
    if (updates.status && updates.status !== currentData.status) {
      const newColor = STATUS_COLORS[updates.status];
      this.updateMarkerColor(marker, newColor);
    }

    // Update reply badge
    if (updates.replyCount !== undefined) {
      this.updateReplyBadge(marker, updates.replyCount);
    }
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
   * Update reply badge count
   */
  private updateReplyBadge(marker: THREE.Group, count: number): void {
    // Remove existing badge
    const existingBadge = marker.getObjectByName('reply-badge');
    if (existingBadge) {
      marker.remove(existingBadge);
      (existingBadge as THREE.Mesh).geometry?.dispose();
      const mat = (existingBadge as THREE.Mesh).material;
      if (mat instanceof THREE.Material) mat.dispose();
    }

    // Add new badge if count > 0
    if (count > 0) {
      this.addReplyBadge(marker, count);
    }
  }

  /**
   * Remove an annotation from the scene
   */
  removeAnnotation(id: string): void {
    const marker = this.markers.get(id);
    if (!marker) return;

    // Remove from scene
    this.scene.remove(marker);

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
