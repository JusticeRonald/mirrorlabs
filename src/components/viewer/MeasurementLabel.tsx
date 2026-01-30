import { useReducer, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Label data for measurement overlays
 */
export interface MeasurementLabelData {
  id: string;
  position: THREE.Vector3;
  value: string;
  type: 'distance' | 'area' | 'segment';
  isPreview?: boolean;
  /** Parent measurement ID for delete operations */
  measurementId?: string;
  /** Segment index for segment-type labels */
  segmentIndex?: number;
  /** Whether the label can be deleted (permission-based) */
  canDelete?: boolean;
}

interface MeasurementLabelProps {
  /** World position for the label (midpoint or centroid) */
  position: THREE.Vector3;
  /** Formatted value string (e.g., "24.5 ft") */
  value: string;
  /** Camera for projection */
  camera: THREE.PerspectiveCamera;
  /** Container width */
  containerWidth: number;
  /** Container height */
  containerHeight: number;
  /** Blue styling for preview labels */
  isPreview?: boolean;
  /** Label type for styling */
  type?: 'distance' | 'area' | 'segment';
  /** Whether this label is currently hovered */
  isHovered?: boolean;
  /** Whether the label can be deleted */
  canDelete?: boolean;
  /** Callback when hover state changes */
  onHover?: (hovered: boolean) => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
}

/**
 * MeasurementLabel - HTML overlay label for measurement values
 *
 * Displays measurement values (distance, area) at specified positions.
 * Uses manual projection from 3D to screen space.
 * Scales based on camera distance for readability.
 * Shows delete button on hover when canDelete is true.
 */
export function MeasurementLabel({
  position,
  value,
  camera,
  containerWidth,
  containerHeight,
  isPreview = false,
  type = 'distance',
  isHovered = false,
  canDelete = false,
  onHover,
  onDelete,
}: MeasurementLabelProps) {
  // Project to screen coordinates
  const vector = position.clone().project(camera);

  // Behind camera - don't render
  if (vector.z > 1) {
    return null;
  }

  // Convert to screen coordinates
  const screenX = ((vector.x + 1) / 2) * containerWidth;
  const screenY = ((-vector.y + 1) / 2) * containerHeight;

  // Check bounds with padding
  const padding = 100;
  if (
    screenX < -padding ||
    screenX > containerWidth + padding ||
    screenY < -padding ||
    screenY > containerHeight + padding
  ) {
    return null;
  }

  // Distance-based scaling (same pattern as point icons: 150 / distance clamped)
  const distance = camera.position.distanceTo(position);
  const scaledFontSize = Math.max(10, Math.min(14, 100 / distance));

  // Interactive labels (non-preview, can delete)
  const isInteractive = !isPreview && canDelete;

  return (
    <div
      className={cn(
        'absolute transform -translate-x-1/2 -translate-y-1/2',
        isInteractive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
      )}
      style={{ left: screenX, top: screenY }}
      onMouseEnter={isInteractive ? () => onHover?.(true) : undefined}
      onMouseLeave={isInteractive ? () => onHover?.(false) : undefined}
    >
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-md font-mono shadow-lg whitespace-nowrap',
          'border backdrop-blur-sm transition-all duration-150',
          isPreview
            ? 'bg-blue-500/90 border-blue-400/50 text-white'
            : 'bg-neutral-900/90 border-neutral-600/50 text-white',
          type === 'area' && 'font-semibold',
          isHovered && !isPreview && 'ring-1 ring-white/50 border-neutral-500/70'
        )}
        style={{ fontSize: `${scaledFontSize}px` }}
      >
        <span>{value}</span>
        {isHovered && canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="ml-1 p-0.5 rounded hover:bg-red-500/50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}

interface MeasurementLabelOverlayProps {
  /** Array of labels to display */
  labels: MeasurementLabelData[];
  /** Camera for projection */
  camera: THREE.PerspectiveCamera | null;
  /** Container element for dimension calculation */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Currently hovered label ID */
  hoveredLabelId?: string | null;
  /** Callback when label hover state changes */
  onLabelHover?: (labelId: string | null) => void;
  /** Callback when label delete is clicked */
  onLabelDelete?: (label: MeasurementLabelData) => void;
}

/**
 * MeasurementLabelOverlay - Container for measurement value labels
 *
 * Uses requestAnimationFrame to update label positions as camera moves.
 * Renders labels at measurement midpoints and centroids.
 * Supports hover interactions for delete functionality.
 */
export function MeasurementLabelOverlay({
  labels,
  camera,
  containerRef,
  hoveredLabelId,
  onLabelHover,
  onLabelDelete,
}: MeasurementLabelOverlayProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Force re-render on each animation frame to update label positions
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

  // RAF loop for smooth updates (30fps throttle)
  useEffect(() => {
    if (!camera) return;

    let animationId: number;
    let lastTime = 0;
    const frameInterval = 33; // ~30fps throttle

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

  if (!camera || labels.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {labels.map((label) => (
        <MeasurementLabel
          key={label.id}
          position={label.position}
          value={label.value}
          camera={camera}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
          isPreview={label.isPreview}
          type={label.type}
          isHovered={hoveredLabelId === label.id}
          canDelete={label.canDelete}
          onHover={(hovered) => onLabelHover?.(hovered ? label.id : null)}
          onDelete={() => onLabelDelete?.(label)}
        />
      ))}
    </div>
  );
}

export default MeasurementLabelOverlay;
