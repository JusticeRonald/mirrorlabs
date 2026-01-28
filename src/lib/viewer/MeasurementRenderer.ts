import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
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
  /** Label offset from line midpoint (default: 0.1) */
  labelOffset: number;
  /** Hover scale (default: 1.1) */
  hoverScale: number;
  /** Selected scale (default: 1.2) */
  selectedScale: number;
}

const DEFAULT_CONFIG: MeasurementConfig = {
  lineWidth: 3,
  areaFillOpacity: 0.2,
  labelOffset: 0.1,
  hoverScale: 1.1,
  selectedScale: 1.2,
};

/**
 * MeasurementRenderer - Renders distance lines and area polygons with labels
 *
 * Uses Three.js Line2 for thick lines and CSS2DObject for labels
 * that always face the camera and have consistent screen size.
 * 3D point markers are replaced with HTML overlays (see MeasurementMarker.tsx).
 */
export class MeasurementRenderer {
  private scene: THREE.Scene;
  private parentObject: THREE.Object3D;
  private measurements: Map<string, THREE.Group>;
  private labels: Map<string, CSS2DObject>;
  private config: MeasurementConfig;

  // Resolution for Line2 materials
  private resolution: THREE.Vector2 = new THREE.Vector2(window.innerWidth, window.innerHeight);

  // Current state
  private hoveredId: string | null = null;
  private selectedId: string | null = null;

  // Preview measurement (in-progress)
  private previewGroup: THREE.Group | null = null;
  private previewLabel: CSS2DObject | null = null;

  // Debounce timer for resize handler
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Visibility state
  private visible: boolean = true;

  constructor(scene: THREE.Scene, config: Partial<MeasurementConfig> = {}) {
    this.scene = scene;
    this.parentObject = scene; // Default to scene
    this.measurements = new Map();
    this.labels = new Map();
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
          const label = this.labels.get(data.id);
          if (label) {
            const midpoint = MeasurementCalculator.calculateMidpoint(p1, p2);
            label.position.copy(midpoint);
            label.position.y += this.config.labelOffset;
          }
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
          const label = this.labels.get(data.id);
          if (label) {
            const centroid = MeasurementCalculator.calculateCentroid(data.points);
            label.position.copy(centroid);
            label.position.y += this.config.labelOffset;
          }
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
    const color = MEASUREMENT_COLORS.distance;

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

    // Create label at midpoint (in local space)
    const midpoint = MeasurementCalculator.calculateMidpoint(localP1, localP2);
    const label = this.createLabel(
      MeasurementCalculator.formatDistance(distance, data.unit),
      color
    );
    label.position.copy(midpoint);
    label.position.y += this.config.labelOffset;
    group.add(label);
    this.labels.set(id, label);

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
    const color = MEASUREMENT_COLORS.area;

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
        color,
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

    // Create label at centroid (in local space)
    const centroid = MeasurementCalculator.calculateCentroid(localPoints);
    const label = this.createLabel(
      MeasurementCalculator.formatArea(area, data.unit),
      color
    );
    label.position.copy(centroid);
    label.position.y += this.config.labelOffset;
    group.add(label);
    this.labels.set(id, label);

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
   * Create a simple triangulated geometry for a polygon
   */
  private createPolygonGeometry(points: THREE.Vector3[]): THREE.BufferGeometry | null {
    if (points.length < 3) return null;

    // Use fan triangulation (works for convex polygons)
    // For complex polygons, earcut would be better but this is simpler
    const vertices: number[] = [];
    const indices: number[] = [];

    // Add vertices
    points.forEach(p => {
      vertices.push(p.x, p.y, p.z);
    });

    // Fan triangulation from first vertex
    for (let i = 1; i < points.length - 1; i++) {
      indices.push(0, i, i + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Create a CSS2D label element
   */
  private createLabel(text: string, color: number): CSS2DObject {
    const div = document.createElement('div');
    div.className = 'measurement-label';
    div.textContent = text;
    div.style.cssText = `
      background: rgba(15, 15, 16, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.1);
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;

    // Add colored indicator dot
    const dot = document.createElement('span');
    dot.style.cssText = `
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #${color.toString(16).padStart(6, '0')};
      margin-right: 6px;
      vertical-align: middle;
    `;
    div.insertBefore(dot, div.firstChild);

    const label = new CSS2DObject(div);
    label.name = 'measurement-label';
    return label;
  }

  /**
   * Update a measurement's displayed value and unit
   */
  updateMeasurement(id: string, unit: MeasurementUnit): void {
    const group = this.measurements.get(id);
    if (!group) return;

    const data = group.userData.data as MeasurementData;
    const label = this.labels.get(id);

    if (!label) return;

    // Recalculate value in new unit
    const baseValue = data.value; // Value is stored in base units (meters)
    const convertedValue = MeasurementCalculator.convertUnits(baseValue, 'm', unit);

    // Update label text
    const div = label.element;
    const textNode = div.lastChild;
    if (textNode) {
      if (data.type === 'distance') {
        textNode.textContent = MeasurementCalculator.formatDistance(convertedValue, unit);
      } else if (data.type === 'area') {
        const convertedArea = MeasurementCalculator.convertAreaUnits(baseValue, 'm', unit);
        textNode.textContent = MeasurementCalculator.formatArea(convertedArea, unit);
      }
    }

    // Update stored unit
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

    // Remove label reference
    this.labels.delete(id);
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
   * Note: Using standard Line for preview (dashed) - Line2 doesn't support dashing well
   */
  showDistancePreview(p1: THREE.Vector3, p2: THREE.Vector3): void {
    this.clearPreview();

    const distance = MeasurementCalculator.calculateDistance(p1, p2);
    const color = MEASUREMENT_COLORS.preview;

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'measurement-preview';

    // Create dashed line (using standard Line for dashing support)
    const lineMaterial = new THREE.LineDashedMaterial({
      color,
      linewidth: this.config.lineWidth,
      dashSize: 0.1,
      gapSize: 0.05,
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    this.previewGroup.add(line);

    // Note: Preview endpoint spheres removed - HTML overlay will show points

    // Create preview label
    const midpoint = MeasurementCalculator.calculateMidpoint(p1, p2);
    this.previewLabel = this.createLabel(
      MeasurementCalculator.formatDistance(distance, 'ft'), // Default to feet
      color
    );
    this.previewLabel.position.copy(midpoint);
    this.previewLabel.position.y += this.config.labelOffset;
    this.previewGroup.add(this.previewLabel);

    this.scene.add(this.previewGroup);
  }

  /**
   * Show a preview polygon while measuring area
   * Note: Using standard Line for preview (dashed) - Line2 doesn't support dashing well
   */
  showAreaPreview(points: THREE.Vector3[], cursorPoint?: THREE.Vector3): void {
    this.clearPreview();

    if (points.length === 0) return;

    const allPoints = cursorPoint ? [...points, cursorPoint] : points;
    const color = MEASUREMENT_COLORS.preview;

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'area-preview';

    // Create polygon outline (including cursor point if provided)
    const outlinePoints = allPoints.length >= 3
      ? [...allPoints, allPoints[0]] // Close the polygon
      : allPoints;

    const outlineMaterial = new THREE.LineDashedMaterial({
      color,
      linewidth: this.config.lineWidth,
      dashSize: 0.1,
      gapSize: 0.05,
    });
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
    const outline = new THREE.Line(outlineGeometry, outlineMaterial);
    outline.computeLineDistances();
    this.previewGroup.add(outline);

    // Create fill if we have enough points
    if (allPoints.length >= 3) {
      const fillGeometry = this.createPolygonGeometry(allPoints);
      if (fillGeometry) {
        const fillMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: this.config.areaFillOpacity * 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const fill = new THREE.Mesh(fillGeometry, fillMaterial);
        this.previewGroup.add(fill);
      }
    }

    // Note: Preview vertex spheres removed - HTML overlay will show points

    // Create preview label at centroid if we have enough points
    if (allPoints.length >= 3) {
      const area = MeasurementCalculator.calculateArea(allPoints);
      const centroid = MeasurementCalculator.calculateCentroid(allPoints);
      this.previewLabel = this.createLabel(
        MeasurementCalculator.formatArea(area, 'ft'), // Default to feet
        color
      );
      this.previewLabel.position.copy(centroid);
      this.previewLabel.position.y += this.config.labelOffset;
      this.previewGroup.add(this.previewLabel);
    }

    this.scene.add(this.previewGroup);
  }

  /**
   * Clear the preview measurement
   */
  clearPreview(): void {
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
      this.previewLabel = null;
    }
  }

  /**
   * Show or hide all measurement 3D objects (lines, labels, fills)
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

      // Update label position and text
      const label = this.labels.get(id);
      if (label) {
        const midpoint = MeasurementCalculator.calculateMidpoint(p1, p2);
        label.position.copy(midpoint);
        label.position.y += this.config.labelOffset;

        // Update label text
        const div = label.element;
        const textNode = div.lastChild;
        if (textNode) {
          textNode.textContent = MeasurementCalculator.formatDistance(data.value, data.unit);
        }
      }
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

      // Update label position and text
      const label = this.labels.get(id);
      if (label) {
        const centroid = MeasurementCalculator.calculateCentroid(points);
        label.position.copy(centroid);
        label.position.y += this.config.labelOffset;

        // Update label text
        const div = label.element;
        const textNode = div.lastChild;
        if (textNode) {
          textNode.textContent = MeasurementCalculator.formatArea(data.value, data.unit);
        }
      }
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
    window.removeEventListener('resize', this.handleResize);
    // Clear debounce timer
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = null;
    }
  }
}

export default MeasurementRenderer;
