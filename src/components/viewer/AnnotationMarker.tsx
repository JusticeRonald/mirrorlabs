import { useRef, useEffect, useState, useReducer } from 'react';
import * as THREE from 'three';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationData, AnnotationStatus } from '@/lib/viewer/AnnotationRenderer';

/**
 * Status colors for HTML labels (matching 3D markers)
 */
const STATUS_BG_COLORS: Record<AnnotationStatus, string> = {
  open: 'bg-red-500',
  in_progress: 'bg-amber-500',
  resolved: 'bg-green-500',
  reopened: 'bg-orange-500',
  archived: 'bg-gray-500',
};

/**
 * Status colors for compact icon markers (with hover states)
 */
const STATUS_ICON_COLORS: Record<AnnotationStatus, string> = {
  open: 'bg-red-500 hover:bg-red-400',
  in_progress: 'bg-amber-500 hover:bg-amber-400',
  resolved: 'bg-green-500 hover:bg-green-400',
  reopened: 'bg-orange-500 hover:bg-orange-400',
  archived: 'bg-gray-500 hover:bg-gray-400',
};

const STATUS_LABELS: Record<AnnotationStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  reopened: 'Reopened',
  archived: 'Archived',
};

interface AnnotationMarkerProps {
  /** Annotation data */
  annotation: AnnotationData;
  /** 3D world position of the annotation */
  position: THREE.Vector3;
  /** The camera being used for rendering */
  camera: THREE.Camera;
  /** Container dimensions */
  containerWidth: number;
  containerHeight: number;
  /** Whether this marker is hovered */
  isHovered?: boolean;
  /** Whether this marker is selected */
  isSelected?: boolean;
  /** Whether this marker is occluded (behind geometry) */
  isOccluded?: boolean;
  /** Click handler */
  onClick?: (annotation: AnnotationData) => void;
  /** Hover handler */
  onHover?: (annotation: AnnotationData | null) => void;
}

/**
 * AnnotationMarker - HTML overlay for annotation labels
 *
 * Positioned in screen space to match 3D marker positions.
 * Shows annotation preview, status, and reply count.
 */
export function AnnotationMarker({
  annotation,
  position,
  camera,
  containerWidth,
  containerHeight,
  isHovered = false,
  isSelected = false,
  isOccluded = false,
  onClick,
  onHover,
}: AnnotationMarkerProps) {
  const markerRef = useRef<HTMLDivElement>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Update screen position when camera or position changes
  useEffect(() => {
    if (!camera || containerWidth === 0 || containerHeight === 0) {
      setIsVisible(false);
      return;
    }

    // Project 3D position to screen
    const vector = position.clone().project(camera);

    // Check if point is behind camera
    if (vector.z > 1) {
      setIsVisible(false);
      return;
    }

    // Convert to screen coordinates
    const x = ((vector.x + 1) / 2) * containerWidth;
    const y = ((-vector.y + 1) / 2) * containerHeight;

    // Check bounds
    const padding = 50;
    if (
      x < -padding ||
      x > containerWidth + padding ||
      y < -padding ||
      y > containerHeight + padding
    ) {
      setIsVisible(false);
      return;
    }

    setScreenPos({ x, y });
    setIsVisible(true);
  }, [camera, position, containerWidth, containerHeight]);

  if (!isVisible || !screenPos) {
    return null;
  }

  const truncatedContent =
    annotation.content.length > 50
      ? annotation.content.substring(0, 50) + '...'
      : annotation.content;

  return (
    <div
      ref={markerRef}
      className={cn(
        'absolute pointer-events-auto transition-all duration-200 z-10',
        'transform -translate-x-1/2 translate-y-2',
        isOccluded && !isSelected && 'opacity-40',
        isHovered && 'scale-105',
        isSelected && 'scale-110 z-20'
      )}
      style={{
        left: screenPos.x,
        top: screenPos.y,
      }}
      onClick={() => onClick?.(annotation)}
      onMouseEnter={() => onHover?.(annotation)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Label Card */}
      <div
        className={cn(
          'bg-neutral-900/90 backdrop-blur-sm border border-neutral-700',
          'rounded-lg px-3 py-2 min-w-[120px] max-w-[200px]',
          'shadow-lg cursor-pointer',
          isSelected && 'border-amber-500/50 ring-1 ring-amber-500/30',
          isHovered && !isSelected && 'border-neutral-500'
        )}
      >
        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              STATUS_BG_COLORS[annotation.status]
            )}
          />
          <span className="text-xs text-neutral-400">
            {STATUS_LABELS[annotation.status]}
          </span>
          {annotation.replyCount && annotation.replyCount > 0 && (
            <span className="text-xs text-neutral-500 ml-auto">
              {annotation.replyCount} {annotation.replyCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>

        {/* Content Preview */}
        <p className="text-sm text-neutral-200 line-clamp-2">{truncatedContent}</p>

        {/* Connector Line (points to 3D marker) */}
        <div
          className={cn(
            'absolute left-1/2 -top-2 w-0 h-0',
            'border-l-4 border-r-4 border-b-4',
            'border-l-transparent border-r-transparent',
            'border-b-neutral-700'
          )}
        />
      </div>
    </div>
  );
}

interface AnnotationOverlayProps {
  /** Array of annotations to display */
  annotations: Array<{
    data: AnnotationData;
    position: THREE.Vector3;
  }>;
  /** The camera being used for rendering */
  camera: THREE.Camera | null;
  /** Container element for dimension calculation */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Currently hovered annotation ID */
  hoveredId?: string | null;
  /** Currently selected annotation ID */
  selectedId?: string | null;
  /** Set of occluded annotation IDs */
  occludedIds?: Set<string>;
  /** Click handler */
  onAnnotationClick?: (annotation: AnnotationData) => void;
  /** Hover handler */
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
  /** Whether to show labels */
  showLabels?: boolean;
}

/**
 * AnnotationOverlay - Container for all annotation HTML labels
 *
 * Renders annotation markers as HTML overlays positioned in screen space.
 * Handles visibility, hover, and selection states.
 */
export function AnnotationOverlay({
  annotations,
  camera,
  containerRef,
  hoveredId,
  selectedId,
  occludedIds = new Set(),
  onAnnotationClick,
  onAnnotationHover,
  showLabels = true,
}: AnnotationOverlayProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  if (!camera || !showLabels || annotations.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {annotations.map(({ data, position }) => (
        <AnnotationMarker
          key={data.id}
          annotation={data}
          position={position}
          camera={camera}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
          isHovered={hoveredId === data.id}
          isSelected={selectedId === data.id}
          isOccluded={occludedIds.has(data.id)}
          onClick={onAnnotationClick}
          onHover={onAnnotationHover}
        />
      ))}
    </div>
  );
}

// ============================================================================
// COMPACT ANNOTATION ICONS (2D HTML Markers - New Implementation)
// ============================================================================

interface AnnotationIconProps {
  /** Annotation data */
  annotation: AnnotationData;
  /** 3D world position of the annotation */
  position: THREE.Vector3;
  /** The camera being used for rendering */
  camera: THREE.PerspectiveCamera;
  /** Container dimensions */
  containerWidth: number;
  containerHeight: number;
  /** Whether this marker is hovered */
  isHovered?: boolean;
  /** Whether this marker is selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: (annotation: AnnotationData) => void;
  /** Hover handler */
  onHover?: (annotation: AnnotationData | null) => void;
}

/**
 * AnnotationIcon - Compact circular icon marker for annotations
 *
 * Small 2D HTML circles positioned in screen space with:
 * - Status color background (red/amber/green)
 * - MessageSquare icon inside
 * - Distance-based scaling (larger when close, smaller when far)
 * - Hover and selection states
 */
export function AnnotationIcon({
  annotation,
  position,
  camera,
  containerWidth,
  containerHeight,
  isHovered = false,
  isSelected = false,
  onClick,
  onHover,
}: AnnotationIconProps) {
  // Calculate screen position and size
  const vector = position.clone().project(camera);

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

  // Calculate distance-based size (16px far, 32px close)
  const distance = camera.position.distanceTo(position);
  const scaledSize = Math.max(16, Math.min(32, 200 / distance));

  // Scale icon size inside based on container size
  const iconSize = Math.max(10, scaledSize * 0.5);

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      style={{ left: screenX, top: screenY }}
    >
      <button
        className={cn(
          'rounded-full flex items-center justify-center',
          'shadow-lg border-2 border-white/20',
          'transition-all duration-150 cursor-pointer',
          STATUS_ICON_COLORS[annotation.status],
          isHovered && 'scale-110 border-white/40',
          isSelected && 'scale-125 ring-2 ring-white/80'
        )}
        style={{ width: scaledSize, height: scaledSize }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(annotation);
        }}
        onMouseEnter={() => onHover?.(annotation)}
        onMouseLeave={() => onHover?.(null)}
        title={annotation.content.substring(0, 50) + (annotation.content.length > 50 ? '...' : '')}
      >
        <MessageSquare
          className="text-white drop-shadow"
          style={{ width: iconSize, height: iconSize }}
        />
      </button>
    </div>
  );
}

interface AnnotationIconOverlayProps {
  /** Array of annotations to display */
  annotations: Array<{
    data: AnnotationData;
    position: THREE.Vector3;
  }>;
  /** The camera being used for rendering */
  camera: THREE.PerspectiveCamera | null;
  /** Container element for dimension calculation */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Currently hovered annotation ID */
  hoveredId?: string | null;
  /** Currently selected annotation ID */
  selectedId?: string | null;
  /** Click handler */
  onAnnotationClick?: (annotation: AnnotationData) => void;
  /** Hover handler */
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
}

/**
 * AnnotationIconOverlay - Container for compact 2D annotation icon markers
 *
 * Uses requestAnimationFrame to update icon positions as camera moves.
 * Renders small circular icons instead of 3D markers.
 */
export function AnnotationIconOverlay({
  annotations,
  camera,
  containerRef,
  hoveredId,
  selectedId,
  onAnnotationClick,
  onAnnotationHover,
}: AnnotationIconOverlayProps) {
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

  if (!camera || annotations.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {annotations.map(({ data, position }) => (
        <AnnotationIcon
          key={data.id}
          annotation={data}
          position={position}
          camera={camera}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
          isHovered={hoveredId === data.id}
          isSelected={selectedId === data.id}
          onClick={onAnnotationClick}
          onHover={onAnnotationHover}
        />
      ))}
    </div>
  );
}

export default AnnotationOverlay;
