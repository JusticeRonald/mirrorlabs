import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as THREE from 'three';
import {
  ViewerState,
  Measurement,
  Annotation,
  ViewMode,
  SavedView,
  CameraState,
  defaultViewerState,
  SplatLoadProgress,
  SplatSceneMetadata,
  SplatLoadError,
  AnnotationStatus,
  MarkupToolType,
} from '@/types/viewer';
import { UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types/user';

interface ViewerContextType {
  // State
  state: ViewerState;
  permissions: RolePermissions;
  userRole: UserRole;

  // Actions
  setActiveTool: (tool: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleGrid: () => void;
  toggleMeasurements: () => void;
  toggleAnnotations: () => void;
  toggleSavedViews: () => void;

  // Measurements
  addMeasurement: (measurement: Omit<Measurement, 'id' | 'createdAt'>) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;

  // Annotations
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  addAnnotationReply: (annotationId: string, content: string, createdBy: string) => void;
  updateAnnotationStatus: (annotationId: string, status: AnnotationStatus) => void;
  clearAnnotations: () => void;
  loadAnnotations: (annotations: Annotation[]) => void;

  // Annotation interaction
  selectAnnotation: (id: string | null) => void;
  hoverAnnotation: (id: string | null) => void;
  openAnnotationPanel: () => void;
  closeAnnotationPanel: () => void;
  openAnnotationModal: (position: THREE.Vector3) => void;
  closeAnnotationModal: () => void;

  // Markup/Drawing
  setActiveMarkupTool: (tool: MarkupToolType) => void;
  setDrawingMode: (enabled: boolean) => void;

  // Saved Views
  addSavedView: (view: Omit<SavedView, 'id' | 'createdAt' | 'sortOrder'>) => void;
  updateSavedView: (id: string, updates: Partial<SavedView>) => void;
  removeSavedView: (id: string) => void;
  reorderSavedViews: (viewIds: string[]) => void;
  setActiveSavedView: (id: string | null) => void;
  loadSavedViews: (views: SavedView[]) => void;

  // Selection
  selectObject: (id: string | null) => void;

  // Splat Loading
  setSplatLoading: (loading: boolean) => void;
  setSplatProgress: (progress: SplatLoadProgress | null) => void;
  setSplatError: (error: SplatLoadError | null) => void;
  setSplatMetadata: (metadata: SplatSceneMetadata | null) => void;
  clearSplatScene: () => void;
}

const ViewerContext = createContext<ViewerContextType | null>(null);

interface ViewerProviderProps {
  children: ReactNode;
  userRole?: UserRole;
}

export const ViewerProvider = ({ children, userRole = 'viewer' }: ViewerProviderProps) => {
  const [state, setState] = useState<ViewerState>(defaultViewerState);
  const permissions = ROLE_PERMISSIONS[userRole];

  // Tool and view state
  const setActiveTool = useCallback((tool: string | null) => {
    setState(prev => ({ ...prev, activeTool: tool }));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const toggleGrid = useCallback(() => {
    setState(prev => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const toggleMeasurements = useCallback(() => {
    setState(prev => ({ ...prev, showMeasurements: !prev.showMeasurements }));
  }, []);

  const toggleAnnotations = useCallback(() => {
    setState(prev => ({ ...prev, showAnnotations: !prev.showAnnotations }));
  }, []);

  const toggleSavedViews = useCallback(() => {
    setState(prev => ({ ...prev, showSavedViews: !prev.showSavedViews }));
  }, []);

  // Measurement actions
  const addMeasurement = useCallback((measurement: Omit<Measurement, 'id' | 'createdAt'>) => {
    const newMeasurement: Measurement = {
      ...measurement,
      id: `measurement-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      measurements: [...prev.measurements, newMeasurement],
    }));
  }, []);

  const removeMeasurement = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      measurements: prev.measurements.filter(m => m.id !== id),
    }));
  }, []);

  const clearMeasurements = useCallback(() => {
    setState(prev => ({ ...prev, measurements: [] }));
  }, []);

  // Annotation actions
  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `annotation-${Date.now()}`,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    setState(prev => ({
      ...prev,
      annotations: [...prev.annotations, newAnnotation],
      // Close modal and clear pending position after adding
      isAnnotationModalOpen: false,
      pendingAnnotationPosition: null,
    }));
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.filter(a => a.id !== id),
      // Clear selection if removed
      selectedAnnotationId: prev.selectedAnnotationId === id ? null : prev.selectedAnnotationId,
    }));
  }, []);

  const addAnnotationReply = useCallback((annotationId: string, content: string, createdBy: string) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.map(a => {
        if (a.id === annotationId) {
          return {
            ...a,
            replies: [
              ...(a.replies || []),
              {
                id: `reply-${Date.now()}`,
                content,
                createdBy,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }
        return a;
      }),
    }));
  }, []);

  const updateAnnotationStatus = useCallback((annotationId: string, status: AnnotationStatus) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.map(a =>
        a.id === annotationId ? { ...a, status } : a
      ),
    }));
  }, []);

  const clearAnnotations = useCallback(() => {
    setState(prev => ({
      ...prev,
      annotations: [],
      selectedAnnotationId: null,
      hoveredAnnotationId: null,
    }));
  }, []);

  const loadAnnotations = useCallback((annotations: Annotation[]) => {
    setState(prev => ({ ...prev, annotations }));
  }, []);

  // Annotation interaction
  const selectAnnotation = useCallback((id: string | null) => {
    setState(prev => ({
      ...prev,
      selectedAnnotationId: id,
      // Open panel when selecting an annotation
      isAnnotationPanelOpen: id !== null ? true : prev.isAnnotationPanelOpen,
    }));
  }, []);

  const hoverAnnotation = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, hoveredAnnotationId: id }));
  }, []);

  const openAnnotationPanel = useCallback(() => {
    setState(prev => ({ ...prev, isAnnotationPanelOpen: true }));
  }, []);

  const closeAnnotationPanel = useCallback(() => {
    setState(prev => ({ ...prev, isAnnotationPanelOpen: false }));
  }, []);

  const openAnnotationModal = useCallback((position: THREE.Vector3) => {
    setState(prev => ({
      ...prev,
      isAnnotationModalOpen: true,
      pendingAnnotationPosition: position,
    }));
  }, []);

  const closeAnnotationModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAnnotationModalOpen: false,
      pendingAnnotationPosition: null,
    }));
  }, []);

  // Markup/Drawing
  const setActiveMarkupTool = useCallback((tool: MarkupToolType) => {
    setState(prev => ({
      ...prev,
      activeMarkupTool: tool,
      isDrawingMode: tool !== null,
    }));
  }, []);

  const setDrawingMode = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      isDrawingMode: enabled,
      activeMarkupTool: enabled ? prev.activeMarkupTool : null,
    }));
  }, []);

  // Saved View actions
  const addSavedView = useCallback((view: Omit<SavedView, 'id' | 'createdAt' | 'sortOrder'>) => {
    const newView: SavedView = {
      ...view,
      id: `view-${Date.now()}`,
      createdAt: new Date().toISOString(),
      sortOrder: 0, // Will be recalculated
    };
    setState(prev => {
      const newViews = [...prev.savedViews, newView];
      // Recalculate sort orders
      return {
        ...prev,
        savedViews: newViews.map((v, i) => ({ ...v, sortOrder: i })),
      };
    });
  }, []);

  const updateSavedView = useCallback((id: string, updates: Partial<SavedView>) => {
    setState(prev => ({
      ...prev,
      savedViews: prev.savedViews.map(v =>
        v.id === id ? { ...v, ...updates } : v
      ),
    }));
  }, []);

  const removeSavedView = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      savedViews: prev.savedViews.filter(v => v.id !== id),
      activeSavedViewId: prev.activeSavedViewId === id ? null : prev.activeSavedViewId,
    }));
  }, []);

  const reorderSavedViews = useCallback((viewIds: string[]) => {
    setState(prev => {
      const viewMap = new Map(prev.savedViews.map(v => [v.id, v]));
      const reordered = viewIds
        .map((id, index) => {
          const view = viewMap.get(id);
          return view ? { ...view, sortOrder: index } : null;
        })
        .filter((v): v is SavedView => v !== null);
      return { ...prev, savedViews: reordered };
    });
  }, []);

  const setActiveSavedView = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, activeSavedViewId: id }));
  }, []);

  const loadSavedViews = useCallback((views: SavedView[]) => {
    setState(prev => ({ ...prev, savedViews: views }));
  }, []);

  // Selection
  const selectObject = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedObjectId: id }));
  }, []);

  // Splat Loading
  const setSplatLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      splatLoadingState: loading ? 'loading' : (prev.splatMetadata ? 'loaded' : 'idle'),
      splatLoadError: loading ? null : prev.splatLoadError,
    }));
  }, []);

  const setSplatProgress = useCallback((progress: SplatLoadProgress | null) => {
    setState(prev => ({ ...prev, splatLoadProgress: progress }));
  }, []);

  const setSplatError = useCallback((error: SplatLoadError | null) => {
    setState(prev => ({
      ...prev,
      splatLoadingState: error ? 'error' : prev.splatLoadingState,
      splatLoadError: error,
      splatLoadProgress: null,
    }));
  }, []);

  const setSplatMetadata = useCallback((metadata: SplatSceneMetadata | null) => {
    setState(prev => ({
      ...prev,
      splatLoadingState: metadata ? 'loaded' : 'idle',
      splatMetadata: metadata,
      splatLoadProgress: null,
    }));
  }, []);

  const clearSplatScene = useCallback(() => {
    setState(prev => ({
      ...prev,
      splatLoadingState: 'idle',
      splatLoadProgress: null,
      splatLoadError: null,
      splatMetadata: null,
    }));
  }, []);

  const value: ViewerContextType = {
    state,
    permissions,
    userRole,
    setActiveTool,
    setViewMode,
    toggleGrid,
    toggleMeasurements,
    toggleAnnotations,
    toggleSavedViews,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
    addAnnotation,
    removeAnnotation,
    addAnnotationReply,
    updateAnnotationStatus,
    clearAnnotations,
    loadAnnotations,
    selectAnnotation,
    hoverAnnotation,
    openAnnotationPanel,
    closeAnnotationPanel,
    openAnnotationModal,
    closeAnnotationModal,
    setActiveMarkupTool,
    setDrawingMode,
    addSavedView,
    updateSavedView,
    removeSavedView,
    reorderSavedViews,
    setActiveSavedView,
    loadSavedViews,
    selectObject,
    setSplatLoading,
    setSplatProgress,
    setSplatError,
    setSplatMetadata,
    clearSplatScene,
  };

  return (
    <ViewerContext.Provider value={value}>
      {children}
    </ViewerContext.Provider>
  );
};

export const useViewer = () => {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error('useViewer must be used within a ViewerProvider');
  }
  return context;
};

export default ViewerContext;
