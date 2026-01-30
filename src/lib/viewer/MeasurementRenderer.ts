import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import earcut from 'earcut';
import { MeasurementCalculator, type MeasurementUnit } from './MeasurementCalculator';
import type { MeasurementType } from '@/types/viewer';

/**
 * Data associated with a measurement
 */
export interface MeasurementData {
  id: string;
  type: MeasurementType;
  points: THREE.Vector3[];
  value: number;
  unit: MeasurementUnit;
  label?: string;
  createdBy: string;
  createdAt: string;
}

/**
 * Visual state of a measurement
 */
export type MeasurementState = 'default' | 'hovered' | 'selected' | 'preview';

/**
 * Colors for measurement visualization
 * Note: 3D point markers removed - using HTML overlays (MeasurementMarker.tsx)
 */
export const MEASUREMENT_COLORS = {
  distance: 0x3B82F6,      // Blue
  area: 0x8B5CF6,          // Purple
  angle: 0xF59E0B,         // Amber
  preview: 0x94A3B8,       // Slate (for in-progress measurements)
  hover: 0x60A5FA,         // Lighter blue
  selected: 0x2563EB,      // Darker blue
};

/**
 * Configuration for measurement visual appearance
 */
export interface MeasurementConfig {
  /** Line width in pixels (default: 3) */
  lineWidth: number;
  /** Area fill opacity (default: 0.2) */
  areaFillOpacity: number;
  /** Hover scale (default: 1.1) */
  hoverScale: number;
  /** Selected scale (default: 1.2) */
  selectedScale: number;
}

const DEFAULT_CONFIG: MeasurementConfig = {
  lineWidth: 3,
  areaFillOpacity: 0.35, // Increased from 0.2 for better visibility
  hoverScale: 1.1,
  selectedScale: 1.2,
};

/**
 * MeasurementRenderer - Renders distance lines and area polygons
 *
 * Uses Three.js Line2 for thick lines with black outline + white main line.
 * 3D point markers are replaced with HTML overlays (see MeasurementMarker.tsx).
 * Labels removed - values shown in MeasurementsTab UI panel instead.
 */
export class MeasurementRenderer {
  private scene: THREE.Scene;
  private parentObject: THREE.Object3D;
  private measurements: Map<string, THREE.Group>;
  private config: MeasurementConfig;

  // Resolution for Line2 materials
  private resolution: THREE.Vector2 = new THREE.Vector2(window.innerWidth, window.innerHeight);

  // Current state
  private hoveredId: string | null = null;
  private selectedId: string | null = null;

  // Preview measurement (in-progress)
  private previewGroup: THREE.Group | null = null;

  // Preview animation state
  private previewAnimationId: number | null = null;
  private previewLine: Line2 | null = null;
  private previewLineMaterial: LineMaterial | null = null;

  // Debounce timer for resize handler
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Visibility state
  private visible: boolean = true;

  constructor(scene: THREE.Scene, config: Partial<MeasurementConfig> = {}) {
    this.scene = scene;
    this.parentObject = scene; // Default to scene
    this.measurements = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Handle window resize for Line2 resolution
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Set the parent object for measurements (e.g., splat mesh).
   * When set, measurements will transform with the parent.
   */
  setParentObject(parent: THREE.Object3D | null): void {
    const newParent = parent ?? this.scene;
    if (newParent === this.parentObject) return;
    const oldParent = this.parentObject;

    // Re-parent existing measurements, converting stored points between local spaces
    this.measurements.forEach((group) => {
      const data = group.userData.data as MeasurementData;
      if (data?.points) {
        // Convert stored points: old local → world → new local
        data.points = data.points.map(p => {
          const worldPos = p.clone();
          oldParent.localToWorld(worldPos);
          newParent.worldToLocal(worldPos);
          return worldPos;
        });

        // Rebuild Line2 geometry, labels, and area fill to match converted points
        if (data.type === 'distance' && data.points.length === 2) {
          const p1 = data.points[0];
          const p2 = data.points[1];
          group.traverse((child) => {
            if (child instanceof Line2) {
              const geometry = child.geometry as LineGeometry;
              geometry.setPositions([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]);
              child.computeLineDistances();
            }
          });
        } else if (data.type === 'area' && data.points.length >= 3) {
          const outlinePoints = [...data.points, data.points[0]];
          const positions: number[] = [];
          outlinePoints.forEach(p => positions.push(p.x, p.y, p.z));
          group.traverse((child) => {
            if (child instanceof Line2) {
              const geometry = child.geometry as LineGeometry;
              geometry.setPositions(positions);
              child.computeLineDistances();
            }
            if (child instanceof THREE.Mesh && child.name === 'area-fill') {
              const newFillGeometry = this.createPolygonGeometry(data.points);
              if (newFillGeometry) {
                child.geometry.dispose();
                child.geometry = newFillGeometry;
              }
            }
          });
        }
      }
      oldParent.remove(group);
      newParent.add(group);
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
   * Apply a world-space transform to all measurement positions.
   * Used when the parent mesh was transformed while measurements were scene-parented.
   * Call BEFORE setParentObject() when switching back from point cloud mode.
   *
   * @param deltaMatrix The transform delta to apply (currentMeshMatrix × storedMeshMatrix⁻¹)
   */
  applyWorldTransform(deltaMatrix: THREE.Matrix4): void {
    // Only apply if currently parented to scene (world coords)
    if (this.parentObject !== this.scene) return;

    this.measurements.forEach((group) => {
      const data = group.userData.data as MeasurementData;
      if (data?.points) {
        // Transform stored world-space points by the delta
        data.points = data.points.map(p => p.clone().applyMatrix4(deltaMatrix));

        // Rebuild geometry with updated points
        if (data.type === 'distance' && data.points.length === 2) {
          const p1 = data.points[0];
          const p2 = data.points[1];
          group.traverse((child) => {
            if (child instanceof Line2) {
              const geometry = child.geometry as LineGeometry;
              geometry.setPositions([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]);
              child.computeLineDistances();
            }
          });
        } else if (data.type === 'area' && data.points.length >= 3) {
          const outlinePoints = [...data.points, data.points[0]];
          const positions: number[] = [];
          outlinePoints.forEach(p => positions.push(p.x, p.y, p.z));
          group.traverse((child) => {
            if (child instanceof Line2) {
              const geometry = child.geometry as LineGeometry;
              geometry.setPositions(positions);
              child.computeLineDistances();
            }
            if (child instanceof THREE.Mesh && child.name === 'area-fill') {
              const newFillGeometry = this.createPolygonGeometry(data.points);
              if (newFillGeometry) {
                child.geometry.dispose();
                child.geometry = newFillGeometry;
              }
            }
          });
        }
      }
    });
  }

  /**
   * Get measurement point in world space (for HTML overlay)
   */
  getPointWorldPosition(id: string, pointIndex: number): THREE.Vector3 | null {
    const group = this.measurements.get(id);
    if (!group) return null;

    const data = group.userData.data as MeasurementData;
    if (pointIndex < 0 || pointIndex >= data.points.length) return null;

    const worldPos = data.points[pointIndex].clone();
    // Convert from parent's local space to world space
    this.parentObject.localToWorld(worldPos);
    return worldPos;
  }

  /**
   * Get the midpoint position for a distance measurement label (world space)
   */
  getDistanceLabelPosition(id: string): THREE.Vector3 | null {
    const group = this.measurements.get(id);
    if (!group) return null;

    const data = group.userData.data as MeasurementData;
    if (data.type !== 'distance' || data.points.length !== 2) return null;

    // Calculate midpoint in local space
    const midpoint = MeasurementCalculator.calculateMidpoint(data.points[0], data.points[1]);
    // Convert to world space
    this.parentObject.localToWorld(midpoint);
    return midpoint;
  }

  /**
   * Get label positions for an area measurement (world space)
   * Returns centroid for total area label and midpoints for segment labels
   */
  getAreaLabelPositions(id: string): { centroid: THREE.Vector3; segments: Array<{ position: THREE.Vector3; length: number }> } | null {
    const group = this.measurements.get(id);
    if (!group) return null;

    const data = group.userData.data as MeasurementData;
    if (data.type !== 'area' || data.points.length < 3) return null;

    // Centroid for total area label (in local space, then convert)
    const centroid = MeasurementCalculator.calculateCentroid(data.points);
    this.parentObject.localToWorld(centroid);

    // Midpoints for each segment with their lengths
    const segments: Array<{ position: THREE.Vector3; length: number }> = [];
    for (let i = 0; i < data.points.length; i++) {
      const p1 = data.points[i];
      const p2 = data.points[(i + 1) % data.points.length];

      // Calculate midpoint in local space
      const midpoint = MeasurementCalculator.calculateMidpoint(p1, p2);
      // Convert to world space
      this.parentObject.localToWorld(midpoint);

      // Calculate segment length in local space (measurement units)
      const length = MeasurementCalculator.calculateDistance(p1, p2);

      segments.push({ position: midpoint, length });
    }

    return { centroid, segments };
  }

  /**
   * Get measurement data including value and unit for display
   */
  getMeasurementDisplayData(id: string): { value: number; unit: MeasurementUnit; type: MeasurementType } | null {
    const group = this.measurements.get(id);
    if (!group) return null;

    const data = group.userData.data as MeasurementData;
    return { value: data.value, unit: data.unit, type: data.type };
  }

  /**
   * Update resolution for Line2 materials when window resizes
   * Debounced to avoid excessive updates during drag resize (fires 10+ times)
   */
  private handleResize = () => {
    // Clear existing debounce timer
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }

    // Debounce resize by 100ms
    this.resizeDebounceTimer = setTimeout(() => {
      this.resolution.set(window.innerWidth, window.innerHeight);
      // Update all line materials with new resolution
      this.measurements.forEach((group) => {
        group.traverse((child) => {
          if (child instanceof Line2) {
            const material = child.material as LineMaterial;
            material.resolution.copy(this.resolution);
          }
        });
      });
      this.resizeDebounceTimer = null;
    }, 100);
  };

  /**
   * Start animating the preview line (fast blink + flowing dashes)
   * Creates a rapid pulsing effect with dashes flowing toward cursor
   */
  private startPreviewAnimation(): void {
    if (this.previewAnimationId !== null) return;

    const CYCLE_DURATION_MS = 300; // 0.3 second cycle (very fast)
    const DASH_SPEED = -0.15; // Negative = flow toward cursor

    const animate = () => {
      if (!this.previewLineMaterial) {
        this.stopPreviewAnimation();
        return;
      }

      const now = Date.now();

      // Opacity: sawtooth 1.0 → 0.0 over 300ms
      const cycleProgress = (now % CYCLE_DURATION_MS) / CYCLE_DURATION_MS;
      this.previewLineMaterial.opacity = 1.0 - cycleProgress;

      // Dash flow: negative offset pulls toward cursor
      const elapsedSec = (now % 10000) / 1000;
      this.previewLineMaterial.dashOffset = elapsedSec * DASH_SPEED;

      this.previewLineMaterial.needsUpdate = true;
      this.previewAnimationId = requestAnimationFrame(animate);
    };

    this.previewAnimationId = requestAnimationFrame(animate);
  }

  /**
   * Stop the preview line animation
   */
  private stopPreviewAnimation(): void {
    if (this.previewAnimationId !== null) {
      cancelAnimationFrame(this.previewAnimationId);
      this.previewAnimationId = null;
    }
    this.previewLine = null;
    this.previewLineMaterial = null;
  }

  /**
   * Add a distance measurement (line between two points)
   * Note: 3D point markers are replaced with HTML overlays (MeasurementMarker.tsx)
   */
  addDistanceMeasurement(
    id: string,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    data: Omit<MeasurementData, 'type' | 'points' | 'value'>
  ): THREE.Group {
    // Remove existing measurement with same ID
    if (this.measurements.has(id)) {
      this.removeMeasurement(id);
    }

    // Convert world positions to parent's local space
    const localP1 = p1.clone();
    const localP2 = p2.clone();
    this.parentObject.worldToLocal(localP1);
    this.parentObject.worldToLocal(localP2);

    const distance = MeasurementCalculator.calculateDistance(localP1, localP2);

    const group = new THREE.Group();
    group.name = `measurement-${id}`;

    // Create thick line using Line2 with outline for visibility against splats
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([localP1.x, localP1.y, localP1.z, localP2.x, localP2.y, localP2.z]);

    // Outline line - BLACK, slightly thicker behind white line
    const outlineGeometry = new LineGeometry();
    outlineGeometry.setPositions([localP1.x, localP1.y, localP1.z, localP2.x, localP2.y, localP2.z]);

    const outlineMaterial = new LineMaterial({
      color: 0x000000,   // Black outline
      linewidth: this.config.lineWidth + 3,  // Thicker than main line
      resolution: this.resolution,
      polygonOffset: true,
      polygonOffsetFactor: -0.5,  // Slightly behind main line
      polygonOffsetUnits: -0.5,
      depthWrite: false,
      transparent: true,
    });

    const outlineLine = new Line2(outlineGeometry, outlineMaterial);
    outlineLine.computeLineDistances();
    outlineLine.name = 'measurement-outline';
    outlineLine.renderOrder = 99;  // Render just before white line
    group.add(outlineLine);

    // Main measurement line - WHITE with polygon offset for z-fighting
    const lineMaterial = new LineMaterial({
      color: 0xFFFFFF,  // White for visibility
      linewidth: this.config.lineWidth,
      resolution: this.resolution,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,  // Push forward in depth
      polygonOffsetUnits: -1.0,
      depthWrite: false,  // Don't occlude splat behind
      transparent: true,
    });

    const line = new Line2(lineGeometry, lineMaterial);
    line.computeLineDistances();
    line.name = 'measurement-line';
    line.renderOrder = 100;  // Render after splat
    group.add(line);

    // Note: 3D endpoint spheres removed - using HTML overlays instead
    // Note: Labels removed - values shown in MeasurementsTab UI panel

    // Store measurement data (in local space for transform parenting)
    group.userData = {
      type: 'measurement',
      measurementType: 'distance',
      id,
      data: {
        ...data,
        type: 'distance' as MeasurementType,
        points: [localP1.clone(), localP2.clone()],
        value: distance,
      },
    };

    this.parentObject.add(group);
    this.measurements.set(id, group);

    return group;
  }

  /**
   * Add an area measurement (polygon)
   * Note: 3D vertex markers are replaced with HTML overlays (MeasurementMarker.tsx)
   */
  addAreaMeasurement(
    id: string,
    points: THREE.Vector3[],
    data: Omit<MeasurementData, 'type' | 'points' | 'value'>
  ): THREE.Group {
    if (points.length < 3) {
      throw new Error('Area measurement requires at least 3 points');
    }

    // Remove existing measurement with same ID
    if (this.measurements.has(id)) {
      this.removeMeasurement(id);
    }

    // Convert world positions to parent's local space
    const localPoints = points.map(p => {
      const localP = p.clone();
      this.parentObject.worldToLocal(localP);
      return localP;
    });

    const area = MeasurementCalculator.calculateArea(localPoints);

    const group = new THREE.Group();
    group.name = `measurement-${id}`;

    // Create polygon outline using Line2 for thick lines with black outline for visibility
    const outlinePoints = [...localPoints, localPoints[0]]; // Close the polygon
    const positions: number[] = [];
    outlinePoints.forEach(p => {
      positions.push(p.x, p.y, p.z);
    });

    // Black outline (behind white line)
    const blackOutlineGeometry = new LineGeometry();
    blackOutlineGeometry.setPositions(positions);

    const blackOutlineMaterial = new LineMaterial({
      color: 0x000000,  // Black outline
      linewidth: this.config.lineWidth + 3,  // Thicker than main line
      resolution: this.resolution,
      polygonOffset: true,
      polygonOffsetFactor: -0.5,
      polygonOffsetUnits: -0.5,
      depthWrite: false,
      transparent: true,
    });

    const blackOutline = new Line2(blackOutlineGeometry, blackOutlineMaterial);
    blackOutline.computeLineDistances();
    blackOutline.name = 'area-black-outline';
    blackOutline.renderOrder = 99;
    group.add(blackOutline);

    // White outline (main visible line)
    const outlineGeometry = new LineGeometry();
    outlineGeometry.setPositions(positions);

    const outlineMaterial = new LineMaterial({
      color: 0xFFFFFF,  // White for visibility
      linewidth: this.config.lineWidth,
      resolution: this.resolution,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
      depthWrite: false,
      transparent: true,
    });

    const outline = new Line2(outlineGeometry, outlineMaterial);
    outline.computeLineDistances();
    outline.name = 'area-outline';
    outline.renderOrder = 100;
    group.add(outline);

    // Create semi-transparent fill using a mesh (in local space)
    const fillGeometry = this.createPolygonGeometry(localPoints);
    if (fillGeometry) {
      const fillMaterial = new THREE.MeshBasicMaterial({
        color: MEASUREMENT_COLORS.area,
        transparent: true,
        opacity: this.config.areaFillOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const fill = new THREE.Mesh(fillGeometry, fillMaterial);
      fill.name = 'area-fill';
      group.add(fill);
    }

    // Note: 3D vertex spheres removed - using HTML overlays instead
    // Note: Labels removed - values shown in MeasurementsTab UI panel

    // Store measurement data (in local space for transform parenting)
    group.userData = {
      type: 'measurement',
      measurementType: 'area',
      id,
      data: {
        ...data,
        type: 'area' as MeasurementType,
        points: localPoints.map(p => p.clone()),
        value: area,
      },
    };

    this.parentObject.add(group);
    this.measurements.set(id, group);

    return group;
  }

  /**
   * Create a triangulated geometry for a polygon using earcut algorithm
   * Supports both convex and concave (L-shaped, complex) polygons
   */
  private createPolygonGeometry(points: THREE.Vector3[]): THREE.BufferGeometry | null {
    if (points.length < 3) return null;

    // Build 3D vertices array
    const vertices: number[] = [];
    points.forEach(p => {
      vertices.push(p.x, p.y, p.z);
    });

    // For earcut, we need to project 3D points to 2D
    // Determine the best projection plane based on polygon normal
    const normal = this.calculatePolygonNormal(points);

    // Choose projection axes (drop the axis most aligned with normal)
    const absNormal = new THREE.Vector3(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z));
    let flatCoords: number[];

    if (absNormal.y >= absNormal.x && absNormal.y >= absNormal.z) {
      // Drop Y (horizontal surface) - project to XZ
      flatCoords = points.flatMap(p => [p.x, p.z]);
    } else if (absNormal.x >= absNormal.z) {
      // Drop X - project to YZ
      flatCoords = points.flatMap(p => [p.y, p.z]);
    } else {
      // Drop Z - project to XY
      flatCoords = points.flatMap(p => [p.x, p.y]);
    }

    // Triangulate using earcut
    const indices = earcut(flatCoords);

    if (indices.length === 0) {
      // Earcut failed, fall back to fan triangulation for convex polygons
      const fallbackIndices: number[] = [];
      for (let i = 1; i < points.length - 1; i++) {
        fallbackIndices.push(0, i, i + 1);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(fallbackIndices);
      geometry.computeVertexNormals();
      return geometry;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Calculate the normal vector of a polygon using Newell's method
   */
  private calculatePolygonNormal(points: THREE.Vector3[]): THREE.Vector3 {
    const normal = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];

      normal.x += (current.y - next.y) * (current.z + next.z);
      normal.y += (current.z - next.z) * (current.x + next.x);
      normal.z += (current.x - next.x) * (current.y + next.y);
    }

    normal.normalize();

    // Default to Y-up if degenerate
    if (normal.lengthSq() === 0) {
      normal.set(0, 1, 0);
    }

    return normal;
  }

  /**
   * Update a measurement's unit (stored data only, no labels)
   */
  updateMeasurement(id: string, unit: MeasurementUnit): void {
    const group = this.measurements.get(id);
    if (!group) return;

    const data = group.userData.data as MeasurementData;
    data.unit = unit;
  }

  /**
   * Remove a measurement
   */
  removeMeasurement(id: string): void {
    const group = this.measurements.get(id);
    if (!group) return;

    // Remove from parent object
    this.parentObject.remove(group);

    // Dispose geometries and materials
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      if (child instanceof Line2) {
        child.geometry?.dispose();
        if (child.material instanceof LineMaterial) {
          child.material.dispose();
        }
      }
      if (child instanceof THREE.Line) {
        child.geometry?.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.measurements.delete(id);

    // Clear state
    if (this.hoveredId === id) this.hoveredId = null;
    if (this.selectedId === id) this.selectedId = null;
  }

  /**
   * Set the hovered measurement
   */
  setHovered(id: string | null): void {
    // Unhover previous
    if (this.hoveredId && this.hoveredId !== id) {
      const prev = this.measurements.get(this.hoveredId);
      if (prev) {
        this.applyState(prev, this.selectedId === this.hoveredId ? 'selected' : 'default');
      }
    }

    this.hoveredId = id;

    // Apply hover to new
    if (id) {
      const group = this.measurements.get(id);
      if (group) {
        this.applyState(group, 'hovered');
      }
    }
  }

  /**
   * Set the selected measurement
   */
  setSelected(id: string | null): void {
    // Unselect previous
    if (this.selectedId && this.selectedId !== id) {
      const prev = this.measurements.get(this.selectedId);
      if (prev) {
        this.applyState(prev, this.hoveredId === this.selectedId ? 'hovered' : 'default');
      }
    }

    this.selectedId = id;

    // Apply selection to new
    if (id) {
      const group = this.measurements.get(id);
      if (group) {
        this.applyState(group, 'selected');
      }
    }
  }

  /**
   * Apply visual state to a measurement
   */
  private applyState(group: THREE.Group, state: MeasurementState): void {
    const data = group.userData.data as MeasurementData;
    let color = data.type === 'distance' ? MEASUREMENT_COLORS.distance : MEASUREMENT_COLORS.area;

    switch (state) {
      case 'hovered':
        color = MEASUREMENT_COLORS.hover;
        break;
      case 'selected':
        color = MEASUREMENT_COLORS.selected;
        break;
      case 'preview':
        color = MEASUREMENT_COLORS.preview;
        break;
    }

    // Update line and fill colors
    // Note: Main measurement lines are now white for visibility, outline is black
    // Only update the fill color for area measurements based on state
    group.traverse((child) => {
      // Don't change the white main line or black outline colors
      // They stay white/black for visibility against splats
      if (child instanceof THREE.Line && !(child instanceof Line2)) {
        (child.material as THREE.LineBasicMaterial).color.setHex(color);
      }
      if (child instanceof THREE.Mesh && child.name === 'area-fill') {
        (child.material as THREE.MeshBasicMaterial).color.setHex(color);
      }
    });

    // Note: 3D point scaling removed - using HTML overlays instead
  }

  /**
   * Show a preview line while measuring distance
   * Uses animated Line2 for high visibility (pulsing opacity)
   */
  showDistancePreview(p1: THREE.Vector3, p2: THREE.Vector3): void {
    this.clearPreview();

    // Use full line length to cursor (magnifier hidden during preview drawing)
    const endPoint = p2.clone();

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'measurement-preview';

    // Create thin animated Line2 for visibility
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([p1.x, p1.y, p1.z, endPoint.x, endPoint.y, endPoint.z]);

    // Main preview line - white dashed, thin
    this.previewLineMaterial = new LineMaterial({
      color: 0xFFFFFF, // White for visibility
      linewidth: 1.5, // Thin line (~1.5px)
      resolution: this.resolution,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
      dashed: true,
      dashSize: 0.05,
      gapSize: 0.03,
    });

    this.previewLine = new Line2(lineGeometry, this.previewLineMaterial);
    this.previewLine.computeLineDistances();
    this.previewLine.name = 'preview-line';
    this.previewLine.renderOrder = 99;
    this.previewGroup.add(this.previewLine);

    // Start the dash animation (marching ants effect)
    this.startPreviewAnimation();

    this.scene.add(this.previewGroup);
  }

  /**
   * Show a preview polygon while measuring area
   * Uses animated Line2 for high visibility (pulsing opacity)
   */
  showAreaPreview(points: THREE.Vector3[], cursorPoint?: THREE.Vector3): void {
    this.clearPreview();

    if (points.length === 0) return;

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'area-preview';

    // Build points array (full line to cursor - magnifier hidden during preview drawing)
    const allPoints: THREE.Vector3[] = cursorPoint && points.length > 0
      ? [...points, cursorPoint.clone()]
      : points;

    // Create polygon outline (including shortened cursor point if provided)
    const outlinePoints = allPoints.length >= 3
      ? [...allPoints, allPoints[0]] // Close the polygon
      : allPoints;

    const positions: number[] = [];
    outlinePoints.forEach(p => {
      positions.push(p.x, p.y, p.z);
    });

    // Main preview line - white dashed, thin
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions(positions);

    this.previewLineMaterial = new LineMaterial({
      color: 0xFFFFFF, // White for visibility
      linewidth: 1.5, // Thin line (~1.5px)
      resolution: this.resolution,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
      dashed: true,
      dashSize: 0.05,
      gapSize: 0.03,
    });

    this.previewLine = new Line2(lineGeometry, this.previewLineMaterial);
    this.previewLine.computeLineDistances();
    this.previewLine.name = 'preview-line';
    this.previewLine.renderOrder = 99;
    this.previewGroup.add(this.previewLine);

    // Start the dash animation (marching ants effect)
    this.startPreviewAnimation();

    // For fill and label, use FULL cursor point (not shortened) for accurate area calculation
    const fullPoints = cursorPoint ? [...points, cursorPoint] : points;

    // Create fill if we have enough points (purple with increased opacity)
    if (fullPoints.length >= 3) {
      const fillGeometry = this.createPolygonGeometry(fullPoints);
      if (fillGeometry) {
        const fillMaterial = new THREE.MeshBasicMaterial({
          color: MEASUREMENT_COLORS.area, // Purple for area preview
          transparent: true,
          opacity: this.config.areaFillOpacity * 0.6, // ~21% in preview
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const fill = new THREE.Mesh(fillGeometry, fillMaterial);
        this.previewGroup.add(fill);
      }
    }

    this.scene.add(this.previewGroup);
  }

  /**
   * Clear the preview measurement
   */
  clearPreview(): void {
    // Stop animation first
    this.stopPreviewAnimation();

    // Clear preview group
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);

      this.previewGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
        if (child instanceof Line2) {
          child.geometry?.dispose();
          if (child.material instanceof LineMaterial) {
            child.material.dispose();
          }
        }
        if (child instanceof THREE.Line && !(child instanceof Line2)) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.previewGroup = null;
    }
  }

  /**
   * Show or hide all measurement 3D objects (lines, fills)
   */
  setVisible(visible: boolean): void {
    if (this.visible === visible) return;
    this.visible = visible;
    this.measurements.forEach((group) => { group.visible = visible; });
    if (this.previewGroup) { this.previewGroup.visible = visible; }
  }

  /**
   * Get all measurement objects for raycasting
   */
  getMeasurementObjects(): THREE.Object3D[] {
    return Array.from(this.measurements.values());
  }

  /**
   * Get measurement data by ID
   */
  getMeasurementData(id: string): MeasurementData | undefined {
    const group = this.measurements.get(id);
    return group?.userData.data as MeasurementData | undefined;
  }

  /**
   * Get all measurement IDs
   */
  getMeasurementIds(): string[] {
    return Array.from(this.measurements.keys());
  }

  /**
   * Update a measurement's point position and recalculate value
   * Used when dragging a measurement point with the gizmo
   * Note: newPosition is expected to be in world space
   */
  updateMeasurementPoint(id: string, pointIndex: number, newPosition: THREE.Vector3): void {
    const group = this.measurements.get(id);
    if (!group) return;

    const data = group.userData.data as MeasurementData;
    if (pointIndex < 0 || pointIndex >= data.points.length) return;

    // Convert world position to parent's local space
    const localPosition = newPosition.clone();
    this.parentObject.worldToLocal(localPosition);

    // Update the point (in local space)
    data.points[pointIndex] = localPosition.clone();

    // Recalculate value
    if (data.type === 'distance' && data.points.length === 2) {
      data.value = MeasurementCalculator.calculateDistance(data.points[0], data.points[1]);
    } else if (data.type === 'area' && data.points.length >= 3) {
      data.value = MeasurementCalculator.calculateArea(data.points);
    }

    // Update line geometry
    if (data.type === 'distance') {
      const p1 = data.points[0];
      const p2 = data.points[1];

      // Update both lines (outline and main)
      group.traverse((child) => {
        if (child instanceof Line2) {
          const geometry = child.geometry as LineGeometry;
          geometry.setPositions([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]);
          child.computeLineDistances();
        }
      });
    } else if (data.type === 'area') {
      const points = data.points;
      const outlinePoints = [...points, points[0]]; // Close the polygon
      const positions: number[] = [];
      outlinePoints.forEach(p => {
        positions.push(p.x, p.y, p.z);
      });

      // Update outline lines
      group.traverse((child) => {
        if (child instanceof Line2) {
          const geometry = child.geometry as LineGeometry;
          geometry.setPositions(positions);
          child.computeLineDistances();
        }
        // Update fill mesh
        if (child instanceof THREE.Mesh && child.name === 'area-fill') {
          const newFillGeometry = this.createPolygonGeometry(points);
          if (newFillGeometry) {
            child.geometry.dispose();
            child.geometry = newFillGeometry;
          }
        }
      });
    }
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    const ids = Array.from(this.measurements.keys());
    ids.forEach((id) => this.removeMeasurement(id));
    this.clearPreview();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();
    this.stopPreviewAnimation();
    window.removeEventListener('resize', this.handleResize);
    // Clear debounce timer
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = null;
    }
  }
}

export default MeasurementRenderer;
