import { useReducer, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Target } from 'lucide-react';
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
  /** Click handler */
  onClick?: (point: MeasurementPointData) => void;
  /** Hover handler */
  onHover?: (point: MeasurementPointData | null) => void;
  /** Drag start handler (for direct dragging with surface snap) */
  onDragStart?: (point: MeasurementPointData) => void;
}

/**
 * MeasurementPointIcon - Compact circular icon marker for measurement endpoints
 *
 * Small 2D HTML circles positioned in screen space with:
 * - Type-based color (blue for distance, purple for area)
 * - Target/crosshair icon inside
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
  onClick,
  onHover,
  onDragStart,
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
          isEditing && 'scale-150 ring-4 ring-yellow-400/80'
        )}
        style={{
          width: scaledSize,
          height: scaledSize,
          cursor: isEditing ? 'grab' : 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(point);
        }}
        onPointerDown={(e) => {
          // Start drag if in editing mode and handler provided
          if (isEditing && onDragStart) {
            e.stopPropagation();
            e.preventDefault();
            onDragStart(point);
          }
        }}
        onMouseEnter={() => onHover?.(point)}
        onMouseLeave={() => onHover?.(null)}
        title={`Point ${point.pointIndex + 1}`}
      >
        <Target
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
  /** Drag start handler (for direct dragging with surface snap) */
  onPointDragStart?: (point: MeasurementPointData) => void;
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
  onPointDragStart,
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
        return (
          <MeasurementPointIcon
            key={pointId}
            point={point}
            camera={camera}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            isHovered={hoveredPointId === pointId}
            isSelected={selectedPointId === pointId}
            isEditing={editingPointId === pointId}
            onClick={onPointClick}
            onHover={onPointHover}
            onDragStart={onPointDragStart}
          />
        );
      })}
    </div>
  );
}

export default MeasurementIconOverlay;
