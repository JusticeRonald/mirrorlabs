import { useParams, Navigate } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
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
import { AxisNavigator, type ViewDirection } from '@/components/viewer/AxisNavigator';
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
  getScanWaypoints,
  createWaypoint as createWaypointService,
  deleteWaypoint as deleteWaypointService,
} from '@/lib/supabase/services/annotations';
import { CameraAnimator } from '@/lib/viewer/CameraAnimator';
import { SaveViewDialog } from '@/components/viewer/SaveViewDialog';
import type { CameraState, SavedView } from '@/types/viewer';
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
  const sceneManagerRef = useRef<SceneManager | null>(null);
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
            // Validate all measurement points before persisting
            const allPointsValid = measurement.points.every(p =>
              isValidPosition({ x: p.x, y: p.y, z: p.z })
            );
            if (!allPointsValid) {
              // Invalid coordinates — saved locally only
            } else {
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
  }, [state.annotations, scanId, sceneManager]);

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
  }, [state.measurements, sceneManager]);

  // Sync measurement 3D visibility with state
  useEffect(() => {
    const renderer = sceneManagerRef.current?.getMeasurementRenderer();
    if (renderer) renderer.setVisible(state.showMeasurements);
  }, [state.showMeasurements]);

  // Transform mode change handler
  const handleTransformModeChange = useCallback((mode: TransformMode | null) => {
    setTransformMode(mode);
  }, []);

  // Transform change handler (called when gizmo is manipulated)
  const handleTransformChange = useCallback((transform: SplatTransform) => {
    setCurrentTransform(transform);
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
          // C for comment tool - also opens panel
          if (state.activeTool === 'comment') {
            setActiveTool(null);
            closeCollaborationPanel();
          } else {
            setActiveTool('comment');
            setTransformMode(null); // Hide gizmo for mutual exclusivity
            openCollaborationPanel('annotations');
          }
          clearMeasurementPointSelection(); // Clear point editing
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
          clearMeasurementPointSelection(); // Clear point editing
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
          // Escape to cancel pending measurement, hide gizmo, clear point selection, collapse panel, or clear annotation selection
          if (state.pendingMeasurement) {
            cancelMeasurement();
          } else if (state.selectedMeasurementPoint) {
            clearMeasurementPointSelection();
            closeCollaborationPanel();
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
  }, [transformMode, toggleGrid, toggleCleanView, handleResetView, handleResetTransform, handleSaveCurrentView, state.activeTool, state.isAnnotationModalOpen, state.pendingMeasurement, state.selectedMeasurementPoint, state.selectedAnnotationId, state.isCollaborationPanelOpen, setActiveTool, cancelMeasurement, clearMeasurementPointSelection, selectAnnotation, closeCollaborationPanel, openCollaborationPanel]);

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

  // Handle annotation move (click-to-relocate or gizmo drag)
  const handleAnnotationMove = useCallback((annotationId: string, position: THREE.Vector3) => {
    updateAnnotationPosition(annotationId, position);
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
        />

        {/* HTML Annotation Icon Overlay */}
        {state.showAnnotations && <AnnotationIconOverlay
          annotations={state.annotations.map(a => {
            // Use fallback position for initial render, getWorldPosition provides live updates
            const position = a.position instanceof THREE.Vector3
              ? a.position
              : new THREE.Vector3(a.position.x, a.position.y, a.position.z);
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
          getWorldPosition={(id) => sceneManagerRef.current?.getAnnotationWorldPosition(id) ?? null}
        />}

        {/* HTML Measurement Point Overlay */}
        {state.showMeasurements && <MeasurementIconOverlay
          points={state.measurements.flatMap(m =>
            m.points.map((p, i) => {
              // Use fallback position for initial render, getWorldPosition provides live updates
              const position = p instanceof THREE.Vector3 ? p : new THREE.Vector3(p.x, p.y, p.z);
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
          selectedPointId={state.selectedMeasurementPoint
            ? `${state.selectedMeasurementPoint.measurementId}-${state.selectedMeasurementPoint.pointIndex}`
            : null
          }
          editingPointId={state.selectedMeasurementPoint
            ? `${state.selectedMeasurementPoint.measurementId}-${state.selectedMeasurementPoint.pointIndex}`
            : null
          }
          onPointClick={(point) => {
            // Select the measurement point for editing (shows gizmo)
            // selectMeasurementPoint now clears activeTool + annotation selection internally
            selectMeasurementPoint(point.measurementId, point.pointIndex);
            // Open collaboration panel to measurements tab
            openCollaborationPanel('measurements');
          }}
          onPointHover={(point) => hoverMeasurement(point?.measurementId ?? null)}
          getWorldPosition={(measurementId, pointIndex) =>
            sceneManagerRef.current?.getMeasurementPointWorldPosition(measurementId, pointIndex) ?? null
          }
        />}
      </div>

      {/* Loading Overlay */}
      <ViewerLoadingOverlay
        isLoading={isLoading}
        progress={loadProgress}
        error={loadError}
      />

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
