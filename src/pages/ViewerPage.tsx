import { useParams, Navigate } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewerProvider, useViewer } from '@/contexts/ViewerContext';
import { useAuth } from '@/contexts/AuthContext';
import Viewer3D from '@/components/viewer/Viewer3D';
import ViewerToolbar from '@/components/viewer/ViewerToolbar';
import ViewerHeader from '@/components/viewer/ViewerHeader';
import { CollaborationPanel, type CollaborationTab, type MeasurementToolType } from '@/components/viewer/CollaborationPanel';
import ViewerSharePanel from '@/components/viewer/ViewerSharePanel';
import ViewerLoadingOverlay from '@/components/viewer/ViewerLoadingOverlay';
import AnnotationModal from '@/components/viewer/AnnotationModal';
import { AnnotationIconOverlay } from '@/components/viewer/AnnotationMarker';
import { MeasurementIconOverlay, type MeasurementPointData } from '@/components/viewer/MeasurementMarker';
import { MeasurementLabelOverlay, type MeasurementLabelData } from '@/components/viewer/MeasurementLabel';
import { MeasurementCalculator, type MeasurementUnit } from '@/lib/viewer/MeasurementCalculator';
import { AxisNavigator, type ViewDirection } from '@/components/viewer/AxisNavigator';
import { MagnifierLoupe } from '@/components/viewer/MagnifierLoupe';
import type { AnnotationData } from '@/lib/viewer/AnnotationRenderer';
import { getProjectById as getMockProjectById, getScanById as getMockScanById } from '@/data/mockProjects';
import { getProjectById as getSupabaseProject } from '@/lib/supabase/services/projects';
import { getScanById as getSupabaseScan, getScanTransform, saveScanTransform } from '@/lib/supabase/services/scans';
import {
  getScanAnnotations,
  createAnnotation as createAnnotationService,
  updateAnnotation as updateAnnotationService,
  deleteAnnotation as deleteAnnotationService,
  addAnnotationReply as addAnnotationReplyService,
  getScanMeasurements,
  createMeasurement as createMeasurementService,
  updateMeasurement as updateMeasurementService,
  deleteMeasurement as deleteMeasurementService,
  getScanWaypoints,
  createWaypoint as createWaypointService,
  deleteWaypoint as deleteWaypointService,
} from '@/lib/supabase/services/annotations';
import { CameraAnimator } from '@/lib/viewer/CameraAnimator';
import { SaveViewDialog } from '@/components/viewer/SaveViewDialog';
import type { CameraState, SavedView, Measurement } from '@/types/viewer';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  AREA_SNAP_THRESHOLD,
  RIGHT_CLICK_CONFIRM_MS,
  RIGHT_CLICK_MOVE_THRESHOLD,
} from '@/lib/viewer/constants';
import { useAnnotationSubscription } from '@/hooks/useAnnotationSubscription';
import { useScanStatusSubscription, type ScanStatusInfo } from '@/hooks/useScanStatusSubscription';
import type { Annotation as DbAnnotation, AnnotationReply as DbAnnotationReply } from '@/lib/supabase/database.types';
import { CompressionProgress } from '@/components/upload/CompressionProgress';
import { SceneManager } from '@/lib/viewer/SceneManager';
import { UserRole } from '@/types/user';
import type { SplatLoadProgress, SplatLoadError, SplatTransform, TransformMode } from '@/types/viewer';
import { DEFAULT_SPLAT_TRANSFORM } from '@/types/viewer';

// Normalized types for viewer compatibility
interface ViewerMember {
  user: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  };
  role: UserRole;
}

interface ViewerProject {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  industry: string;
  userRole: UserRole;
  members: ViewerMember[];
}

interface ViewerScan {
  id: string;
  name: string;
  thumbnail: string | null;
  modelUrl: string;
}

// Scan info for switcher dropdown (lightweight, all project scans)
interface ViewerScanInfo {
  id: string;
  name: string;
  status: string;
}

/**
 * Validate that a position has finite coordinates within reasonable bounds
 * Prevents sending invalid data to Supabase (NaN, Infinity, or extreme values)
 */
const isValidPosition = (pos: { x: number; y: number; z: number }): boolean => {
  return (
    Number.isFinite(pos.x) &&
    Number.isFinite(pos.y) &&
    Number.isFinite(pos.z) &&
    Math.abs(pos.x) < 1e6 &&
    Math.abs(pos.y) < 1e6 &&
    Math.abs(pos.z) < 1e6
  );
};

// Inner component that uses the ViewerContext
const ViewerContent = () => {
  const { projectId, scanId } = useParams<{ projectId: string; scanId: string }>();
  const { user } = useAuth();
  const {
    state,
    permissions,
    userRole,
    setActiveTool,
    setViewMode,
    toggleGrid,
    addMeasurement,
    removeMeasurement,
    loadMeasurements,
    startMeasurement,
    addMeasurementPoint,
    undoLastMeasurementPoint,
    cancelMeasurement,
    finalizeMeasurement,
    selectMeasurement,
    hoverMeasurement,
    startDraggingMeasurementPoint,
    stopDraggingMeasurementPoint,
    updateMeasurementPoint,
    updateMeasurementPoints,
    removeSegmentFromMeasurement,
    addAnnotation,
    removeAnnotation,
    updateAnnotationStatus,
    updateAnnotationPosition,
    addAnnotationReply,
    selectAnnotation,
    hoverAnnotation,
    openAnnotationPanel,
    closeAnnotationPanel,
    openAnnotationModal,
    closeAnnotationModal,
    loadAnnotations,
    toggleAnnotations,
    toggleMeasurements,
    toggleCleanView,
    setSplatViewMode,
    openCollaborationPanel,
    closeCollaborationPanel,
    setActiveCollaborationTab,
    addSavedView,
    removeSavedView,
    loadSavedViews,
    setActiveSavedView,
  } = useViewer();

  // Get current user ID (generate unique session ID for demo mode to isolate demo users)
  const [demoSessionId] = useState(() => `demo-${crypto.randomUUID().slice(0, 8)}`);
  const currentUserId = user?.id || demoSessionId;

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<SplatLoadProgress | null>(null);
  const [loadError, setLoadError] = useState<SplatLoadError | null>(null);

  // Async state for project and scan data
  const [project, setProject] = useState<ViewerProject | null>(null);
  const [scan, setScan] = useState<ViewerScan | null>(null);
  const [projectScans, setProjectScans] = useState<ViewerScanInfo[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Compression status tracking
  const [scanStatusInfo, setScanStatusInfo] = useState<ScanStatusInfo | null>(null);

  // Transform state
  const [transformMode, setTransformMode] = useState<TransformMode | null>(null);
  const [initialTransform, setInitialTransform] = useState<SplatTransform | undefined>(undefined);
  const [transformVersion, setTransformVersion] = useState(0); // Increments on gizmo drag to invalidate label positions
  const [currentTransform, setCurrentTransform] = useState<SplatTransform | null>(null);
  const [savedTransform, setSavedTransform] = useState<SplatTransform | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [sceneManagerReady, setSceneManagerReady] = useState(false);
  const resetViewFnRef = useRef<(() => void) | null>(null);

  // Refs for delete handlers (to avoid TDZ in keyboard handler useEffect)
  const handleMeasurementDeleteRef = useRef<((id: string) => void) | null>(null);
  const handleAnnotationDeleteRef = useRef<((id: string) => void) | null>(null);

  // Camera state for HTML annotation overlay
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Renderer and controls state for axis navigator gizmo
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);

  // Annotation persistence state
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);

  // Saved Views state
  const [isSaveViewDialogOpen, setIsSaveViewDialogOpen] = useState(false);
  const [pendingCameraState, setPendingCameraState] = useState<CameraState | null>(null);
  const cameraAnimatorRef = useRef<CameraAnimator | null>(null);

  // Magnifier loupe state
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0, visible: false });
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);

  // Measurement preview cursor position (for showing preview line during placement)
  const [measurementCursorPosition, setMeasurementCursorPosition] = useState<THREE.Vector3 | null>(null);

  // Hovered measurement label (for dashing and delete UI)
  const [hoveredLabelId, setHoveredLabelId] = useState<string | null>(null);

  // Orbit state tracking (for freezing preview during camera drag)
  const [isOrbiting, setIsOrbiting] = useState(false);

  // Track if cursor is near first point of area measurement (for snap affordance)
  const isNearFirstPoint = useMemo(() => {
    const pending = state.pendingMeasurement;
    if (pending?.type !== 'area' || pending.points.length < 3 || !measurementCursorPosition) {
      return false;
    }
    const firstPoint = pending.points[0];
    return measurementCursorPosition.distanceTo(firstPoint) < AREA_SNAP_THRESHOLD;
  }, [state.pendingMeasurement, measurementCursorPosition]);

  // Cache for measurement labels during drag (avoids recalculation while dragging)
  const prevLabelsRef = useRef<MeasurementLabelData[]>([]);

  /**
   * Normalize a position to THREE.Vector3.
   * Handles both Vector3 instances and plain {x, y, z} objects.
   */
  const normalizeVector3 = useCallback((pos: THREE.Vector3 | { x: number; y: number; z: number }): THREE.Vector3 =>
    pos instanceof THREE.Vector3 ? pos : new THREE.Vector3(pos.x, pos.y, pos.z), []);

  /**
   * Get segment indices adjacent to a point in a measurement.
   * For distance polylines: segment[i] connects point[i] to point[i+1]
   * For area polygons: segment[i] connects point[i] to point[(i+1) % n] (closed)
   */
  const getAffectedSegmentIndices = useCallback((measurement: Measurement, pointIndex: number): number[] => {
    const pointCount = measurement.points.length;
    if (measurement.type === 'distance') {
      // Distance polyline: segment[i] connects point[i] to point[i+1]
      const affected: number[] = [];
      if (pointIndex > 0) affected.push(pointIndex - 1); // Segment before this point
      if (pointIndex < pointCount - 1) affected.push(pointIndex); // Segment after this point
      return affected;
    } else if (measurement.type === 'area') {
      // Area polygon: segment[i] connects point[i] to point[(i+1) % n]
      const prevSegment = (pointIndex - 1 + pointCount) % pointCount;
      return [prevSegment, pointIndex];
    }
    return [];
  }, []);

  /**
   * Generate preview labels for segments affected by a point drag.
   * Shows blue-styled labels with updated distance/area values.
   */
  const generateDragPreviewLabels = useCallback((
    measurement: Measurement,
    pointIndex: number,
    cursorPosition: THREE.Vector3,
  ): MeasurementLabelData[] => {
    const labels: MeasurementLabelData[] = [];
    const points = measurement.points.map(normalizeVector3);
    const pointCount = points.length;
    const unit = (measurement.unit || 'ft') as MeasurementUnit;

    if (measurement.type === 'distance') {
      // Segment before dragged point (connects prev point to cursor)
      if (pointIndex > 0) {
        const p1 = points[pointIndex - 1];
        const midpoint = MeasurementCalculator.calculateMidpoint(p1, cursorPosition);
        const distance = p1.distanceTo(cursorPosition);
        labels.push({
          id: `drag-preview-${measurement.id}-seg-${pointIndex - 1}`,
          position: midpoint,
          value: MeasurementCalculator.formatDistance(distance, unit),
          type: 'segment',
          isPreview: true,
          measurementId: measurement.id,
          segmentIndex: pointIndex - 1,
          canDelete: false,
        });
      }
      // Segment after dragged point (connects cursor to next point)
      if (pointIndex < pointCount - 1) {
        const p2 = points[pointIndex + 1];
        const midpoint = MeasurementCalculator.calculateMidpoint(cursorPosition, p2);
        const distance = cursorPosition.distanceTo(p2);
        labels.push({
          id: `drag-preview-${measurement.id}-seg-${pointIndex}`,
          position: midpoint,
          value: MeasurementCalculator.formatDistance(distance, unit),
          type: 'segment',
          isPreview: true,
          measurementId: measurement.id,
          segmentIndex: pointIndex,
          canDelete: false,
        });
      }
    } else if (measurement.type === 'area') {
      // Previous segment (connects prev point to cursor)
      const prevIdx = (pointIndex - 1 + pointCount) % pointCount;
      const p1 = points[prevIdx];
      const mid1 = MeasurementCalculator.calculateMidpoint(p1, cursorPosition);
      const dist1 = p1.distanceTo(cursorPosition);
      labels.push({
        id: `drag-preview-${measurement.id}-seg-${prevIdx}`,
        position: mid1,
        value: MeasurementCalculator.formatDistance(dist1, unit),
        type: 'segment',
        isPreview: true,
        measurementId: measurement.id,
        segmentIndex: prevIdx,
        canDelete: false,
      });

      // Next segment (connects cursor to next point)
      const nextIdx = (pointIndex + 1) % pointCount;
      const p2 = points[nextIdx];
      const mid2 = MeasurementCalculator.calculateMidpoint(cursorPosition, p2);
      const dist2 = cursorPosition.distanceTo(p2);
      labels.push({
        id: `drag-preview-${measurement.id}-seg-${pointIndex}`,
        position: mid2,
        value: MeasurementCalculator.formatDistance(dist2, unit),
        type: 'segment',
        isPreview: true,
        measurementId: measurement.id,
        segmentIndex: pointIndex,
        canDelete: false,
      });

      // Update centroid label with new area (recalculate with cursor replacing dragged point)
      const newPoints = [...points];
      newPoints[pointIndex] = cursorPosition;
      const newArea = MeasurementCalculator.calculateArea(newPoints);
      const centroid = MeasurementCalculator.calculateCentroid(newPoints);
      labels.push({
        id: `drag-preview-${measurement.id}-area`,
        position: centroid,
        value: MeasurementCalculator.formatArea(newArea, unit),
        type: 'area',
        isPreview: true,
        measurementId: measurement.id,
        canDelete: false,
      });
    }

    return labels;
  }, [normalizeVector3]);

  // Build measurement label data for overlay
  // During drag, generate preview labels for affected segments while keeping others cached
  const measurementLabels = useMemo<MeasurementLabelData[]>(() => {
    // Handle drag preview: generate preview labels for affected segments
    if (state.draggingMeasurementPoint && measurementCursorPosition) {
      const { measurementId, pointIndex } = state.draggingMeasurementPoint;
      const measurement = state.measurements.find(m => m.id === measurementId);
      if (!measurement) return prevLabelsRef.current;

      // Determine which segments are affected by the drag
      const affectedSegments = getAffectedSegmentIndices(measurement, pointIndex);

      // Filter out affected labels from cache (keep non-affected labels stable)
      const unaffectedLabels = prevLabelsRef.current.filter(label => {
        if (label.measurementId !== measurementId) return true;
        // For area measurements, also hide the centroid label (we recalculate it)
        if (measurement.type === 'area' && label.type === 'area') return false;
        if (label.segmentIndex === undefined) return true;
        return !affectedSegments.includes(label.segmentIndex);
      });

      // Generate preview labels for affected segments
      const previewLabels = generateDragPreviewLabels(
        measurement,
        pointIndex,
        measurementCursorPosition
      );

      return [...unaffectedLabels, ...previewLabels];
    }

    // Return cached labels during drag without cursor position
    if (state.draggingMeasurementPoint) {
      return prevLabelsRef.current;
    }

    const labels: MeasurementLabelData[] = [];
    const renderer = sceneManagerRef.current?.getMeasurementRenderer();

    // Labels for finalized measurements
    for (const measurement of state.measurements) {
      const unit = (measurement.unit || 'ft') as MeasurementUnit;
      const canDelete = permissions.canMeasure;

      if (measurement.type === 'distance') {
        // Get segment midpoint positions from renderer (handles polylines and transform parenting)
        const positions = renderer?.getDistanceLabelPositions(measurement.id);
        if (positions) {
          // Add label for each segment (can delete individual segments)
          positions.segments.forEach((seg, i) => {
            labels.push({
              id: `${measurement.id}-seg-${i}`,
              position: seg.position,
              value: MeasurementCalculator.formatDistance(seg.length, unit),
              type: 'segment',
              measurementId: measurement.id,
              segmentIndex: i,
              canDelete, // Can delete segment (removes start point)
            });
          });
          // Note: Total label removed from 3D view - total is shown in UI panel instead
        }
      } else if (measurement.type === 'area') {
        // Get centroid and segment positions from renderer
        const positions = renderer?.getAreaLabelPositions(measurement.id);
        if (positions) {
          // Centroid label (total area) - can delete entire measurement
          labels.push({
            id: `${measurement.id}-area`,
            position: positions.centroid,
            value: MeasurementCalculator.formatArea(measurement.value, unit),
            type: 'area',
            measurementId: measurement.id,
            canDelete, // Can delete entire area measurement
          });
          // Segment labels (each side length) - cannot delete individual sides
          positions.segments.forEach((seg, i) => {
            labels.push({
              id: `${measurement.id}-seg-${i}`,
              position: seg.position,
              value: MeasurementCalculator.formatDistance(seg.length, unit),
              type: 'segment',
              measurementId: measurement.id,
              segmentIndex: i,
              canDelete: false, // Cannot delete individual polygon sides
            });
          });
        }
      }
    }

    // Preview labels (during measurement placement)
    if (state.pendingMeasurement && measurementCursorPosition && !isOrbiting) {
      const points = state.pendingMeasurement.points;
      const unit = state.measurementUnit || 'ft';

      if (points.length > 0) {
        // Labels for already-placed segments (if polyline has 2+ placed points)
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const midpoint = MeasurementCalculator.calculateMidpoint(p1, p2);
          const distance = p1.distanceTo(p2);

          labels.push({
            id: `preview-seg-${i}`,
            position: midpoint,
            value: MeasurementCalculator.formatDistance(distance, unit as MeasurementUnit),
            type: 'segment',
            isPreview: true,
          });
        }

        // Preview label for current segment (last placed point to cursor)
        const lastPoint = points[points.length - 1];
        const cursorPoint = measurementCursorPosition;
        const midpoint = MeasurementCalculator.calculateMidpoint(lastPoint, cursorPoint);
        const distance = lastPoint.distanceTo(cursorPoint);

        labels.push({
          id: 'preview-cursor-label',
          position: midpoint,
          value: MeasurementCalculator.formatDistance(distance, unit as MeasurementUnit),
          type: 'distance',
          isPreview: true,
        });
      }
    }

    // Cache labels for drag optimization
    prevLabelsRef.current = labels;
    return labels;
  }, [state.measurements, state.pendingMeasurement, state.draggingMeasurementPoint, measurementCursorPosition, isOrbiting, sceneManagerReady, transformVersion, permissions.canMeasure, getAffectedSegmentIndices, generateDragPreviewLabels]);

  /**
   * Persist a measurement to Supabase if configured.
   * Validates all points have finite coordinates within reasonable bounds.
   * Returns silently on validation failure (measurement saved locally only).
   */
  const persistMeasurement = useCallback(async (measurement: Measurement | null) => {
    if (!measurement || !scanId || !isSupabaseConfigured()) return;

    const allPointsValid = measurement.points.every(p =>
      isValidPosition({ x: p.x, y: p.y, z: p.z })
    );
    if (!allPointsValid) return;

    try {
      await createMeasurementService({
        scan_id: scanId,
        type: measurement.type,
        points_json: measurement.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
        value: measurement.value,
        unit: measurement.unit,
        label: measurement.label || null,
        created_by: currentUserId,
      });
    } catch {
      // Measurement saved locally, persistence failed silently
    }
  }, [scanId, currentUserId]);

  // Real-time annotation subscription
  const { isConnected: isRealtimeConnected } = useAnnotationSubscription({
    scanId: scanId || '',
    enabled: !!scanId && isSupabaseConfigured(),
    handlers: {
      onAnnotationInsert: (annotation: DbAnnotation) => {
        // Only add if not already in local state (avoid duplicates from own changes)
        if (!state.annotations.find(a => a.id === annotation.id)) {
          addAnnotation({
            id: annotation.id,
            type: annotation.type as 'pin' | 'comment' | 'markup',
            position: new THREE.Vector3(annotation.position_x, annotation.position_y, annotation.position_z),
            content: annotation.content,
            status: annotation.status as 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived',
            createdBy: annotation.created_by,
          } as Parameters<typeof addAnnotation>[0]);
        }
      },
      onAnnotationUpdate: (annotation: DbAnnotation) => {
        updateAnnotationStatus(annotation.id, annotation.status as 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived');
      },
      onAnnotationDelete: (oldAnnotation: DbAnnotation) => {
        // Only remove from local state (don't trigger another delete to Supabase)
        removeAnnotation(oldAnnotation.id);
      },
      onReplyInsert: (reply: DbAnnotationReply) => {
        // Add reply to local state if the annotation exists
        const annotationExists = state.annotations.find(a => a.id === reply.annotation_id);
        if (annotationExists) {
          // Check if reply already exists (avoid duplicates)
          const replyExists = annotationExists.replies?.find(r => r.id === reply.id);
          if (!replyExists) {
            addAnnotationReply(reply.annotation_id, reply.content, reply.created_by);
          }
        }
      },
      onReplyDelete: (oldReply: DbAnnotationReply) => {
        // Reply deletion not currently supported in local state
        // Would need to add removeAnnotationReply to ViewerContext
      },
    },
  });

  // Real-time scan status subscription (for compression progress)
  useScanStatusSubscription({
    scanId: scanId || null,
    enabled: !!scanId && isSupabaseConfigured(),
    onStatusChange: (info) => {
      setScanStatusInfo(info);
    },
    onReady: (updatedScan) => {
      // Compression complete - update scan with new file URL
      setScan((prev) =>
        prev
          ? {
              ...prev,
              modelUrl: updatedScan.file_url,
            }
          : null
      );
      // Clear status info since we're now ready
      setScanStatusInfo({
        status: 'ready',
        compressionProgress: 100,
        errorMessage: null,
        compressedFileUrl: updatedScan.file_url,
        compressionRatio: updatedScan.compression_ratio,
      });
    },
    onError: (errorMessage) => {
      // Compression failed - show error
      setScanStatusInfo((prev) =>
        prev
          ? { ...prev, status: 'error', errorMessage }
          : { status: 'error', compressionProgress: null, errorMessage, compressedFileUrl: null, compressionRatio: null }
      );
    },
  });

  // Load project and scan data from Supabase or mock
  useEffect(() => {
    async function loadData() {
      setIsDataLoading(true);

      if (!projectId || !scanId) {
        setIsDataLoading(false);
        return;
      }

      // Try Supabase first if configured
      if (isSupabaseConfigured()) {
        try {
          const [projectResult, scanResult, transformResult] = await Promise.all([
            getSupabaseProject(projectId),
            getSupabaseScan(scanId),
            getScanTransform(scanId)
          ]);

          if (projectResult && scanResult) {
            // Normalize Supabase data to viewer format
            setProject({
              id: projectResult.id,
              name: projectResult.name,
              description: projectResult.description,
              thumbnail: projectResult.thumbnail_url,
              industry: projectResult.industry,
              userRole: 'viewer', // TODO: Get actual role from project members
              members: [], // TODO: Load from project_members when available
            });
            setScan({
              id: scanResult.id,
              name: scanResult.name,
              thumbnail: scanResult.thumbnail_url,
              modelUrl: scanResult.file_url, // Map file_url to modelUrl
            });

            // Extract all scans for the scan switcher
            const scans = (projectResult as { scans?: Array<{ id: string; name: string; status: string }> }).scans || [];
            setProjectScans(scans.map(s => ({
              id: s.id,
              name: s.name,
              status: s.status || 'ready',
            })));

            // Set initial transform (use saved if available, otherwise default)
            // Handle backward compatibility with legacy orientation data
            if (transformResult) {
              setInitialTransform(transformResult);
              setSavedTransform(transformResult);
              setCurrentTransform(transformResult);
            } else {
              setInitialTransform(DEFAULT_SPLAT_TRANSFORM);
              setSavedTransform(null);
              setCurrentTransform(DEFAULT_SPLAT_TRANSFORM);
            }

            // Validate file exists before attempting to load
            if (!scanResult.file_url) {
              setLoadError({
                message: 'No file associated with this scan',
                code: 'NO_FILE',
                url: ''
              });
            }

            // Load existing annotations from Supabase
            try {
              const annotationsData = await getScanAnnotations(scanId);
              if (annotationsData && annotationsData.length > 0) {
                // Convert database format to viewer format
                const viewerAnnotations = annotationsData.map(ann => ({
                  id: ann.id,
                  type: ann.type as 'pin' | 'comment' | 'markup',
                  position: new THREE.Vector3(ann.position_x, ann.position_y, ann.position_z),
                  content: ann.content,
                  status: ann.status as 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived',
                  createdAt: ann.created_at,
                  createdBy: ann.created_by,
                  createdByName: ann.creator?.name || ann.creator?.email || 'Unknown',
                  replies: (ann.replies || []).map(reply => ({
                    id: reply.id,
                    content: reply.content,
                    createdAt: reply.created_at,
                    createdBy: reply.created_by,
                    createdByName: 'User', // Reply profiles not joined yet
                  })),
                }));
                loadAnnotations(viewerAnnotations);
              }
            } catch {
              // Don't block the viewer for annotation errors
            }

            // Load existing measurements from Supabase
            try {
              const measurementsData = await getScanMeasurements(scanId);
              if (measurementsData && measurementsData.length > 0) {
                // Convert database format to viewer format
                const viewerMeasurements = measurementsData.map(m => {
                  const pointsJson = m.points_json as Array<{ x: number; y: number; z: number }>;
                  return {
                    id: m.id,
                    type: m.type as 'distance' | 'area',
                    points: pointsJson.map(p => new THREE.Vector3(p.x, p.y, p.z)),
                    value: m.value,
                    unit: m.unit,
                    label: m.label || undefined,
                    createdBy: m.created_by,
                    createdAt: m.created_at,
                  };
                });
                loadMeasurements(viewerMeasurements);
              }
            } catch {
              // Don't block the viewer for measurement errors
            }

            // Load saved views (camera waypoints) from Supabase
            try {
              const waypointsData = await getScanWaypoints(scanId);
              if (waypointsData && waypointsData.length > 0) {
                // Convert database format to viewer format
                const viewerSavedViews: SavedView[] = waypointsData.map(wp => {
                  const positionJson = wp.position_json as { x: number; y: number; z: number };
                  const targetJson = wp.target_json as { x: number; y: number; z: number };
                  return {
                    id: wp.id,
                    scanId: wp.scan_id,
                    name: wp.name,
                    camera: {
                      position: positionJson,
                      target: targetJson,
                      fov: wp.fov || 50,
                    },
                    thumbnail: wp.thumbnail_url || undefined,
                    sortOrder: wp.sort_order || 0,
                    createdBy: wp.created_by,
                    createdAt: wp.created_at,
                  };
                });
                loadSavedViews(viewerSavedViews);
              }
            } catch {
              // Don't block the viewer for saved views errors
            }

            setIsDataLoading(false);
            return;
          }
        } catch (error) {
          // Fall through to mock data on error
        }
      }

      // Fall back to mock data for demo mode
      const mockProject = getMockProjectById(projectId);
      const mockScan = getMockScanById(projectId, scanId);

      if (mockProject && mockScan) {
        setProject({
          id: mockProject.id,
          name: mockProject.name,
          description: mockProject.description,
          thumbnail: mockProject.thumbnail,
          industry: mockProject.industry,
          userRole: mockProject.userRole,
          members: mockProject.members.map(m => ({
            user: {
              id: m.user.id,
              name: m.user.name,
              avatar: m.user.avatar,
              initials: m.user.initials,
            },
            role: m.role,
          })),
        });
        setScan({
          id: mockScan.id,
          name: mockScan.name,
          thumbnail: mockScan.thumbnail,
          modelUrl: mockScan.modelUrl || '',
        });

        // Extract all scans for the scan switcher (mock data)
        setProjectScans(mockProject.scans.map(s => ({
          id: s.id,
          name: s.name,
          status: 'ready', // Mock scans are always ready
        })));

        // Set default transform for demo mode
        setInitialTransform(DEFAULT_SPLAT_TRANSFORM);
        setSavedTransform(null);
        setCurrentTransform(DEFAULT_SPLAT_TRANSFORM);

        // Validate file exists before attempting to load
        if (!mockScan.modelUrl) {
          setLoadError({
            message: 'No file associated with this scan',
            code: 'NO_FILE',
            url: ''
          });
        }
      }
      setIsDataLoading(false);
    }

    loadData();
  }, [projectId, scanId]);

  // Handle point selection for measurements/annotations
  const handlePointSelect = useCallback(async (point: THREE.Vector3, isDoubleClick?: boolean) => {
    if (state.activeTool === 'distance') {
      // Distance measurement: polyline with 2+ points
      // Finalization options:
      // 1. Double-click (requires 2+ points)
      // 2. Press Enter (keyboard shortcut)
      // 3. Escape cancels entire measurement
      if (!state.pendingMeasurement) {
        // Start a new distance measurement
        startMeasurement('distance');
        addMeasurementPoint(point);
      } else {
        const pending = state.pendingMeasurement;

        // Double-click: finalize if we have at least 2 points
        if (isDoubleClick && pending.points.length >= 1) {
          // Add the double-click point first
          addMeasurementPoint(point);
          // Use setTimeout to ensure state update completes before finalizing
          setTimeout(async () => {
            const measurement = finalizeMeasurement(currentUserId);
            sceneManagerRef.current?.clearMeasurementPreview();
            setMeasurementCursorPosition(null);
            await persistMeasurement(measurement);
          }, 0);
          return;
        }

        // Normal click: add another point to the polyline
        addMeasurementPoint(point);
      }
    } else if (state.activeTool === 'area') {
      // Area measurement: 3+ points required
      // Finalization options:
      // 1. Click near first point (snap-to-close, requires 3+ points)
      // 2. Press Enter (keyboard shortcut)
      // Note: Double-click removed to prevent accidental early closure
      if (!state.pendingMeasurement) {
        // Start a new area measurement
        startMeasurement('area');
        addMeasurementPoint(point);
      } else {
        const pending = state.pendingMeasurement;
        const firstPoint = pending.points[0];

        // Click near first point: close polygon (requires 3+ points)
        if (pending.points.length >= 3 && point.distanceTo(firstPoint) < AREA_SNAP_THRESHOLD) {
          // Don't add the click point - just close the polygon
          setTimeout(async () => {
            const measurement = finalizeMeasurement(currentUserId);
            sceneManagerRef.current?.clearMeasurementPreview();
            setMeasurementCursorPosition(null);
            await persistMeasurement(measurement);
          }, 0);
          return;
        }

        // Normal click: add another point
        addMeasurementPoint(point);
      }
    } else if (state.activeTool === 'pin' || state.activeTool === 'comment') {
      // Open annotation modal for annotation creation
      openAnnotationModal(point);
    }
  }, [state.activeTool, state.pendingMeasurement, startMeasurement, addMeasurementPoint, finalizeMeasurement, currentUserId, scanId, openAnnotationModal]);

  // Handle scene ready
  const handleSceneReady = useCallback((manager: SceneManager) => {
    sceneManagerRef.current = manager;
    setSceneManagerReady(true);  // Trigger sync effects to re-run
  }, []);

  // Track rendered measurements to sync with scene (ID -> point count for change detection)
  const renderedMeasurementsRef = useRef<Map<string, number>>(new Map());

  // Track rendered annotations to sync with scene
  const renderedAnnotationsRef = useRef<Set<string>>(new Set());

  // Sync annotations with SceneManager (for transform parenting)
  useEffect(() => {
    if (!sceneManagerRef.current) return;

    const manager = sceneManagerRef.current;
    const renderedIds = renderedAnnotationsRef.current;
    const currentIds = new Set(state.annotations.map(a => a.id));

    // Add new annotations to scene
    for (const annotation of state.annotations) {
      if (!renderedIds.has(annotation.id)) {
        manager.addAnnotation(annotation.id, normalizeVector3(annotation.position), {
          id: annotation.id,
          scanId: scanId || '',
          type: annotation.type,
          status: annotation.status,
          content: annotation.content,
          createdBy: annotation.createdBy,
          createdAt: annotation.createdAt,
          replyCount: annotation.replies?.length || 0,
        });
        renderedIds.add(annotation.id);
      }
    }

    // Remove deleted annotations from scene
    for (const id of renderedIds) {
      if (!currentIds.has(id)) {
        manager.removeAnnotation(id);
        renderedIds.delete(id);
      }
    }
  }, [state.annotations, scanId, sceneManagerReady]);

  // Sync measurements with SceneManager
  useEffect(() => {
    if (!sceneManagerRef.current) return;

    const manager = sceneManagerRef.current;
    const renderedMap = renderedMeasurementsRef.current;
    const currentIds = new Set(state.measurements.map(m => m.id));

    // Helper to add a measurement to the scene
    const addMeasurementToScene = (measurement: typeof state.measurements[0]) => {
      if (measurement.type === 'distance' && measurement.points.length >= 2) {
        // Pass first two points directly, additional points as array
        const [p1, p2, ...additionalPoints] = measurement.points;
        manager.addDistanceMeasurement(
          measurement.id,
          p1,
          p2,
          {
            id: measurement.id,
            unit: (measurement.unit as 'ft' | 'm' | 'in' | 'cm') || 'ft',
            label: measurement.label,
            createdBy: measurement.createdBy,
            createdAt: measurement.createdAt,
          },
          additionalPoints.length > 0 ? additionalPoints : undefined
        );
      } else if (measurement.type === 'area' && measurement.points.length >= 3) {
        manager.addAreaMeasurement(
          measurement.id,
          measurement.points,
          {
            id: measurement.id,
            unit: (measurement.unit as 'ft' | 'm' | 'in' | 'cm') || 'ft',
            label: measurement.label,
            createdBy: measurement.createdBy,
            createdAt: measurement.createdAt,
          }
        );
      }
      renderedMap.set(measurement.id, measurement.points.length);
    };

    // Process measurements: add new, update changed, track existing
    for (const measurement of state.measurements) {
      const prevPointCount = renderedMap.get(measurement.id);
      const currPointCount = measurement.points.length;

      if (prevPointCount === undefined) {
        // New measurement - add it
        addMeasurementToScene(measurement);
      } else if (prevPointCount !== currPointCount) {
        // Points changed - remove and re-add to rebuild geometry
        manager.removeMeasurement(measurement.id);
        addMeasurementToScene(measurement);
      }
      // else: unchanged, skip
    }

    // Remove deleted measurements from scene
    for (const id of renderedMap.keys()) {
      if (!currentIds.has(id)) {
        manager.removeMeasurement(id);
        renderedMap.delete(id);
      }
    }
  }, [state.measurements, sceneManagerReady]);

  // Sync measurement 3D visibility with state
  useEffect(() => {
    const renderer = sceneManagerRef.current?.getMeasurementRenderer();
    if (renderer) renderer.setVisible(state.showMeasurements);
  }, [state.showMeasurements]);

  // Sync measurement selection with renderer (for pulsing effect)
  useEffect(() => {
    const renderer = sceneManagerRef.current?.getMeasurementRenderer();
    renderer?.setSelected(state.selectedMeasurementId);
  }, [state.selectedMeasurementId]);

  // Show measurement preview line during placement (frozen during orbit)
  useEffect(() => {
    if (!sceneManagerRef.current) return;

    // Skip preview updates while orbiting (camera drag) - keeps preview frozen
    if (isOrbiting) return;

    const pending = state.pendingMeasurement;

    if (pending && pending.points.length >= 1 && measurementCursorPosition) {
      if (pending.type === 'distance') {
        // Distance: show preview polyline from all placed points to cursor
        sceneManagerRef.current.showDistancePreview(pending.points, measurementCursorPosition);
      } else if (pending.type === 'area') {
        // Area: show preview polygon with cursor as potential next point
        sceneManagerRef.current.showAreaPreview(pending.points, measurementCursorPosition);
      }
    } else {
      // Clear preview when no pending measurement or cursor not on surface
      sceneManagerRef.current.clearMeasurementPreview();
    }
  }, [state.pendingMeasurement, measurementCursorPosition, isOrbiting]);

  // Hover effect for measurement labels (dashing lines when hovered)
  useEffect(() => {
    const renderer = sceneManagerRef.current?.getMeasurementRenderer();
    if (!renderer) return;

    // Parse the hovered label ID to determine which lines to dash
    if (hoveredLabelId) {
      // Label IDs are formatted as:
      // - `${measurementId}-seg-${index}` for segments
      // - `${measurementId}-area` for area centroid
      // - `${measurementId}-total` for distance total
      const label = measurementLabels.find(l => l.id === hoveredLabelId);
      if (label?.measurementId) {
        if (label.type === 'area' || label.type === 'distance') {
          // Area centroid or distance total - dash ALL lines of the measurement
          renderer.setMeasurementDashed(label.measurementId, true);
        } else if (label.type === 'segment' && label.segmentIndex !== undefined) {
          // Segment label - dash only that segment
          renderer.setSegmentDashed(label.measurementId, label.segmentIndex, true);
        }
      }
    }

    // Cleanup: reset dashing when hover changes
    return () => {
      if (hoveredLabelId) {
        const label = measurementLabels.find(l => l.id === hoveredLabelId);
        if (label?.measurementId) {
          if (label.type === 'area' || label.type === 'distance') {
            renderer.setMeasurementDashed(label.measurementId, false);
          } else if (label.type === 'segment' && label.segmentIndex !== undefined) {
            renderer.setSegmentDashed(label.measurementId, label.segmentIndex, false);
          }
        }
      }
    };
  }, [hoveredLabelId, measurementLabels]);

  // Transform mode change handler
  const handleTransformModeChange = useCallback((mode: TransformMode | null) => {
    setTransformMode(mode);
  }, []);

  // Transform change handler (called when gizmo is manipulated)
  const handleTransformChange = useCallback((transform: SplatTransform) => {
    setCurrentTransform(transform);
    setTransformVersion(v => v + 1); // Invalidate measurement label positions
  }, []);

  // Reset view
  const handleResetView = useCallback(() => {
    resetViewFnRef.current?.();
  }, []);

  // Reset transform to initial/saved state
  const handleResetTransform = useCallback(() => {
    if (sceneManagerRef.current && initialTransform) {
      sceneManagerRef.current.setSplatTransform(initialTransform);
      setCurrentTransform(initialTransform);
      setTransformVersion(v => v + 1); // Invalidate measurement label positions
    }
  }, [initialTransform]);

  // Save current transform to Supabase
  const handleSaveTransform = useCallback(async () => {
    if (!scanId || !currentTransform) return;

    if (isSupabaseConfigured()) {
      try {
        await saveScanTransform(scanId, currentTransform);
        setSavedTransform(currentTransform);
        setInitialTransform(currentTransform); // Update initial so reset goes to saved state
      } catch {
        // Error saving transform - could show toast notification
      }
    } else {
      // Demo mode - just update local state
      setSavedTransform(currentTransform);
      setInitialTransform(currentTransform);
    }
  }, [scanId, currentTransform]);

  // Check if transform has unsaved changes
  const hasUnsavedTransform = currentTransform !== null &&
    savedTransform !== null &&
    JSON.stringify(currentTransform) !== JSON.stringify(savedTransform);

  // Handle save current view - captures camera state and opens dialog
  const handleSaveCurrentView = useCallback(() => {
    const animator = cameraAnimatorRef.current;
    if (!animator) return;

    const cameraState = animator.getCurrentState();
    setPendingCameraState({
      position: { x: cameraState.position.x, y: cameraState.position.y, z: cameraState.position.z },
      target: { x: cameraState.target.x, y: cameraState.target.y, z: cameraState.target.z },
      fov: cameraState.fov || 50,
    });
    setIsSaveViewDialogOpen(true);
  }, []);

  // Handle save view submit - persists to Supabase and local state
  const handleSaveViewSubmit = useCallback(async (name: string) => {
    if (!pendingCameraState || !scanId) return;

    // Generate default name based on existing views count
    const viewName = name || `View ${state.savedViews.length + 1}`;

    // Create saved view object
    const savedView: Omit<SavedView, 'id' | 'createdAt' | 'sortOrder'> = {
      scanId,
      name: viewName,
      camera: pendingCameraState,
      createdBy: currentUserId,
    };

    // Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { data: createdWaypoint } = await createWaypointService({
          scan_id: scanId,
          name: viewName,
          position_json: pendingCameraState.position,
          target_json: pendingCameraState.target,
          fov: pendingCameraState.fov,
          sort_order: state.savedViews.length,
          created_by: currentUserId,
        });

        // Add to local state with database ID
        if (createdWaypoint) {
          addSavedView({
            ...savedView,
            id: createdWaypoint.id,
          } as Parameters<typeof addSavedView>[0]);
        } else {
          // Fallback - add to local state without database ID
          addSavedView(savedView);
        }
      } catch {
        // Fallback to local-only
        addSavedView(savedView);
      }
    } else {
      // Demo mode - local state only
      addSavedView(savedView);
    }

    // Clear pending state
    setPendingCameraState(null);
    setIsSaveViewDialogOpen(false);
  }, [pendingCameraState, scanId, currentUserId, state.savedViews.length, addSavedView]);

  // Handle select view - fly to saved view with smooth animation
  const handleSelectView = useCallback(async (viewId: string) => {
    const savedView = state.savedViews.find(v => v.id === viewId);
    if (!savedView) return;

    const animator = cameraAnimatorRef.current;
    if (!animator) return;

    // Set active view
    setActiveSavedView(viewId);

    // Fly to the saved view position with smooth animation
    await animator.flyToSavedView(savedView.camera, { duration: 1000 });
  }, [state.savedViews, setActiveSavedView]);

  // Handle view snap from axis navigator - fly to orthographic view
  const handleViewSnap = useCallback(async (view: ViewDirection) => {
    const animator = cameraAnimatorRef.current;
    if (!animator) return;

    // Get current camera distance from target to maintain zoom level
    const currentState = animator.getCurrentState();
    const distance = currentState.position.distanceTo(currentState.target);
    const target = currentState.target.clone();

    // Calculate camera position based on view direction
    let cameraPosition: THREE.Vector3;
    switch (view) {
      case 'front':
        // +Z looking at -Z
        cameraPosition = new THREE.Vector3(target.x, target.y, target.z + distance);
        break;
      case 'back':
        // -Z looking at +Z
        cameraPosition = new THREE.Vector3(target.x, target.y, target.z - distance);
        break;
      case 'top':
        // +Y looking down at -Y
        cameraPosition = new THREE.Vector3(target.x, target.y + distance, target.z);
        break;
      case 'bottom':
        // -Y looking up at +Y
        cameraPosition = new THREE.Vector3(target.x, target.y - distance, target.z);
        break;
      case 'right':
        // +X looking at -X
        cameraPosition = new THREE.Vector3(target.x + distance, target.y, target.z);
        break;
      case 'left':
        // -X looking at +X
        cameraPosition = new THREE.Vector3(target.x - distance, target.y, target.z);
        break;
    }

    // Fly to the view position
    await animator.flyTo(
      { position: cameraPosition, target },
      { duration: 500 }
    );
  }, []);

  // Handle delete view - remove from local state and Supabase
  const handleDeleteView = useCallback(async (viewId: string) => {
    // Remove from local state immediately
    removeSavedView(viewId);

    // Delete from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await deleteWaypointService(viewId);
      } catch {
        // Error deleting view - already removed locally
      }
    }
  }, [removeSavedView]);

  // Keyboard shortcuts for transform modes and view controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Skip if annotation modal is open (let modal handle its own keyboard events)
      if (state.isAnnotationModalOpen) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'g':
          // G for "grab" (translate/move) - Blender convention
          setTransformMode(transformMode === 'translate' ? null : 'translate');
          setActiveTool(null); // Clear tool for mutual exclusivity
          break;
        case 'r':
          // R for rotate - Blender convention
          setTransformMode(transformMode === 'rotate' ? null : 'rotate');
          setActiveTool(null); // Clear tool for mutual exclusivity
          break;
        case 's':
          // S for scale - Blender convention
          setTransformMode(transformMode === 'scale' ? null : 'scale');
          setActiveTool(null); // Clear tool for mutual exclusivity
          break;
        case 'c':
          // C for comment tool - also opens panel
          if (state.activeTool === 'comment') {
            setActiveTool(null);
            closeCollaborationPanel();
          } else {
            setActiveTool('comment');
            setTransformMode(null); // Hide gizmo for mutual exclusivity
            openCollaborationPanel('annotations');
          }
          break;
        case 'd':
          // D for distance tool - also opens panel
          if (state.activeTool === 'distance') {
            setActiveTool(null);
            closeCollaborationPanel();
          } else {
            setActiveTool('distance');
            setTransformMode(null); // Hide gizmo for mutual exclusivity
            openCollaborationPanel('measurements');
          }
          break;
        case 'a':
          // A for area tool - also opens panel
          if (state.activeTool === 'area') {
            setActiveTool(null);
            closeCollaborationPanel();
          } else {
            setActiveTool('area');
            setTransformMode(null); // Hide gizmo for mutual exclusivity
            openCollaborationPanel('measurements');
          }
          break;
        case 'v':
          // Ctrl+Shift+V for save current view
          if (event.ctrlKey && event.shiftKey) {
            handleSaveCurrentView();
            event.preventDefault();
          } else {
            // V for reset view
            handleResetView();
          }
          break;
        case 'x':
          // X for reset transform
          handleResetTransform();
          break;
        case 't':
          // T for toggle grid
          toggleGrid();
          break;
        case 'h':
          // H for clean view toggle (hide/show all layers)
          toggleCleanView();
          break;
        case 'p':
          // P for point cloud toggle
          setSplatViewMode(state.splatViewMode === 'model' ? 'pointcloud' : 'model');
          break;
        case 'enter':
          // Enter to finalize measurement
          // Distance polyline: requires 2+ points
          // Area polygon: requires 3+ points
          if (state.pendingMeasurement?.type === 'distance' && state.pendingMeasurement.points.length >= 2) {
            const measurement = finalizeMeasurement(currentUserId);
            sceneManagerRef.current?.clearMeasurementPreview();
            setMeasurementCursorPosition(null);
            persistMeasurement(measurement);
          } else if (state.pendingMeasurement?.type === 'area' && state.pendingMeasurement.points.length >= 3) {
            const measurement = finalizeMeasurement(currentUserId);
            sceneManagerRef.current?.clearMeasurementPreview();
            setMeasurementCursorPosition(null);
            persistMeasurement(measurement);
          }
          break;
        case 'delete':
          // Delete selected annotation (measurements deleted via label X buttons)
          if (state.selectedAnnotationId) {
            handleAnnotationDeleteRef.current?.(state.selectedAnnotationId);
            selectAnnotation(null);
          }
          break;
        case 'backspace':
          // Backspace to undo last point when building a measurement
          if (state.pendingMeasurement && state.pendingMeasurement.points.length > 0) {
            undoLastMeasurementPoint();
            event.preventDefault(); // Prevent browser navigation
          } else if (state.selectedAnnotationId) {
            handleAnnotationDeleteRef.current?.(state.selectedAnnotationId);
            selectAnnotation(null);
          }
          break;
        case 'escape':
          // Escape to cancel pending measurement, hide gizmo, collapse panel, or clear annotation selection
          if (state.pendingMeasurement) {
            cancelMeasurement();
            sceneManagerRef.current?.clearMeasurementPreview();
            setMeasurementCursorPosition(null);
          } else if (state.selectedAnnotationId) {
            selectAnnotation(null);
            closeCollaborationPanel();
          } else if (state.isCollaborationPanelOpen) {
            // Collapse panel if expanded
            closeCollaborationPanel();
            setActiveTool(null);
          } else {
            setTransformMode(null);
            setActiveTool(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transformMode, toggleGrid, toggleCleanView, handleResetView, handleResetTransform, handleSaveCurrentView, state.activeTool, state.isAnnotationModalOpen, state.pendingMeasurement, state.selectedAnnotationId, state.isCollaborationPanelOpen, state.splatViewMode, setActiveTool, setSplatViewMode, cancelMeasurement, selectAnnotation, closeCollaborationPanel, openCollaborationPanel, undoLastMeasurementPoint, finalizeMeasurement, currentUserId, persistMeasurement]);

  // Right-click detection for measurement confirm (area and distance polylines)
  // Pattern: Let OrbitControls pan, but detect quick taps on pointerup
  // Quick tap (< 200ms, < 3px movement) = confirm measurement
  // Hold/drag = pan camera (OrbitControls handles, pan was no-op on quick tap anyway)
  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    // Track right-click gesture with local variables (no refs needed)
    let rightClickStart: { time: number; x: number; y: number } | null = null;

    const isMeasurementConfirmable = () => {
      const pending = state.pendingMeasurement;
      if (!pending) return false;
      if (pending.type === 'area' && pending.points.length >= 3) return true;
      if (pending.type === 'distance' && pending.points.length >= 2) return true;
      return false;
    };

    const handlePointerDown = (event: PointerEvent) => {
      // Only track right-click when measurement is confirmable
      if (event.button !== 2 || !isMeasurementConfirmable()) return;

      // Record start position and time (don't block OrbitControls)
      rightClickStart = {
        time: Date.now(),
        x: event.clientX,
        y: event.clientY,
      };
    };

    const handlePointerUp = async (event: PointerEvent) => {
      // Only handle right-click
      if (event.button !== 2 || !rightClickStart) return;

      const start = rightClickStart;
      rightClickStart = null;

      // Check if this was a quick tap with minimal movement
      if (!isMeasurementConfirmable()) return;

      const duration = Date.now() - start.time;
      const distance = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y
      );

      // Quick tap: confirm measurement
      // OrbitControls' "pan" was a no-op since there was no movement
      if (duration < RIGHT_CLICK_CONFIRM_MS && distance < RIGHT_CLICK_MOVE_THRESHOLD) {
        const measurement = finalizeMeasurement(currentUserId);
        sceneManagerRef.current?.clearMeasurementPreview();
        setMeasurementCursorPosition(null);
        await persistMeasurement(measurement);
      }
      // If user moved or held too long, they were panning - do nothing
    };

    // Attach to container (not capture phase - we're not blocking OrbitControls)
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerup', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerup', handlePointerUp);
    };
  }, [state.pendingMeasurement, finalizeMeasurement, currentUserId, persistMeasurement]);

  // Smart right-click: block context menu during placement tools
  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    const handleContextMenu = (event: MouseEvent) => {
      // Always prevent context menu when placement tool is active
      const isPlacementTool = state.activeTool &&
        ['distance', 'area', 'comment', 'pin', 'angle'].includes(state.activeTool);
      if (isPlacementTool) {
        event.preventDefault();
      }
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, [state.activeTool]);

  // Note: Measurement point drag end (pointerup) is now handled in Viewer3D.tsx
  // This allows ref-only updates during drag for smooth 60fps performance

  // Handle annotation submission with Supabase persistence
  const handleAnnotationSubmit = useCallback(async (data: {
    type: 'pin' | 'comment' | 'markup';
    position: { x: number; y: number; z: number };
    content: string;
    status: 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived';
    createdBy: string;
    cameraSnapshot?: {
      position: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
      fov: number;
    };
  }) => {
    if (!scanId) return;

    // Validate position before persisting
    if (!isValidPosition(data.position)) {
      // Invalid position - add to local state only with warning
      addAnnotation({
        type: data.type,
        position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
        content: data.content,
        status: data.status,
        createdBy: currentUserId,
        createdByName: user?.name || user?.email || 'You',
        cameraSnapshot: data.cameraSnapshot,
      });
      return;
    }

    setIsSavingAnnotation(true);

    // Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { data: savedAnnotation, error } = await createAnnotationService({
          scan_id: scanId,
          type: data.type,
          position_x: data.position.x,
          position_y: data.position.y,
          position_z: data.position.z,
          content: data.content,
          status: data.status,
          created_by: currentUserId,
        });

        if (error) {
          // Still add to local state for UX
        }

        // Add to local state with database ID if available
        addAnnotation({
          ...(savedAnnotation ? { id: savedAnnotation.id } : {}),
          type: data.type,
          position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
          content: data.content,
          status: data.status,
          createdBy: currentUserId,
          createdByName: user?.name || user?.email || 'You',
          cameraSnapshot: data.cameraSnapshot,
        } as Parameters<typeof addAnnotation>[0]);
      } catch {
        // Fallback to local-only
        addAnnotation({
          type: data.type,
          position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
          content: data.content,
          status: data.status,
          createdBy: currentUserId,
          createdByName: user?.name || user?.email || 'You',
          cameraSnapshot: data.cameraSnapshot,
        });
      }
    } else {
      // Demo mode - local state only
      addAnnotation({
        type: data.type,
        position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
        content: data.content,
        status: data.status,
        createdBy: currentUserId,
        createdByName: user?.name || user?.email || 'You',
        cameraSnapshot: data.cameraSnapshot,
      });
    }

    setIsSavingAnnotation(false);
  }, [scanId, currentUserId, addAnnotation]);

  // Handle annotation status change with Supabase persistence
  const handleAnnotationStatusChange = useCallback(async (annotationId: string, status: 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived') => {
    // Update local state immediately for responsiveness
    updateAnnotationStatus(annotationId, status);

    // Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await updateAnnotationService(annotationId, { status });
      } catch {
        // Error updating annotation status - already updated locally
      }
    }
  }, [updateAnnotationStatus]);

  // Handle annotation deletion with Supabase persistence
  const handleAnnotationDelete = useCallback(async (annotationId: string) => {
    // Clear selection so gizmo disappears immediately
    selectAnnotation(null);

    // Remove from local state immediately
    removeAnnotation(annotationId);

    // Delete from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await deleteAnnotationService(annotationId);
      } catch {
        // Error deleting annotation - already removed locally
      }
    }
  }, [removeAnnotation, selectAnnotation]);
  handleAnnotationDeleteRef.current = handleAnnotationDelete;

  // Handle measurement deletion with Supabase persistence
  const handleMeasurementDelete = useCallback(async (measurementId: string) => {
    // Stop any active drag on this measurement
    if (state.draggingMeasurementPoint?.measurementId === measurementId) {
      stopDraggingMeasurementPoint();
    }

    // Remove from local state immediately
    removeMeasurement(measurementId);

    // Delete from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await deleteMeasurementService(measurementId);
      } catch {
        // Error deleting measurement - already removed locally
      }
    }
  }, [removeMeasurement, state.draggingMeasurementPoint, stopDraggingMeasurementPoint]);
  handleMeasurementDeleteRef.current = handleMeasurementDelete;

  // Handle measurement label delete (segments or entire measurement)
  // Segment deletion behavior:
  // - 2-point line: deleting the only segment removes entire measurement
  // - First/last segment: truncates the measurement
  // - Middle segment: splits into two separate measurements
  //
  // IMPORTANT: Before split/truncate, we sync ViewerContext state with the renderer's
  // current world positions. This fixes the offset bug when the model has been transformed
  // (rotated/scaled) - the renderer stores points in LOCAL space which gets correctly
  // converted to WORLD space, ensuring splits use the correct coordinates.
  const handleLabelDelete = useCallback(async (label: MeasurementLabelData) => {
    // Clear hover state immediately
    setHoveredLabelId(null);

    // Clear label cache to force immediate re-render without stale labels
    prevLabelsRef.current = [];

    if (!label.measurementId) return;

    if (label.type === 'area' || label.type === 'distance') {
      // Area centroid or distance total label - delete entire measurement
      await handleMeasurementDelete(label.measurementId);
    } else if (label.type === 'segment' && label.segmentIndex !== undefined) {
      const sceneManager = sceneManagerRef.current;
      const measurement = state.measurements.find(m => m.id === label.measurementId);

      // Get CURRENT world positions from renderer (accounts for model transforms)
      // This syncs state with the renderer's accurate positions before the split
      if (sceneManager && measurement) {
        const currentWorldPoints = sceneManager.getMeasurementPointsInWorldSpace(label.measurementId);
        if (currentWorldPoints && currentWorldPoints.length >= 2) {
          // Sync state points with renderer's current world positions FIRST
          // This ensures removeSegmentFromMeasurement uses correct coordinates
          updateMeasurementPoints(label.measurementId, currentWorldPoints);
        }
      }

      // Segment label - handle based on action type
      const result = removeSegmentFromMeasurement(label.measurementId, label.segmentIndex);

      if (!isSupabaseConfigured()) return;

      try {
        switch (result.action) {
          case 'deleted':
            // Entire measurement was removed (2-point line)
            await deleteMeasurementService(label.measurementId);
            break;

          case 'truncated':
            // Measurement was truncated (first or last segment removed)
            if (result.originalMeasurement) {
              await updateMeasurementService(label.measurementId, {
                points_json: result.originalMeasurement.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
                value: result.originalMeasurement.value,
              });
            }
            break;

          case 'split':
            // Measurement was split into two (middle segment removed)
            // Update original measurement with first half
            if (result.originalMeasurement) {
              await updateMeasurementService(label.measurementId, {
                points_json: result.originalMeasurement.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
                value: result.originalMeasurement.value,
              });
            }
            // Create new measurement for second half
            if (result.newMeasurement && scanId) {
              await createMeasurementService({
                scan_id: scanId,
                type: result.newMeasurement.type,
                points_json: result.newMeasurement.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
                value: result.newMeasurement.value,
                unit: result.newMeasurement.unit,
                label: result.newMeasurement.label || null,
                created_by: result.newMeasurement.createdBy,
              });
            }
            break;
        }
      } catch {
        // Error persisting to Supabase - local state already updated
      }
    }
  }, [handleMeasurementDelete, removeSegmentFromMeasurement, scanId, state.measurements, updateMeasurementPoints]);

  // Handle annotation reply with Supabase persistence
  const handleAnnotationReply = useCallback(async (annotationId: string, content: string) => {
    // Add to local state immediately
    addAnnotationReply(annotationId, content, currentUserId);

    // Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await addAnnotationReplyService({
          annotation_id: annotationId,
          content,
          created_by: currentUserId,
        });
      } catch {
        // Error saving annotation reply - already added locally
      }
    }
  }, [addAnnotationReply, currentUserId]);

  // Handle share
  const handleShare = useCallback(() => {
    setShowSharePanel(true);
  }, []);

  // Handle annotation move (gizmo drag)
  const handleAnnotationMove = useCallback(async (annotationId: string, position: THREE.Vector3) => {
    // Update local state immediately for responsiveness
    updateAnnotationPosition(annotationId, position);

    // Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await updateAnnotationService(annotationId, {
          position_x: position.x,
          position_y: position.y,
          position_z: position.z,
        });
      } catch {
        // Position updated locally - will sync on reload
      }
    }
  }, [updateAnnotationPosition]);

  // Show loading state while fetching data
  if (isDataLoading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading viewer...</p>
        </div>
      </div>
    );
  }

  // Redirect if project or scan not found after loading
  if (!project || !scan) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      {/* 3D Viewer Container */}
      <div ref={viewerContainerRef} className="absolute inset-0">
        <Viewer3D
          className="w-full h-full"
          scanId={scanId}
          splatUrl={scan.modelUrl}
          onPointSelect={handlePointSelect}
          showGrid={state.showGrid}
          onSceneReady={handleSceneReady}
          initialTransform={initialTransform}
          transformMode={transformMode}
          onTransformChange={handleTransformChange}
          onResetView={(fn) => { resetViewFnRef.current = fn; }}
          onAnnotationHover={hoverAnnotation}
          onAnnotationSelect={selectAnnotation}
          hoveredAnnotationId={state.hoveredAnnotationId}
          selectedAnnotationId={state.selectedAnnotationId}
          onCameraReady={setCamera}
          measurements={state.measurements}
          draggingMeasurementPoint={state.draggingMeasurementPoint}
          onMeasurementPointDragStart={(measurementId, pointIndex) => {
            startDraggingMeasurementPoint(measurementId, pointIndex);
          }}
          onMeasurementPointMove={(measurementId, pointIndex, newPosition) => {
            updateMeasurementPoint(measurementId, pointIndex, newPosition);
          }}
          onMeasurementPointDragEnd={stopDraggingMeasurementPoint}
          onAnnotationMove={handleAnnotationMove}
          onSplatLoadStart={() => {
            setIsLoading(true);
            setLoadProgress(null);
            setLoadError(null);
          }}
          onSplatLoadProgress={(progress) => setLoadProgress(progress)}
          onSplatLoadComplete={() => setIsLoading(false)}
          onSplatLoadError={(err) => {
            setIsLoading(false);
            setLoadError({ message: err.message });
          }}
          onCameraAnimatorReady={(animator) => {
            cameraAnimatorRef.current = animator;
          }}
          onRendererReady={setRenderer}
          onControlsReady={setControls}
          magnifierCanvas={magnifierCanvasRef.current}
          onMousePositionUpdate={(x, y, visible) => setMagnifierPos({ x, y, visible })}
          splatViewMode={state.splatViewMode}
          onMeasurementCursorUpdate={setMeasurementCursorPosition}
          pendingMeasurementPointCount={state.pendingMeasurement?.points.length ?? 0}
          onOrbitStart={() => setIsOrbiting(true)}
          onOrbitEnd={() => setIsOrbiting(false)}
        />

        {/* HTML Annotation Icon Overlay - hidden in point cloud mode */}
        {state.showAnnotations && state.splatViewMode !== 'pointcloud' && <AnnotationIconOverlay
          annotations={state.annotations.map(a => ({
            data: {
              id: a.id,
              scanId: scanId || '',
              type: a.type,
              status: a.status,
              content: a.content,
              createdBy: a.createdBy,
              createdAt: a.createdAt,
              replyCount: a.replies?.length || 0,
            } as AnnotationData,
            position: normalizeVector3(a.position),
          }))}
          camera={camera}
          containerRef={viewerContainerRef}
          hoveredId={state.hoveredAnnotationId}
          selectedId={state.selectedAnnotationId}
          onAnnotationClick={(ann) => {
            selectAnnotation(ann.id);
            openCollaborationPanel('annotations');
          }}
          onAnnotationHover={(ann) => hoverAnnotation(ann?.id ?? null)}
          getWorldPosition={(id) => sceneManagerRef.current?.getAnnotationWorldPosition(id) ?? null}
        />}

        {/* HTML Measurement Point Overlay - hidden in point cloud mode */}
        {state.showMeasurements && state.splatViewMode !== 'pointcloud' && <MeasurementIconOverlay
          points={[
            // Finalized measurement points
            ...state.measurements.flatMap(m =>
              m.points.map((p, i) => ({
                measurementId: m.id,
                pointIndex: i,
                position: normalizeVector3(p),
                type: m.type as 'distance' | 'area' | 'angle',
              }) as MeasurementPointData)
            ),
            // Pending measurement points (during placement)
            ...(state.pendingMeasurement?.points.map((p, i) => ({
              measurementId: 'pending',
              pointIndex: i,
              position: normalizeVector3(p),
              type: state.pendingMeasurement?.type as 'distance' | 'area' | 'angle',
              isPending: true, // Flag for styling
              // First point gets snap affordance when cursor is nearby
              isSnapTarget: i === 0 && isNearFirstPoint,
            })) ?? []),
          ]}
          camera={camera}
          containerRef={viewerContainerRef}
          hoveredPointId={state.hoveredMeasurementId ? `${state.hoveredMeasurementId}-0` : null}
          selectedPointId={state.selectedMeasurementId
            ? `${state.selectedMeasurementId}-0`
            : null
          }
          draggingPointId={state.draggingMeasurementPoint
            ? `${state.draggingMeasurementPoint.measurementId}-${state.draggingMeasurementPoint.pointIndex}`
            : null
          }
          hiddenPointId={state.draggingMeasurementPoint
            ? `${state.draggingMeasurementPoint.measurementId}-${state.draggingMeasurementPoint.pointIndex}`
            : null
          }
          onPointDragStart={(measurementId, pointIndex) => {
            // Start dragging the measurement point
            startDraggingMeasurementPoint(measurementId, pointIndex);
            // Open collaboration panel to measurements tab
            openCollaborationPanel('measurements');
          }}
          onPointHover={(point) => hoverMeasurement(point?.measurementId ?? null)}
          getWorldPosition={(measurementId, pointIndex) =>
            sceneManagerRef.current?.getMeasurementPointWorldPosition(measurementId, pointIndex) ?? null
          }
        />}

        {/* HTML Measurement Label Overlay - hidden in point cloud mode */}
        {state.showMeasurements && state.splatViewMode !== 'pointcloud' && (
          <MeasurementLabelOverlay
            labels={measurementLabels}
            camera={camera}
            containerRef={viewerContainerRef}
            hoveredLabelId={hoveredLabelId}
            onLabelHover={setHoveredLabelId}
            onLabelDelete={handleLabelDelete}
          />
        )}

        {/* Magnifier Loupe for precise point placement */}
        <MagnifierLoupe
          ref={magnifierCanvasRef}
          visible={magnifierPos.visible}
          mouseX={magnifierPos.x}
          mouseY={magnifierPos.y}
          loupeSize={100}
        />
      </div>

      {/* Loading Overlay */}
      <ViewerLoadingOverlay
        isLoading={isLoading}
        progress={loadProgress}
        error={loadError}
      />

      {/* Compression Progress Overlay - shown when scan is being compressed */}
      {scanStatusInfo && scanStatusInfo.status === 'processing' && (
        <div className="absolute bottom-6 left-6 z-30 w-80">
          <CompressionProgress
            statusInfo={scanStatusInfo}
            fileName={scan?.name}
          />
        </div>
      )}

      {/* 3D Axis Navigator - top-right corner */}
      <div className="absolute top-20 right-6 z-20">
        <AxisNavigator
          camera={camera}
          renderer={renderer}
          controls={controls}
          size={140}
          onViewChange={handleViewSnap}
        />
      </div>

      {/* Header */}
      <ViewerHeader
        project={project}
        scan={scan}
        scans={projectScans}
        userRole={userRole}
        onShare={handleShare}
      />

      {/* Collaboration Panel - Always visible, collapsed shows icon strip only */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
        <CollaborationPanel
          isExpanded={state.isCollaborationPanelOpen}
          onExpandedChange={(expanded) => {
            if (expanded) {
              openCollaborationPanel();
            } else {
              closeCollaborationPanel();
            }
          }}
          activeTab={state.activeCollaborationTab}
          onTabChange={setActiveCollaborationTab}
          activeTool={state.activeTool}
          onToolChange={(tool) => {
            setActiveTool(tool);
            // Clear transform mode when activating a tool
            if (tool) {
              setTransformMode(null);
            }
          }}
          annotations={state.annotations}
          selectedAnnotationId={state.selectedAnnotationId}
          currentUserId={currentUserId}
          canEditAnnotations={permissions.canAnnotate}
          onSelectAnnotation={(ann) => selectAnnotation(ann.id)}
          onAnnotationStatusChange={handleAnnotationStatusChange}
          onDeleteAnnotation={handleAnnotationDelete}
          onAddAnnotationReply={handleAnnotationReply}
          onAddAnnotation={() => {
            setActiveTool('comment');
            closeCollaborationPanel();
          }}
          measurements={state.measurements}
          selectedMeasurementId={state.selectedMeasurementId}
          permissions={permissions}
          onSelectMeasurement={selectMeasurement}
          onDeleteMeasurement={handleMeasurementDelete}
          onStartMeasurement={(type: MeasurementToolType) => {
            setActiveTool(type);
            setTransformMode(null);
          }}
          savedViews={state.savedViews}
          activeSavedViewId={state.activeSavedViewId}
          onSelectView={handleSelectView}
          onDeleteView={handleDeleteView}
          onSaveCurrentView={handleSaveCurrentView}
        />
      </div>

      {/* Toolbar - Navigation & Manipulation only */}
      <ViewerToolbar
        activeTool={state.activeTool}
        onToolChange={setActiveTool}
        permissions={permissions}
        showGrid={state.showGrid}
        onToggleGrid={toggleGrid}
        viewMode={state.viewMode}
        onViewModeChange={setViewMode}
        onResetView={handleResetView}
        onShare={handleShare}
        transformMode={transformMode}
        onTransformModeChange={handleTransformModeChange}
        onResetTransform={handleResetTransform}
        onSaveTransform={handleSaveTransform}
        hasUnsavedTransform={hasUnsavedTransform}
        showAnnotations={state.showAnnotations}
        onToggleAnnotations={toggleAnnotations}
        showMeasurements={state.showMeasurements}
        onToggleMeasurements={toggleMeasurements}
        splatViewMode={state.splatViewMode}
        onSplatViewModeChange={setSplatViewMode}
      />

      {/* Share Panel */}
      <ViewerSharePanel
        isOpen={showSharePanel}
        onClose={() => setShowSharePanel(false)}
        permissions={permissions}
        projectId={projectId || ''}
        scanId={scanId || ''}
      />


      {/* Annotation Modal for creating new annotations */}
      <AnnotationModal
        isOpen={state.isAnnotationModalOpen}
        onClose={closeAnnotationModal}
        position={state.pendingAnnotationPosition}
        scanId={scanId || ''}
        userId={currentUserId}
        type={state.activeTool === 'pin' ? 'pin' : 'comment'}
        onSubmit={handleAnnotationSubmit}
      />

      {/* Save View Dialog for naming new saved views */}
      <SaveViewDialog
        isOpen={isSaveViewDialogOpen}
        onClose={() => {
          setIsSaveViewDialogOpen(false);
          setPendingCameraState(null);
        }}
        onSave={handleSaveViewSubmit}
        defaultName={`View ${state.savedViews.length + 1}`}
      />
    </div>
  );
};

// Main component with provider wrapper
const ViewerPage = () => {
  const { isLoggedIn } = useAuth();

  // Logged-in users get editor permissions (can annotate)
  // Non-logged-in users are read-only viewers
  // TODO: Fetch actual role from project membership when infrastructure is ready
  const userRole: UserRole = isLoggedIn ? 'editor' : 'viewer';

  return (
    <ViewerProvider userRole={userRole}>
      <ViewerContent />
    </ViewerProvider>
  );
};

export default ViewerPage;
