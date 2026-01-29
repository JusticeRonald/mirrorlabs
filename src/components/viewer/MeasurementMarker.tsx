import { useReducer, useEffect, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import type { MeasurementType } from '@/types/viewer';

/**
 * Measurement point data for rendering
 */
export interface MeasurementPointData {
  measurementId: string;
  pointIndex: number;
  position: THREE.Vector3;
  type: MeasurementType;
  /** Whether this is a pending point during measurement placement */
  isPending?: boolean;
  /** Whether this is the first point and cursor is near (for snap affordance) */
  isSnapTarget?: boolean;
}

/**
 * Colors for measurement point markers by type
 * Using bright green (#22C55E / green-500) for maximum visibility
 */
const TYPE_COLORS: Record<MeasurementType, string> = {
  distance: 'bg-green-500 hover:bg-green-400',
  area: 'bg-green-500 hover:bg-green-400',
  angle: 'bg-green-500 hover:bg-green-400',
};

interface MeasurementPointIconProps {
  /** Measurement point data */
  point: MeasurementPointData;
  /** The camera being used for rendering */
  camera: THREE.PerspectiveCamera;
  /** Container dimensions */
  containerWidth: number;
  containerHeight: number;
  /** Whether this marker is hovered */
  isHovered?: boolean;
  /** Whether this marker is selected */
  isSelected?: boolean;
  /** Whether this point is being edited (gizmo attached) */
  isEditing?: boolean;
  /** Whether this is a pending point (during measurement placement) */
  isPending?: boolean;
  /** Whether this is a snap target (cursor near first point of area) */
  isSnapTarget?: boolean;
  /** Click handler */
  onClick?: (point: MeasurementPointData) => void;
  /** Hover handler */
  onHover?: (point: MeasurementPointData | null) => void;
}

/**
 * Pin SVG icon for measurement points
 */
function PinIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <path fill="currentColor" d="M12 2a8 8 0 0 0-8 7.92c0 5.48 7.05 11.58 7.35 11.84a1 1 0 0 0 1.3 0C13 21.5 20 15.4 20 9.92A8 8 0 0 0 12 2m0 17.65c-1.67-1.59-6-6-6-9.73a6 6 0 0 1 12 0c0 3.7-4.33 8.14-6 9.73" />
      <path fill="currentColor" d="M12 6a3.5 3.5 0 1 0 3.5 3.5A3.5 3.5 0 0 0 12 6m0 5a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 12 11" />
    </svg>
  );
}

/**
 * MeasurementPointIcon - Compact circular icon marker for measurement endpoints
 *
 * Small 2D HTML circles positioned in screen space with:
 * - Type-based color (blue for distance, purple for area)
 * - Pin icon inside
 * - Distance-based scaling
 * - Hover and selection states
 */
export function MeasurementPointIcon({
  point,
  camera,
  containerWidth,
  containerHeight,
  isHovered = false,
  isSelected = false,
  isEditing = false,
  isPending = false,
  isSnapTarget = false,
  onClick,
  onHover,
}: MeasurementPointIconProps) {
  // Calculate screen position and size
  const vector = point.position.clone().project(camera);

  // Behind camera - don't render
  if (vector.z > 1) {
    return null;
  }

  // Convert to screen coordinates
  const screenX = ((vector.x + 1) / 2) * containerWidth;
  const screenY = ((-vector.y + 1) / 2) * containerHeight;

  // Check bounds with padding
  const padding = 50;
  if (
    screenX < -padding ||
    screenX > containerWidth + padding ||
    screenY < -padding ||
    screenY > containerHeight + padding
  ) {
    return null;
  }

  // Calculate distance-based size (12px far, 24px close)
  const distance = camera.position.distanceTo(point.position);
  const scaledSize = Math.max(12, Math.min(24, 150 / distance));

  // Scale icon size inside based on container size
  const iconSize = Math.max(8, scaledSize * 0.5);

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      style={{ left: screenX, top: screenY }}
    >
      <button
        className={cn(
          'rounded-full flex items-center justify-center',
          'shadow-md border-2 border-white/30',
          'transition-all duration-150',
          TYPE_COLORS[point.type],
          isHovered && 'scale-110 border-white/50',
          isSelected && 'scale-125 ring-2 ring-white/80',
          isEditing && 'scale-150 ring-4 ring-yellow-400/80',
          // Pending point styles - dashed border and slightly smaller
          isPending && 'border-dashed border-white/60 opacity-90',
          // Snap target - subtle highlight without animation (no blinking)
          isSnapTarget && 'ring-4 ring-green-400/90 scale-110 brightness-125'
        )}
        style={{
          width: scaledSize,
          height: scaledSize,
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(point);
        }}
        onMouseEnter={() => onHover?.(point)}
        onMouseLeave={() => onHover?.(null)}
        title={`Point ${point.pointIndex + 1}`}
      >
        <PinIcon
          className="text-white drop-shadow"
          style={{ width: iconSize, height: iconSize }}
        />
      </button>
    </div>
  );
}

interface MeasurementIconOverlayProps {
  /** Array of measurement points to display */
  points: MeasurementPointData[];
  /** The camera being used for rendering */
  camera: THREE.PerspectiveCamera | null;
  /** Container element for dimension calculation */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Currently hovered point (measurementId-pointIndex) */
  hoveredPointId?: string | null;
  /** Currently selected point (measurementId-pointIndex) */
  selectedPointId?: string | null;
  /** Point currently being edited with gizmo (measurementId-pointIndex) */
  editingPointId?: string | null;
  /** Click handler */
  onPointClick?: (point: MeasurementPointData) => void;
  /** Hover handler */
  onPointHover?: (point: MeasurementPointData | null) => void;
  /** Optional function to get live world position (for transform following) */
  getWorldPosition?: (measurementId: string, pointIndex: number) => THREE.Vector3 | null;
}

/**
 * MeasurementIconOverlay - Container for compact 2D measurement point markers
 *
 * Uses requestAnimationFrame to update icon positions as camera moves.
 * Renders small circular icons at measurement endpoints.
 */
export function MeasurementIconOverlay({
  points,
  camera,
  containerRef,
  hoveredPointId,
  selectedPointId,
  editingPointId,
  onPointClick,
  onPointHover,
  getWorldPosition,
}: MeasurementIconOverlayProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Force re-render on each animation frame to update icon positions
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // Track container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  // Re-render on animation frames while camera exists to update positions
  useEffect(() => {
    if (!camera) return;

    let animationId: number;
    let lastTime = 0;
    const frameInterval = 33; // ~30fps throttle to reduce CPU usage

    const update = (time: number) => {
      if (time - lastTime >= frameInterval) {
        forceUpdate();
        lastTime = time;
      }
      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationId);
  }, [camera]);

  if (!camera || points.length === 0) {
    return null;
  }

  const getPointId = (point: MeasurementPointData) =>
    `${point.measurementId}-${point.pointIndex}`;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {points.map((point) => {
        const pointId = getPointId(point);
        // Get live world position if function provided, otherwise use passed position
        const livePosition = getWorldPosition?.(point.measurementId, point.pointIndex) ?? point.position;
        const pointWithLivePosition = { ...point, position: livePosition };
        return (
          <MeasurementPointIcon
            key={pointId}
            point={pointWithLivePosition}
            camera={camera}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            isHovered={hoveredPointId === pointId}
            isSelected={selectedPointId === pointId}
            isEditing={editingPointId === pointId}
            isPending={point.isPending}
            isSnapTarget={point.isSnapTarget}
            onClick={onPointClick}
            onHover={onPointHover}
          />
        );
      })}
    </div>
  );
}

export default MeasurementIconOverlay;
