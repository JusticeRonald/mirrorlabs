import * as THREE from 'three';

/**
 * Supported measurement units
 */
export type MeasurementUnit = 'ft' | 'm' | 'in' | 'cm';

/**
 * Unit conversion factors to meters (base unit)
 */
const UNIT_TO_METERS: Record<MeasurementUnit, number> = {
  m: 1,
  ft: 0.3048,
  in: 0.0254,
  cm: 0.01,
};

/**
 * Display names for units
 */
export const UNIT_DISPLAY: Record<MeasurementUnit, string> = {
  m: 'm',
  ft: 'ft',
  in: 'in',
  cm: 'cm',
};

/**
 * Area unit display names (squared)
 */
export const AREA_UNIT_DISPLAY: Record<MeasurementUnit, string> = {
  m: 'm²',
  ft: 'ft²',
  in: 'in²',
  cm: 'cm²',
};

/**
 * MeasurementCalculator - Handles distance, area, and unit conversion calculations
 *
 * Distance: Uses Vector3.distanceTo() for world-space measurements
 * Area: Uses triangulation with cross product for polygon area calculation
 */
export class MeasurementCalculator {
  /**
   * Calculate distance between two points
   * @param p1 First point
   * @param p2 Second point
   * @returns Distance in world units (typically meters)
   */
  static calculateDistance(p1: THREE.Vector3, p2: THREE.Vector3): number {
    return p1.distanceTo(p2);
  }

  /**
   * Calculate the total length of a polyline (multiple segments)
   * @param points Array of points forming the polyline
   * @returns Total length in world units
   */
  static calculatePolylineLength(points: THREE.Vector3[]): number {
    if (points.length < 2) return 0;

    let totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalLength += points[i].distanceTo(points[i + 1]);
    }
    return totalLength;
  }

  /**
   * Calculate the area of a polygon using triangulation
   *
   * Algorithm:
   * 1. Project points to a best-fit plane (handles non-planar polygons)
   * 2. Use the Shoelace formula (for 2D) or cross product sum (for 3D)
   *
   * @param points Polygon vertices (minimum 3 points)
   * @returns Area in world units squared
   */
  static calculateArea(points: THREE.Vector3[]): number {
    if (points.length < 3) return 0;

    // For a 3D polygon, we use the cross product method
    // This works by summing the cross products of consecutive edges
    // and taking half the magnitude of the result

    const n = points.length;
    const crossSum = new THREE.Vector3(0, 0, 0);

    // Sum of cross products: sum((Pi - P0) x (P(i+1) - P0))
    const origin = points[0];

    for (let i = 1; i < n - 1; i++) {
      const v1 = new THREE.Vector3().subVectors(points[i], origin);
      const v2 = new THREE.Vector3().subVectors(points[i + 1], origin);
      const cross = new THREE.Vector3().crossVectors(v1, v2);
      crossSum.add(cross);
    }

    // Area is half the magnitude of the cross product sum
    return crossSum.length() / 2;
  }

  /**
   * Calculate the perimeter of a polygon
   * @param points Polygon vertices
   * @param closed Whether to include the closing edge (last to first point)
   * @returns Perimeter in world units
   */
  static calculatePerimeter(points: THREE.Vector3[], closed: boolean = true): number {
    if (points.length < 2) return 0;

    let perimeter = this.calculatePolylineLength(points);

    // Add closing edge if needed
    if (closed && points.length >= 3) {
      perimeter += points[points.length - 1].distanceTo(points[0]);
    }

    return perimeter;
  }

  /**
   * Calculate the centroid (center point) of a set of points
   * @param points Array of points
   * @returns Centroid position
   */
  static calculateCentroid(points: THREE.Vector3[]): THREE.Vector3 {
    if (points.length === 0) return new THREE.Vector3();

    const centroid = new THREE.Vector3();
    for (const point of points) {
      centroid.add(point);
    }
    centroid.divideScalar(points.length);
    return centroid;
  }

  /**
   * Calculate the midpoint between two points
   * @param p1 First point
   * @param p2 Second point
   * @returns Midpoint position
   */
  static calculateMidpoint(p1: THREE.Vector3, p2: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  }

  /**
   * Convert a value from one unit to another
   * @param value The value to convert
   * @param from Source unit
   * @param to Target unit
   * @returns Converted value
   */
  static convertUnits(value: number, from: MeasurementUnit, to: MeasurementUnit): number {
    if (from === to) return value;

    // Convert to meters first, then to target unit
    const valueInMeters = value * UNIT_TO_METERS[from];
    return valueInMeters / UNIT_TO_METERS[to];
  }

  /**
   * Convert area from one unit to another (squared conversion)
   * @param value The area value to convert
   * @param from Source unit
   * @param to Target unit
   * @returns Converted area value
   */
  static convertAreaUnits(value: number, from: MeasurementUnit, to: MeasurementUnit): number {
    if (from === to) return value;

    // Convert to square meters first, then to target square unit
    const conversionFactor = UNIT_TO_METERS[from] / UNIT_TO_METERS[to];
    return value * (conversionFactor * conversionFactor);
  }

  /**
   * Format a distance value for display
   * @param value The distance value
   * @param unit The unit to display in
   * @param precision Number of decimal places (default: 2)
   * @returns Formatted string like "24.08 ft"
   */
  static formatDistance(value: number, unit: MeasurementUnit, precision: number = 2): string {
    return `${value.toFixed(precision)} ${UNIT_DISPLAY[unit]}`;
  }

  /**
   * Format an area value for display
   * @param value The area value
   * @param unit The unit to display in
   * @param precision Number of decimal places (default: 2)
   * @returns Formatted string like "9.2 ft²"
   */
  static formatArea(value: number, unit: MeasurementUnit, precision: number = 2): string {
    return `${value.toFixed(precision)} ${AREA_UNIT_DISPLAY[unit]}`;
  }

  /**
   * Get the best-fit plane normal for a set of points
   * Useful for projecting non-planar polygons
   * @param points Array of at least 3 points
   * @returns Normal vector of the best-fit plane
   */
  static calculatePlaneNormal(points: THREE.Vector3[]): THREE.Vector3 {
    if (points.length < 3) {
      return new THREE.Vector3(0, 1, 0); // Default to Y-up
    }

    // Use Newell's method for calculating the normal
    const normal = new THREE.Vector3(0, 0, 0);
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const curr = points[i];
      const next = points[(i + 1) % n];

      normal.x += (curr.y - next.y) * (curr.z + next.z);
      normal.y += (curr.z - next.z) * (curr.x + next.x);
      normal.z += (curr.x - next.x) * (curr.y + next.y);
    }

    return normal.normalize();
  }

  /**
   * Check if a polygon is valid (has at least 3 non-collinear points)
   * @param points Polygon vertices
   * @returns True if the polygon is valid
   */
  static isValidPolygon(points: THREE.Vector3[]): boolean {
    if (points.length < 3) return false;

    // Check that not all points are collinear
    const area = this.calculateArea(points);
    return area > 1e-10; // Small epsilon for floating point comparison
  }
}

export default MeasurementCalculator;
