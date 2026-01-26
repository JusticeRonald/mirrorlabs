import * as THREE from 'three';
import type { AnnotationData } from './AnnotationRenderer';

/**
 * Annotation with screen position
 */
export interface AnnotationWithScreenPos {
  data: AnnotationData;
  worldPosition: THREE.Vector3;
  screenPosition: THREE.Vector2;
  isVisible: boolean;
}

/**
 * Cluster of annotations
 */
export interface AnnotationCluster {
  id: string;
  annotations: AnnotationWithScreenPos[];
  center: THREE.Vector2;
  worldCenter: THREE.Vector3;
  isExpanded: boolean;
}

/**
 * AnnotationClusterer - Groups overlapping annotation markers
 *
 * When multiple annotation markers are close together on screen, they can
 * overlap and become unreadable. This class groups nearby markers into
 * clusters that can be expanded to show individual items.
 *
 * Features:
 * - Dynamic clustering based on screen distance
 * - Cluster expansion with radial arrangement
 * - Frustum culling (hide off-screen markers)
 */
export class AnnotationClusterer {
  /** Screen distance threshold for clustering (in pixels) */
  private clusterThreshold: number;

  /** Currently expanded cluster ID */
  private expandedClusterId: string | null = null;

  /** Radius for expanded cluster arrangement (in pixels) */
  private expandedRadius: number;

  constructor(options?: { clusterThreshold?: number; expandedRadius?: number }) {
    this.clusterThreshold = options?.clusterThreshold ?? 40;
    this.expandedRadius = options?.expandedRadius ?? 60;
  }

  /**
   * Update annotations and calculate clusters
   *
   * @param annotations - Array of annotations with world positions
   * @param camera - The camera to project positions
   * @param screenWidth - Viewport width in pixels
   * @param screenHeight - Viewport height in pixels
   * @returns Array of clusters
   */
  updateClusters(
    annotations: Array<{ data: AnnotationData; position: THREE.Vector3 }>,
    camera: THREE.Camera,
    screenWidth: number,
    screenHeight: number
  ): AnnotationCluster[] {
    // Calculate screen positions for all annotations
    const annotationsWithScreen: AnnotationWithScreenPos[] = annotations.map(
      ({ data, position }) => {
        const screenPos = this.projectToScreen(
          position,
          camera,
          screenWidth,
          screenHeight
        );

        return {
          data,
          worldPosition: position.clone(),
          screenPosition: screenPos.position,
          isVisible: screenPos.isVisible,
        };
      }
    );

    // Filter to only visible annotations
    const visibleAnnotations = annotationsWithScreen.filter((a) => a.isVisible);

    // Build clusters
    const clusters = this.buildClusters(visibleAnnotations);

    // Mark the expanded cluster
    clusters.forEach((cluster) => {
      cluster.isExpanded = cluster.id === this.expandedClusterId;
    });

    return clusters;
  }

  /**
   * Project 3D position to screen coordinates
   */
  private projectToScreen(
    position: THREE.Vector3,
    camera: THREE.Camera,
    screenWidth: number,
    screenHeight: number
  ): { position: THREE.Vector2; isVisible: boolean } {
    const vector = position.clone().project(camera);

    // Check if behind camera
    if (vector.z > 1) {
      return { position: new THREE.Vector2(-1000, -1000), isVisible: false };
    }

    // Convert to screen coordinates
    const x = ((vector.x + 1) / 2) * screenWidth;
    const y = ((-vector.y + 1) / 2) * screenHeight;

    // Check if on screen (with padding)
    const padding = 100;
    const isVisible =
      x >= -padding &&
      x <= screenWidth + padding &&
      y >= -padding &&
      y <= screenHeight + padding;

    return { position: new THREE.Vector2(x, y), isVisible };
  }

  /**
   * Build clusters using greedy nearest-neighbor approach
   */
  private buildClusters(
    annotations: AnnotationWithScreenPos[]
  ): AnnotationCluster[] {
    if (annotations.length === 0) return [];

    const clusters: AnnotationCluster[] = [];
    const assigned = new Set<string>();

    // Sort by position for consistent clustering
    const sorted = [...annotations].sort(
      (a, b) =>
        a.screenPosition.x - b.screenPosition.x ||
        a.screenPosition.y - b.screenPosition.y
    );

    for (const annotation of sorted) {
      if (assigned.has(annotation.data.id)) continue;

      // Start a new cluster with this annotation
      const cluster: AnnotationCluster = {
        id: `cluster-${annotation.data.id}`,
        annotations: [annotation],
        center: annotation.screenPosition.clone(),
        worldCenter: annotation.worldPosition.clone(),
        isExpanded: false,
      };

      // Find nearby unassigned annotations
      for (const other of sorted) {
        if (other.data.id === annotation.data.id) continue;
        if (assigned.has(other.data.id)) continue;

        const distance = annotation.screenPosition.distanceTo(other.screenPosition);
        if (distance <= this.clusterThreshold) {
          cluster.annotations.push(other);
          assigned.add(other.data.id);
        }
      }

      assigned.add(annotation.data.id);

      // Recalculate cluster center
      this.updateClusterCenter(cluster);

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Update cluster center position
   */
  private updateClusterCenter(cluster: AnnotationCluster): void {
    if (cluster.annotations.length === 0) return;

    const screenCenter = new THREE.Vector2();
    const worldCenter = new THREE.Vector3();

    for (const annotation of cluster.annotations) {
      screenCenter.add(annotation.screenPosition);
      worldCenter.add(annotation.worldPosition);
    }

    screenCenter.divideScalar(cluster.annotations.length);
    worldCenter.divideScalar(cluster.annotations.length);

    cluster.center = screenCenter;
    cluster.worldCenter = worldCenter;
  }

  /**
   * Get positions for expanded cluster items (radial arrangement)
   *
   * @param cluster - The cluster to expand
   * @returns Array of {id, position} for each annotation in the cluster
   */
  getExpandedPositions(
    cluster: AnnotationCluster
  ): Array<{ id: string; position: THREE.Vector2 }> {
    const count = cluster.annotations.length;
    if (count === 0) return [];

    if (count === 1) {
      return [
        {
          id: cluster.annotations[0].data.id,
          position: cluster.center.clone(),
        },
      ];
    }

    // Arrange in a circle around the center
    const angleStep = (Math.PI * 2) / count;
    const startAngle = -Math.PI / 2; // Start from top

    return cluster.annotations.map((annotation, index) => {
      const angle = startAngle + index * angleStep;
      const x = cluster.center.x + Math.cos(angle) * this.expandedRadius;
      const y = cluster.center.y + Math.sin(angle) * this.expandedRadius;

      return {
        id: annotation.data.id,
        position: new THREE.Vector2(x, y),
      };
    });
  }

  /**
   * Expand a cluster (show individual markers)
   */
  expandCluster(clusterId: string): void {
    this.expandedClusterId = clusterId;
  }

  /**
   * Collapse the currently expanded cluster
   */
  collapseCluster(): void {
    this.expandedClusterId = null;
  }

  /**
   * Toggle cluster expansion
   */
  toggleCluster(clusterId: string): void {
    if (this.expandedClusterId === clusterId) {
      this.expandedClusterId = null;
    } else {
      this.expandedClusterId = clusterId;
    }
  }

  /**
   * Get the currently expanded cluster ID
   */
  getExpandedClusterId(): string | null {
    return this.expandedClusterId;
  }

  /**
   * Check if a cluster is expanded
   */
  isClusterExpanded(clusterId: string): boolean {
    return this.expandedClusterId === clusterId;
  }

  /**
   * Set the clustering threshold
   */
  setClusterThreshold(threshold: number): void {
    this.clusterThreshold = threshold;
  }

  /**
   * Set the expanded cluster radius
   */
  setExpandedRadius(radius: number): void {
    this.expandedRadius = radius;
  }

  /**
   * Reset state
   */
  reset(): void {
    this.expandedClusterId = null;
  }
}

export default AnnotationClusterer;
