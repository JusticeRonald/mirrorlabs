import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as THREE from 'three';
import { ViewerState, Measurement, Annotation, ViewMode, defaultViewerState } from '@/types/viewer';
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

  // Measurements
  addMeasurement: (measurement: Omit<Measurement, 'id' | 'createdAt'>) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;

  // Annotations
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  addAnnotationReply: (annotationId: string, content: string, createdBy: string) => void;
  clearAnnotations: () => void;

  // Selection
  selectObject: (id: string | null) => void;
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
    }));
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.filter(a => a.id !== id),
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

  const clearAnnotations = useCallback(() => {
    setState(prev => ({ ...prev, annotations: [] }));
  }, []);

  // Selection
  const selectObject = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedObjectId: id }));
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
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
    addAnnotation,
    removeAnnotation,
    addAnnotationReply,
    clearAnnotations,
    selectObject,
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
