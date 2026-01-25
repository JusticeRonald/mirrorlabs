import { useParams, Link, Navigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { ViewerProvider, useViewer } from '@/contexts/ViewerContext';
import { useAuth } from '@/contexts/AuthContext';
import Viewer3D from '@/components/viewer/Viewer3D';
import ViewerToolbar from '@/components/viewer/ViewerToolbar';
import ViewerSidebar from '@/components/viewer/ViewerSidebar';
import ViewerHeader from '@/components/viewer/ViewerHeader';
import ViewerSharePanel from '@/components/viewer/ViewerSharePanel';
import ViewerLoadingOverlay from '@/components/viewer/ViewerLoadingOverlay';
import { getProjectById, getScanById } from '@/data/mockProjects';
import { SceneManager } from '@/lib/viewer/SceneManager';
import { UserRole } from '@/types/user';
import type { SplatLoadProgress, SplatLoadError } from '@/types/viewer';

// Inner component that uses the ViewerContext
const ViewerContent = () => {
  const { projectId, scanId } = useParams<{ projectId: string; scanId: string }>();
  const {
    state,
    permissions,
    userRole,
    setActiveTool,
    setViewMode,
    toggleGrid,
    addMeasurement,
    removeMeasurement,
    removeAnnotation,
  } = useViewer();

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<SplatLoadProgress | null>(null);
  const [loadError, setLoadError] = useState<SplatLoadError | null>(null);

  // Get project and scan data
  const project = projectId ? getProjectById(projectId) : null;
  const scan = projectId && scanId ? getScanById(projectId, scanId) : null;

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
    }
  }, [state.activeTool, addMeasurement]);

  // Handle scene ready
  const handleSceneReady = useCallback((manager: SceneManager) => {
    setSceneManager(manager);
  }, []);

  // Reset view
  const handleResetView = useCallback(() => {
    // This would be handled by the Viewer3D component
  }, []);

  // Handle share
  const handleShare = useCallback(() => {
    setShowSharePanel(true);
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    setShowSharePanel(true);
  }, []);

  // Redirect if project or scan not found
  if (!project || !scan) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      {/* 3D Viewer */}
      <Viewer3D
        className="absolute inset-0"
        scanId={scanId}
        modelUrl={scan.modelUrl}
        splatUrl="/splats/demo.ply"
        onPointSelect={handlePointSelect}
        viewMode={state.viewMode}
        showGrid={state.showGrid}
        activeTool={state.activeTool}
        onSceneReady={handleSceneReady}
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
        userRole={userRole}
        onShare={handleShare}
      />

      {/* Sidebar */}
      <ViewerSidebar
        measurements={state.measurements}
        annotations={state.annotations}
        permissions={permissions}
        onDeleteMeasurement={removeMeasurement}
        onDeleteAnnotation={removeAnnotation}
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
      />

      {/* Share Panel */}
      <ViewerSharePanel
        isOpen={showSharePanel}
        onClose={() => setShowSharePanel(false)}
        permissions={permissions}
        projectId={projectId || ''}
        scanId={scanId || ''}
      />
    </div>
  );
};

// Main component with provider wrapper
const ViewerPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { isLoggedIn } = useAuth();
  const project = projectId ? getProjectById(projectId) : null;

  // Get user's role from the project
  // For non-logged-in users, always use 'viewer' role (read-only)
  const userRole: UserRole = isLoggedIn ? (project?.userRole || 'viewer') : 'viewer';

  return (
    <ViewerProvider userRole={userRole}>
      <ViewerContent />
    </ViewerProvider>
  );
};

export default ViewerPage;
