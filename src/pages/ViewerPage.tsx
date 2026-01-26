import { useParams, Navigate } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ViewerProvider, useViewer } from '@/contexts/ViewerContext';
import { useAuth } from '@/contexts/AuthContext';
import Viewer3D from '@/components/viewer/Viewer3D';
import ViewerToolbar from '@/components/viewer/ViewerToolbar';
import ViewerHeader from '@/components/viewer/ViewerHeader';
import { CollaborationPanel, type CollaborationTab } from '@/components/viewer/CollaborationPanel';
import ViewerSharePanel from '@/components/viewer/ViewerSharePanel';
import ViewerLoadingOverlay from '@/components/viewer/ViewerLoadingOverlay';
import AnnotationModal from '@/components/viewer/AnnotationModal';
import { AnnotationIconOverlay } from '@/components/viewer/AnnotationMarker';
import { MeasurementIconOverlay, type MeasurementPointData } from '@/components/viewer/MeasurementMarker';
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
  deleteMeasurement as deleteMeasurementService,
} from '@/lib/supabase/services/annotations';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useAnnotationSubscription } from '@/hooks/useAnnotationSubscription';
import type { Annotation as DbAnnotation, AnnotationReply as DbAnnotationReply } from '@/lib/supabase/database.types';
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
    cancelMeasurement,
    finalizeMeasurement,
    selectMeasurement,
    hoverMeasurement,
    selectMeasurementPoint,
    clearMeasurementPointSelection,
    updateMeasurementPoint,
    addAnnotation,
    removeAnnotation,
    updateAnnotationStatus,
    addAnnotationReply,
    selectAnnotation,
    hoverAnnotation,
    openAnnotationPanel,
    closeAnnotationPanel,
    openAnnotationModal,
    closeAnnotationModal,
    loadAnnotations,
    openCollaborationPanel,
    closeCollaborationPanel,
    setActiveCollaborationTab,
  } = useViewer();

  // Get current user ID (generate unique session ID for demo mode to isolate demo users)
  const [demoSessionId] = useState(() => `demo-${crypto.randomUUID().slice(0, 8)}`);
  const currentUserId = user?.id || demoSessionId;

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<SplatLoadProgress | null>(null);
  const [loadError, setLoadError] = useState<SplatLoadError | null>(null);

  // Async state for project and scan data
  const [project, setProject] = useState<ViewerProject | null>(null);
  const [scan, setScan] = useState<ViewerScan | null>(null);
  const [projectScans, setProjectScans] = useState<ViewerScanInfo[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Transform state
  const [transformMode, setTransformMode] = useState<TransformMode | null>('rotate');
  const [initialTransform, setInitialTransform] = useState<SplatTransform | undefined>(undefined);
  const [currentTransform, setCurrentTransform] = useState<SplatTransform | null>(null);
  const [savedTransform, setSavedTransform] = useState<SplatTransform | null>(null);
  const [isSavingTransform, setIsSavingTransform] = useState(false);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const resetViewFnRef = useRef<(() => void) | null>(null);

  // Refs for delete handlers (to avoid TDZ in keyboard handler useEffect)
  const handleMeasurementDeleteRef = useRef<((id: string) => void) | null>(null);
  const handleAnnotationDeleteRef = useRef<((id: string) => void) | null>(null);

  // Camera state for HTML annotation overlay
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Annotation persistence state
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);

  // Measurement point drag state (for direct drag with surface snap)
  const [draggingMeasurementPoint, setDraggingMeasurementPoint] = useState<{
    measurementId: string;
    pointIndex: number;
  } | null>(null);

  // Annotation drag state (for direct drag with surface snap)
  const [draggingAnnotation, setDraggingAnnotation] = useState<string | null>(null);

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
  const handlePointSelect = useCallback(async (point: THREE.Vector3) => {
    if (state.activeTool === 'distance') {
      // Distance measurement: 2 points required
      if (!state.pendingMeasurement) {
        // Start a new distance measurement
        startMeasurement('distance');
        addMeasurementPoint(point);
      } else if (state.pendingMeasurement.points.length === 1) {
        // Second point: finalize the measurement
        addMeasurementPoint(point);
        // Use setTimeout to ensure state update completes before finalizing
        setTimeout(async () => {
          const measurement = finalizeMeasurement(currentUserId);
          // Persist to Supabase if configured
          if (measurement && scanId && isSupabaseConfigured()) {
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
          }
        }, 0);
      }
    } else if (state.activeTool === 'area') {
      // Area measurement: 3+ points required, double-click to close
      if (!state.pendingMeasurement) {
        startMeasurement('area');
        addMeasurementPoint(point);
      } else {
        addMeasurementPoint(point);
      }
    } else if (state.activeTool === 'pin' || state.activeTool === 'comment') {
      // Open annotation modal for annotation creation
      openAnnotationModal(point);
    }
  }, [state.activeTool, state.pendingMeasurement, startMeasurement, addMeasurementPoint, finalizeMeasurement, currentUserId, scanId, openAnnotationModal]);

  // Handle scene ready
  const handleSceneReady = useCallback((manager: SceneManager) => {
    setSceneManager(manager);
    sceneManagerRef.current = manager;
  }, []);

  // Track rendered measurements to sync with scene
  const renderedMeasurementsRef = useRef<Set<string>>(new Set());

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
        const position = annotation.position instanceof THREE.Vector3
          ? annotation.position
          : new THREE.Vector3(annotation.position.x, annotation.position.y, annotation.position.z);

        manager.addAnnotation(annotation.id, position, {
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
  }, [state.annotations, scanId]);

  // Sync measurements with SceneManager
  useEffect(() => {
    if (!sceneManagerRef.current) return;

    const manager = sceneManagerRef.current;
    const renderedIds = renderedMeasurementsRef.current;
    const currentIds = new Set(state.measurements.map(m => m.id));

    // Add new measurements to scene
    for (const measurement of state.measurements) {
      if (!renderedIds.has(measurement.id)) {
        if (measurement.type === 'distance' && measurement.points.length === 2) {
          manager.addDistanceMeasurement(
            measurement.id,
            measurement.points[0],
            measurement.points[1],
            {
              id: measurement.id,
              unit: (measurement.unit as 'ft' | 'm' | 'in' | 'cm') || 'ft',
              label: measurement.label,
              createdBy: measurement.createdBy,
              createdAt: measurement.createdAt,
            }
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
        renderedIds.add(measurement.id);
      }
    }

    // Remove deleted measurements from scene
    for (const id of renderedIds) {
      if (!currentIds.has(id)) {
        manager.removeMeasurement(id);
        renderedIds.delete(id);
      }
    }
  }, [state.measurements]);

  // Transform mode change handler
  const handleTransformModeChange = useCallback((mode: TransformMode | null) => {
    setTransformMode(mode);
  }, []);

  // Transform change handler (called when gizmo is manipulated)
  const handleTransformChange = useCallback((transform: SplatTransform) => {
    setCurrentTransform(transform);
  }, []);

  // Reset transform to saved or default
  const handleResetTransform = useCallback(() => {
    const transform = savedTransform ?? DEFAULT_SPLAT_TRANSFORM;
    sceneManagerRef.current?.setSplatTransform(transform);
    setCurrentTransform(transform);
  }, [savedTransform]);

  // Save current transform to database
  const handleSaveTransform = useCallback(async () => {
    if (!scanId || !isSupabaseConfigured()) return;

    const transform = sceneManagerRef.current?.getSplatTransform();
    if (!transform) return;

    setIsSavingTransform(true);
    try {
      const { error } = await saveScanTransform(scanId, transform);
      if (!error) {
        setSavedTransform(transform);
      }
    } finally {
      setIsSavingTransform(false);
    }
  }, [scanId]);

  // Can save transform if user has measure permission (proxy for editor/owner)
  // and Supabase is configured (not in demo mode)
  const canSaveTransform = permissions.canMeasure && isSupabaseConfigured();

  // Reset view
  const handleResetView = useCallback(() => {
    resetViewFnRef.current?.();
  }, []);

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
          clearMeasurementPointSelection(); // Clear point editing
          break;
        case 'r':
          // R for rotate - Blender convention
          setTransformMode(transformMode === 'rotate' ? null : 'rotate');
          setActiveTool(null); // Clear tool for mutual exclusivity
          clearMeasurementPointSelection(); // Clear point editing
          break;
        case 's':
          // S for scale - Blender convention
          setTransformMode(transformMode === 'scale' ? null : 'scale');
          setActiveTool(null); // Clear tool for mutual exclusivity
          clearMeasurementPointSelection(); // Clear point editing
          break;
        case 'c':
          // C for comment tool
          setActiveTool(state.activeTool === 'comment' ? null : 'comment');
          setTransformMode(null); // Hide gizmo for mutual exclusivity
          clearMeasurementPointSelection(); // Clear point editing
          break;
        case 'd':
          // D for distance tool
          setActiveTool(state.activeTool === 'distance' ? null : 'distance');
          setTransformMode(null); // Hide gizmo for mutual exclusivity
          clearMeasurementPointSelection(); // Clear point editing
          break;
        case 'v':
          // V for reset view
          handleResetView();
          break;
        case 't':
          // T for toggle grid
          toggleGrid();
          break;
        case 'delete':
        case 'backspace':
          // Delete selected measurement or annotation (use refs to avoid TDZ)
          if (state.selectedMeasurementPoint) {
            handleMeasurementDeleteRef.current?.(state.selectedMeasurementPoint.measurementId);
            clearMeasurementPointSelection();
          } else if (state.selectedAnnotationId) {
            handleAnnotationDeleteRef.current?.(state.selectedAnnotationId);
            selectAnnotation(null);
          }
          break;
        case 'escape':
          // Escape to cancel pending measurement, hide gizmo, clear point selection, or clear annotation selection
          if (state.pendingMeasurement) {
            cancelMeasurement();
          } else if (state.selectedMeasurementPoint) {
            clearMeasurementPointSelection();
            closeCollaborationPanel();
          } else if (state.selectedAnnotationId) {
            selectAnnotation(null);
            closeCollaborationPanel();
          } else {
            setTransformMode(null);
            setActiveTool(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transformMode, toggleGrid, handleResetView, state.activeTool, state.isAnnotationModalOpen, state.pendingMeasurement, state.selectedMeasurementPoint, state.selectedAnnotationId, setActiveTool, cancelMeasurement, clearMeasurementPointSelection, selectAnnotation, closeCollaborationPanel]);

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
  }, [removeAnnotation]);
  handleAnnotationDeleteRef.current = handleAnnotationDelete;

  // Handle measurement deletion with Supabase persistence
  const handleMeasurementDelete = useCallback(async (measurementId: string) => {
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
  }, [removeMeasurement]);
  handleMeasurementDeleteRef.current = handleMeasurementDelete;

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

  // Handle export
  const handleExport = useCallback(() => {
    setShowSharePanel(true);
  }, []);

  // Handle measurement point drag start (for direct drag with surface snap)
  const handleMeasurementPointDragStart = useCallback((point: { measurementId: string; pointIndex: number }) => {
    setDraggingMeasurementPoint(point);
  }, []);

  // Handle measurement point drag end
  const handleMeasurementPointDragEnd = useCallback(() => {
    setDraggingMeasurementPoint(null);
  }, []);

  // Handle annotation drag start (for direct drag with surface snap)
  const handleAnnotationDragStart = useCallback((annotationId: string) => {
    setDraggingAnnotation(annotationId);
  }, []);

  // Handle annotation drag end
  const handleAnnotationDragEnd = useCallback(() => {
    setDraggingAnnotation(null);
  }, []);

  // Handle annotation move (update local state - persistence handled on drag end)
  const handleAnnotationMove = useCallback((annotationId: string, position: THREE.Vector3) => {
    // The scene manager updates the 3D marker position
    // The HTML overlay will update automatically on next render
    // We don't update the context state during drag to avoid re-renders
  }, []);

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
          modelUrl={scan.modelUrl}
          splatUrl={scan.modelUrl}
          onPointSelect={handlePointSelect}
          viewMode={state.viewMode}
          showGrid={state.showGrid}
          activeTool={state.activeTool}
          onSceneReady={handleSceneReady}
          initialTransform={initialTransform}
          transformMode={transformMode}
          onTransformChange={handleTransformChange}
          onResetView={(fn) => { resetViewFnRef.current = fn; }}
          onAnnotationHover={hoverAnnotation}
          onAnnotationSelect={selectAnnotation}
          hoveredAnnotationId={state.hoveredAnnotationId}
          selectedAnnotationId={state.selectedAnnotationId}
          annotations={state.annotations}
          onCameraReady={setCamera}
          measurements={state.measurements}
          selectedMeasurementPoint={state.selectedMeasurementPoint}
          onMeasurementPointMove={(measurementId, pointIndex, newPosition) => {
            updateMeasurementPoint(measurementId, pointIndex, newPosition);
          }}
          draggingMeasurementPoint={draggingMeasurementPoint}
          onMeasurementPointDragEnd={handleMeasurementPointDragEnd}
          draggingAnnotation={draggingAnnotation}
          onAnnotationDragEnd={handleAnnotationDragEnd}
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
        />

        {/* HTML Annotation Icon Overlay */}
        <AnnotationIconOverlay
          annotations={state.annotations.map(a => {
            // Get world position from SceneManager (handles transform parenting)
            const worldPos = sceneManager?.getAnnotationWorldPosition(a.id);
            const position = worldPos ?? (a.position instanceof THREE.Vector3
              ? a.position
              : new THREE.Vector3(a.position.x, a.position.y, a.position.z));
            return {
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
              position,
            };
          })}
          camera={camera}
          containerRef={viewerContainerRef}
          hoveredId={state.hoveredAnnotationId}
          selectedId={state.selectedAnnotationId}
          onAnnotationClick={(ann) => {
            selectAnnotation(ann.id);
            openCollaborationPanel('annotations');
          }}
          onAnnotationHover={(ann) => hoverAnnotation(ann?.id ?? null)}
          onAnnotationDragStart={(ann) => handleAnnotationDragStart(ann.id)}
        />

        {/* HTML Measurement Point Overlay */}
        <MeasurementIconOverlay
          points={state.measurements.flatMap(m =>
            m.points.map((p, i) => {
              // Get world position from SceneManager (handles transform parenting)
              const worldPos = sceneManager?.getMeasurementPointWorldPosition(m.id, i);
              const position = worldPos ?? (p instanceof THREE.Vector3 ? p : new THREE.Vector3(p.x, p.y, p.z));
              return {
                measurementId: m.id,
                pointIndex: i,
                position,
                type: m.type as 'distance' | 'area' | 'angle',
              } as MeasurementPointData;
            })
          )}
          camera={camera}
          containerRef={viewerContainerRef}
          hoveredPointId={state.hoveredMeasurementId ? `${state.hoveredMeasurementId}-0` : null}
          selectedPointId={state.selectedMeasurementId ? `${state.selectedMeasurementId}-0` : null}
          editingPointId={state.selectedMeasurementPoint
            ? `${state.selectedMeasurementPoint.measurementId}-${state.selectedMeasurementPoint.pointIndex}`
            : null
          }
          onPointClick={(point) => {
            // Select the measurement point for editing (shows gizmo)
            selectMeasurementPoint(point.measurementId, point.pointIndex);
            // Clear any active tool to avoid conflicts
            setActiveTool(null);
            // Open collaboration panel to measurements tab
            openCollaborationPanel('measurements');
          }}
          onPointHover={(point) => hoverMeasurement(point?.measurementId ?? null)}
          onPointDragStart={(point) => handleMeasurementPointDragStart({
            measurementId: point.measurementId,
            pointIndex: point.pointIndex,
          })}
        />
      </div>

      {/* Loading Overlay */}
      <ViewerLoadingOverlay
        isLoading={isLoading}
        progress={loadProgress}
        error={loadError}
      />

      {/* Header */}
      <ViewerHeader
        project={project}
        scan={scan}
        scans={projectScans}
        userRole={userRole}
        onShare={handleShare}
      />

      {/* Collaboration Panel (replaces ViewerSidebar and AnnotationPanel) */}
      {state.isCollaborationPanelOpen && (
        <div className="absolute right-0 top-16 bottom-0 w-96 z-20">
          <CollaborationPanel
            activeTab={state.activeCollaborationTab}
            onTabChange={setActiveCollaborationTab}
            onClose={closeCollaborationPanel}
            activeTool={state.activeTool}
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
          />
        </div>
      )}

      {/* Toolbar */}
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
        onExport={handleExport}
        transformMode={transformMode}
        onTransformModeChange={handleTransformModeChange}
        onResetTransform={handleResetTransform}
        onSaveTransform={handleSaveTransform}
        canSaveTransform={canSaveTransform}
        isSavingTransform={isSavingTransform}
        onOpenAnnotationPanel={() => {
          openCollaborationPanel('annotations');
        }}
        annotationCount={state.annotations.length}
        measurementCount={state.measurements.length}
        onOpenMeasurementPanel={() => {
          openCollaborationPanel('measurements');
        }}
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
