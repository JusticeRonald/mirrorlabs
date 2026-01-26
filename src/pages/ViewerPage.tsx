import { useParams, Navigate } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ViewerProvider, useViewer } from '@/contexts/ViewerContext';
import { useAuth } from '@/contexts/AuthContext';
import Viewer3D from '@/components/viewer/Viewer3D';
import ViewerToolbar from '@/components/viewer/ViewerToolbar';
import ViewerSidebar from '@/components/viewer/ViewerSidebar';
import ViewerHeader from '@/components/viewer/ViewerHeader';
import ViewerSharePanel from '@/components/viewer/ViewerSharePanel';
import ViewerLoadingOverlay from '@/components/viewer/ViewerLoadingOverlay';
import AnnotationPanel from '@/components/viewer/AnnotationPanel';
import AnnotationModal from '@/components/viewer/AnnotationModal';
import { AnnotationIconOverlay } from '@/components/viewer/AnnotationMarker';
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
  } = useViewer();

  // Get current user ID (use 'demo-user' for demo mode)
  const currentUserId = user?.id || 'demo-user';

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

  // Camera state for HTML annotation overlay
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Annotation persistence state
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);

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
  const handlePointSelect = useCallback((point: THREE.Vector3) => {
    if (state.activeTool === 'distance' || state.activeTool === 'area' || state.activeTool === 'angle') {
      // In a real app, this would track multiple points for measurement
      // For now, just add a simple distance measurement
      addMeasurement({
        type: state.activeTool as 'distance' | 'area' | 'angle',
        points: [point],
        value: Math.random() * 10 + 1, // Placeholder value
        unit: 'm',
        createdBy: 'current-user',
      });
    } else if (state.activeTool === 'pin' || state.activeTool === 'comment') {
      // Open annotation modal for annotation creation
      openAnnotationModal(point);
    }
  }, [state.activeTool, addMeasurement, openAnnotationModal]);

  // Handle scene ready
  const handleSceneReady = useCallback((manager: SceneManager) => {
    setSceneManager(manager);
    sceneManagerRef.current = manager;
  }, []);

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
          break;
        case 'r':
          // R for rotate - Blender convention
          setTransformMode(transformMode === 'rotate' ? null : 'rotate');
          break;
        case 's':
          // S for scale - Blender convention
          setTransformMode(transformMode === 'scale' ? null : 'scale');
          break;
        case 'c':
          // C for comment tool
          setActiveTool(state.activeTool === 'comment' ? null : 'comment');
          break;
        case 'v':
          // V for reset view
          handleResetView();
          break;
        case 't':
          // T for toggle grid
          toggleGrid();
          break;
        case 'escape':
          // Escape to hide gizmo
          setTransformMode(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transformMode, toggleGrid, handleResetView, state.activeTool, state.isAnnotationModalOpen, setActiveTool]);

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
            position: a.position instanceof THREE.Vector3
              ? a.position
              : new THREE.Vector3(a.position.x, a.position.y, a.position.z),
          }))}
          camera={camera}
          containerRef={viewerContainerRef}
          hoveredId={state.hoveredAnnotationId}
          selectedId={state.selectedAnnotationId}
          onAnnotationClick={(ann) => selectAnnotation(ann.id)}
          onAnnotationHover={(ann) => hoverAnnotation(ann?.id ?? null)}
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

      {/* Sidebar */}
      <ViewerSidebar
        measurements={state.measurements}
        annotations={state.annotations}
        permissions={permissions}
        onDeleteMeasurement={removeMeasurement}
        onDeleteAnnotation={handleAnnotationDelete}
      />

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
          setActiveTool('comment');
          openAnnotationPanel();
        }}
        annotationCount={state.annotations.length}
      />

      {/* Share Panel */}
      <ViewerSharePanel
        isOpen={showSharePanel}
        onClose={() => setShowSharePanel(false)}
        permissions={permissions}
        projectId={projectId || ''}
        scanId={scanId || ''}
      />

      {/* Annotation Panel */}
      {state.isAnnotationPanelOpen && (
        <div className="absolute right-0 top-16 bottom-0 w-80 z-20">
          <AnnotationPanel
            annotation={
              state.selectedAnnotationId
                ? state.annotations.find(a => a.id === state.selectedAnnotationId) ?? null
                : null
            }
            annotations={state.annotations}
            currentUserId={currentUserId}
            canEdit={permissions.canAnnotate}
            onClose={closeAnnotationPanel}
            onSelectAnnotation={(ann) => selectAnnotation(ann.id)}
            onStatusChange={handleAnnotationStatusChange}
            onDelete={handleAnnotationDelete}
            onAddReply={handleAnnotationReply}
            mode={state.selectedAnnotationId ? 'detail' : 'list'}
            onAddAnnotation={() => {
              setActiveTool('comment');
              closeAnnotationPanel();
            }}
          />
        </div>
      )}

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
