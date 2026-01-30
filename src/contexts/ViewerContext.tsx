import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import * as THREE from 'three';
import {
  ViewerState,
  Measurement,
  Annotation,
  ViewMode,
  SplatViewMode,
  SavedView,
  CameraState,
  defaultViewerState,
  SplatLoadProgress,
  SplatSceneMetadata,
  SplatLoadError,
  AnnotationStatus,
  MarkupToolType,
  MeasurementUnit,
  MeasurementType,
  CollaborationTab,
  DraggingMeasurementPoint,
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
  setSplatViewMode: (mode: SplatViewMode) => void;
  toggleGrid: () => void;
  toggleMeasurements: () => void;
  toggleAnnotations: () => void;
  toggleSavedViews: () => void;
  toggleCleanView: () => void;

  // Measurements
  addMeasurement: (measurement: Omit<Measurement, 'id' | 'createdAt'>) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  loadMeasurements: (measurements: Measurement[]) => void;

  // Measurement creation (multi-point collection)
  startMeasurement: (type: 'distance' | 'area') => void;
  addMeasurementPoint: (point: THREE.Vector3) => void;
  undoLastMeasurementPoint: () => void;
  cancelMeasurement: () => void;
  finalizeMeasurement: (createdBy: string) => Measurement | null;

  // Measurement interaction
  selectMeasurement: (id: string | null) => void;
  hoverMeasurement: (id: string | null) => void;
  setMeasurementUnit: (unit: MeasurementUnit) => void;

  // Measurement point dragging
  startDraggingMeasurementPoint: (measurementId: string, pointIndex: number) => void;
  stopDraggingMeasurementPoint: () => void;
  updateMeasurementPoint: (measurementId: string, pointIndex: number, newPosition: THREE.Vector3) => void;

  // Measurement points sync (for syncing state from renderer after transforms)
  updateMeasurementPoints: (measurementId: string, newPoints: THREE.Vector3[]) => void;

  // Measurement segment deletion (returns action taken and new measurement ID if split)
  removeSegmentFromMeasurement: (measurementId: string, segmentIndex: number) => {
    action: 'deleted' | 'truncated' | 'split';
    originalMeasurement?: Measurement;
    newMeasurement?: Measurement;
  };

  // Annotations
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  addAnnotationReply: (annotationId: string, content: string, createdBy: string) => void;
  updateAnnotationStatus: (annotationId: string, status: AnnotationStatus) => void;
  updateAnnotationPosition: (annotationId: string, position: THREE.Vector3) => void;
  clearAnnotations: () => void;
  loadAnnotations: (annotations: Annotation[]) => void;

  // Annotation interaction
  selectAnnotation: (id: string | null) => void;
  hoverAnnotation: (id: string | null) => void;
  openAnnotationPanel: () => void;
  closeAnnotationPanel: () => void;
  openAnnotationModal: (position: THREE.Vector3) => void;
  closeAnnotationModal: () => void;

  // Collaboration panel
  openCollaborationPanel: (tab?: CollaborationTab) => void;
  closeCollaborationPanel: () => void;
  setActiveCollaborationTab: (tab: CollaborationTab) => void;

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
    setState(prev => ({
      ...prev,
      activeTool: tool,
      selectedAnnotationId: null,
      draggingMeasurementPoint: null,
      selectedMeasurementId: null,
    }));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const setSplatViewMode = useCallback((mode: SplatViewMode) => {
    setState(prev => ({ ...prev, splatViewMode: mode }));
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

  const toggleCleanView = useCallback(() => {
    setState(prev => {
      if (prev.isCleanViewMode) {
        // Restore previous visibility state
        const restored = prev.cleanViewPreviousState || {
          showGrid: true, showMeasurements: true, showAnnotations: true,
        };
        return {
          ...prev,
          ...restored,
          isCleanViewMode: false,
          cleanViewPreviousState: null,
        };
      } else {
        // Save current state, then hide all
        return {
          ...prev,
          cleanViewPreviousState: {
            showGrid: prev.showGrid,
            showMeasurements: prev.showMeasurements,
            showAnnotations: prev.showAnnotations,
          },
          showGrid: false,
          showMeasurements: false,
          showAnnotations: false,
          isCleanViewMode: true,
        };
      }
    });
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
      // Clear selection if the deleted measurement was selected
      selectedMeasurementId: prev.selectedMeasurementId === id ? null : prev.selectedMeasurementId,
      draggingMeasurementPoint: prev.draggingMeasurementPoint?.measurementId === id ? null : prev.draggingMeasurementPoint,
    }));
  }, []);

  const clearMeasurements = useCallback(() => {
    setState(prev => ({ ...prev, measurements: [] }));
  }, []);

  const loadMeasurements = useCallback((measurements: Measurement[]) => {
    setState(prev => ({ ...prev, measurements }));
  }, []);

  // Start a new measurement (multi-point collection)
  const startMeasurement = useCallback((type: 'distance' | 'area') => {
    setState(prev => ({
      ...prev,
      pendingMeasurement: { type, points: [] },
    }));
  }, []);

  // Add a point to the current pending measurement
  const addMeasurementPoint = useCallback((point: THREE.Vector3) => {
    setState(prev => {
      if (!prev.pendingMeasurement) return prev;

      const newPoints = [...prev.pendingMeasurement.points, point.clone()];
      return {
        ...prev,
        pendingMeasurement: {
          ...prev.pendingMeasurement,
          points: newPoints,
        },
      };
    });
  }, []);

  // Undo the last point from the pending measurement
  const undoLastMeasurementPoint = useCallback(() => {
    setState(prev => {
      if (!prev.pendingMeasurement || prev.pendingMeasurement.points.length === 0) {
        return prev;
      }

      const newPoints = prev.pendingMeasurement.points.slice(0, -1);

      // If no points left, cancel the measurement
      if (newPoints.length === 0) {
        return {
          ...prev,
          pendingMeasurement: null,
        };
      }

      return {
        ...prev,
        pendingMeasurement: {
          ...prev.pendingMeasurement,
          points: newPoints,
        },
      };
    });
  }, []);

  // Cancel the current measurement
  const cancelMeasurement = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingMeasurement: null,
    }));
  }, []);

  // Finalize the measurement and add it to the list
  const finalizeMeasurement = useCallback((createdBy: string): Measurement | null => {
    let newMeasurement: Measurement | null = null;

    setState(prev => {
      if (!prev.pendingMeasurement) return prev;

      const { type, points } = prev.pendingMeasurement;

      // Validate point count
      // Distance polylines require 2+ points
      if (type === 'distance' && points.length < 2) return prev;
      if (type === 'area' && points.length < 3) return prev;

      // Calculate value based on type
      let value = 0;
      if (type === 'distance') {
        // Sum all segment lengths for polyline distance
        for (let i = 0; i < points.length - 1; i++) {
          value += points[i].distanceTo(points[i + 1]);
        }
      } else if (type === 'area') {
        // Use cross product method for area calculation
        const n = points.length;
        const crossSum = new THREE.Vector3(0, 0, 0);
        const origin = points[0];
        for (let i = 1; i < n - 1; i++) {
          const v1 = new THREE.Vector3().subVectors(points[i], origin);
          const v2 = new THREE.Vector3().subVectors(points[i + 1], origin);
          const cross = new THREE.Vector3().crossVectors(v1, v2);
          crossSum.add(cross);
        }
        value = crossSum.length() / 2;
      }

      newMeasurement = {
        id: `measurement-${Date.now()}`,
        type: type as MeasurementType,
        points: points.map(p => p.clone()),
        value,
        unit: prev.measurementUnit,
        createdAt: new Date().toISOString(),
        createdBy,
      };

      return {
        ...prev,
        measurements: [...prev.measurements, newMeasurement],
        pendingMeasurement: null,
      };
    });

    return newMeasurement;
  }, []);

  // Measurement interaction
  const selectMeasurement = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedMeasurementId: id }));
  }, []);

  const hoverMeasurement = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, hoveredMeasurementId: id }));
  }, []);

  const setMeasurementUnit = useCallback((unit: MeasurementUnit) => {
    setState(prev => ({ ...prev, measurementUnit: unit }));
  }, []);

  // Measurement point dragging
  const startDraggingMeasurementPoint = useCallback((measurementId: string, pointIndex: number) => {
    setState(prev => ({
      ...prev,
      draggingMeasurementPoint: { measurementId, pointIndex },
      selectedMeasurementId: measurementId, // Also select the measurement itself
      // Save current tool before clearing (to restore after drag)
      toolBeforeDrag: prev.activeTool,
      // Clear other selections for mutual exclusivity
      activeTool: null,
      selectedAnnotationId: null,
    }));
  }, []);

  const stopDraggingMeasurementPoint = useCallback(() => {
    setState(prev => ({
      ...prev,
      draggingMeasurementPoint: null,
      // Restore the tool that was active before dragging
      activeTool: prev.toolBeforeDrag,
      toolBeforeDrag: null,
      // Note: We keep selectedMeasurementId so the measurement remains highlighted briefly
    }));
  }, []);

  const updateMeasurementPoint = useCallback((
    measurementId: string,
    pointIndex: number,
    newPosition: THREE.Vector3
  ) => {
    setState(prev => ({
      ...prev,
      measurements: prev.measurements.map(m => {
        if (m.id !== measurementId) return m;

        const newPoints = [...m.points];
        newPoints[pointIndex] = newPosition.clone();

        // Recalculate value based on measurement type
        let newValue = 0;
        if (m.type === 'distance' && newPoints.length >= 2) {
          // Sum all segment lengths for polyline distance
          for (let i = 0; i < newPoints.length - 1; i++) {
            newValue += newPoints[i].distanceTo(newPoints[i + 1]);
          }
        } else if (m.type === 'area' && newPoints.length >= 3) {
          // Use cross product method for area calculation
          const n = newPoints.length;
          const crossSum = new THREE.Vector3(0, 0, 0);
          const origin = newPoints[0];
          for (let i = 1; i < n - 1; i++) {
            const v1 = new THREE.Vector3().subVectors(newPoints[i], origin);
            const v2 = new THREE.Vector3().subVectors(newPoints[i + 1], origin);
            const cross = new THREE.Vector3().crossVectors(v1, v2);
            crossSum.add(cross);
          }
          newValue = crossSum.length() / 2;
        }

        return { ...m, points: newPoints, value: newValue };
      }),
    }));
  }, []);

  // Update measurement points directly (for sync from renderer after transforms)
  // This replaces all points at once, used before split/truncate operations
  // to ensure state matches the renderer's current world positions
  const updateMeasurementPoints = useCallback((
    measurementId: string,
    newPoints: THREE.Vector3[]
  ) => {
    setState(prev => ({
      ...prev,
      measurements: prev.measurements.map(m => {
        if (m.id !== measurementId) return m;

        // Recalculate value based on measurement type
        let newValue = 0;
        if (m.type === 'distance' && newPoints.length >= 2) {
          for (let i = 0; i < newPoints.length - 1; i++) {
            newValue += newPoints[i].distanceTo(newPoints[i + 1]);
          }
        } else if (m.type === 'area' && newPoints.length >= 3) {
          const n = newPoints.length;
          const crossSum = new THREE.Vector3(0, 0, 0);
          const origin = newPoints[0];
          for (let i = 1; i < n - 1; i++) {
            const v1 = new THREE.Vector3().subVectors(newPoints[i], origin);
            const v2 = new THREE.Vector3().subVectors(newPoints[i + 1], origin);
            const cross = new THREE.Vector3().crossVectors(v1, v2);
            crossSum.add(cross);
          }
          newValue = crossSum.length() / 2;
        }

        return { ...m, points: newPoints.map(p => p.clone()), value: newValue };
      }),
      // Clear drag state if it references this measurement
      draggingMeasurementPoint:
        prev.draggingMeasurementPoint?.measurementId === measurementId
          ? null
          : prev.draggingMeasurementPoint,
    }));
  }, []);

  // Helper to calculate polyline total distance
  const calculatePolylineValue = useCallback((points: THREE.Vector3[]): number => {
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      total += points[i].distanceTo(points[i + 1]);
    }
    return total;
  }, []);

  // Remove a segment from a measurement (for segment deletion from labels)
  // Returns action type and measurement objects for Supabase persistence
  // - 'deleted': entire measurement removed (2-point line or segment makes it invalid)
  // - 'truncated': first or last segment removed, measurement shortened
  // - 'split': middle segment removed, measurement split into two
  const removeSegmentFromMeasurement = useCallback((
    measurementId: string,
    segmentIndex: number
  ): {
    action: 'deleted' | 'truncated' | 'split';
    originalMeasurement?: Measurement;
    newMeasurement?: Measurement;
  } => {
    let result: {
      action: 'deleted' | 'truncated' | 'split';
      originalMeasurement?: Measurement;
      newMeasurement?: Measurement;
    } = { action: 'deleted' };

    setState(prev => {
      const measurement = prev.measurements.find(m => m.id === measurementId);
      if (!measurement) return prev;

      const pointCount = measurement.points.length;
      const segmentCount = pointCount - 1;

      // Validate segment index
      if (segmentIndex < 0 || segmentIndex >= segmentCount) return prev;

      // Case 1: Single segment (2 points) → delete entire measurement
      if (pointCount === 2) {
        result = { action: 'deleted', originalMeasurement: measurement };
        return {
          ...prev,
          measurements: prev.measurements.filter(m => m.id !== measurementId),
          selectedMeasurementId: prev.selectedMeasurementId === measurementId ? null : prev.selectedMeasurementId,
          draggingMeasurementPoint: prev.draggingMeasurementPoint?.measurementId === measurementId ? null : prev.draggingMeasurementPoint,
        };
      }

      // Case 2: First segment (index 0) → truncate from start (keep points[1..n])
      if (segmentIndex === 0) {
        const newPoints = measurement.points.slice(1);
        const newValue = calculatePolylineValue(newPoints);
        const updatedMeasurement: Measurement = { ...measurement, points: newPoints, value: newValue };
        result = { action: 'truncated', originalMeasurement: updatedMeasurement };
        return {
          ...prev,
          measurements: prev.measurements.map(m =>
            m.id === measurementId ? updatedMeasurement : m
          ),
          draggingMeasurementPoint: prev.draggingMeasurementPoint?.measurementId === measurementId
            ? null
            : prev.draggingMeasurementPoint,
        };
      }

      // Case 3: Last segment → truncate from end (keep points[0..n-1])
      if (segmentIndex === segmentCount - 1) {
        const newPoints = measurement.points.slice(0, -1);
        const newValue = calculatePolylineValue(newPoints);
        const updatedMeasurement: Measurement = { ...measurement, points: newPoints, value: newValue };
        result = { action: 'truncated', originalMeasurement: updatedMeasurement };
        return {
          ...prev,
          measurements: prev.measurements.map(m =>
            m.id === measurementId ? updatedMeasurement : m
          ),
          draggingMeasurementPoint: prev.draggingMeasurementPoint?.measurementId === measurementId
            ? null
            : prev.draggingMeasurementPoint,
        };
      }

      // Case 4: Middle segment → split into two measurements
      // Segment N connects points[N] to points[N+1]
      // First half: points[0..segmentIndex]
      // Second half: points[segmentIndex+1..n-1]
      const firstHalfPoints = measurement.points.slice(0, segmentIndex + 1);
      const secondHalfPoints = measurement.points.slice(segmentIndex + 1);

      // First half becomes the updated original measurement
      const firstHalfValue = calculatePolylineValue(firstHalfPoints);
      const updatedMeasurement: Measurement = {
        ...measurement,
        points: firstHalfPoints,
        value: firstHalfValue,
      };

      // Second half becomes a new measurement
      const secondHalfValue = calculatePolylineValue(secondHalfPoints);
      const newMeasurement: Measurement = {
        id: `measurement-${Date.now()}`,
        type: measurement.type,
        points: secondHalfPoints,
        value: secondHalfValue,
        unit: measurement.unit,
        createdBy: measurement.createdBy,
        createdAt: new Date().toISOString(),
        label: measurement.label ? `${measurement.label} (split)` : undefined,
      };

      result = {
        action: 'split',
        originalMeasurement: updatedMeasurement,
        newMeasurement,
      };

      return {
        ...prev,
        measurements: [
          ...prev.measurements.map(m =>
            m.id === measurementId ? updatedMeasurement : m
          ),
          newMeasurement,
        ],
        // Clear selection (segment no longer exists)
        selectedMeasurementId: null,
        draggingMeasurementPoint: null,
      };
    });

    return result;
  }, [calculatePolylineValue]);

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

  const updateAnnotationPosition = useCallback((annotationId: string, position: THREE.Vector3) => {
    setState(prev => ({
      ...prev,
      annotations: prev.annotations.map(a =>
        a.id === annotationId ? { ...a, position: position.clone() } : a
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
      // Clear other selections for mutual exclusivity
      activeTool: null,
      draggingMeasurementPoint: null,
      selectedMeasurementId: null,
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

  // Collaboration panel actions
  const openCollaborationPanel = useCallback((tab?: CollaborationTab) => {
    setState(prev => ({
      ...prev,
      isCollaborationPanelOpen: true,
      activeCollaborationTab: tab ?? prev.activeCollaborationTab,
    }));
  }, []);

  const closeCollaborationPanel = useCallback(() => {
    setState(prev => ({ ...prev, isCollaborationPanelOpen: false }));
  }, []);

  const setActiveCollaborationTab = useCallback((tab: CollaborationTab) => {
    setState(prev => ({ ...prev, activeCollaborationTab: tab }));
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

  const value: ViewerContextType = useMemo(() => ({
    state,
    permissions,
    userRole,
    setActiveTool,
    setViewMode,
    setSplatViewMode,
    toggleGrid,
    toggleMeasurements,
    toggleAnnotations,
    toggleSavedViews,
    toggleCleanView,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
    loadMeasurements,
    startMeasurement,
    addMeasurementPoint,
    undoLastMeasurementPoint,
    cancelMeasurement,
    finalizeMeasurement,
    selectMeasurement,
    hoverMeasurement,
    setMeasurementUnit,
    startDraggingMeasurementPoint,
    stopDraggingMeasurementPoint,
    updateMeasurementPoint,
    updateMeasurementPoints,
    removeSegmentFromMeasurement,
    addAnnotation,
    removeAnnotation,
    addAnnotationReply,
    updateAnnotationStatus,
    updateAnnotationPosition,
    clearAnnotations,
    loadAnnotations,
    selectAnnotation,
    hoverAnnotation,
    openAnnotationPanel,
    closeAnnotationPanel,
    openAnnotationModal,
    closeAnnotationModal,
    openCollaborationPanel,
    closeCollaborationPanel,
    setActiveCollaborationTab,
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
  }), [
    state,
    permissions,
    userRole,
    setActiveTool,
    setViewMode,
    setSplatViewMode,
    toggleGrid,
    toggleMeasurements,
    toggleAnnotations,
    toggleSavedViews,
    toggleCleanView,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
    loadMeasurements,
    startMeasurement,
    addMeasurementPoint,
    undoLastMeasurementPoint,
    cancelMeasurement,
    finalizeMeasurement,
    selectMeasurement,
    hoverMeasurement,
    setMeasurementUnit,
    startDraggingMeasurementPoint,
    stopDraggingMeasurementPoint,
    updateMeasurementPoint,
    updateMeasurementPoints,
    removeSegmentFromMeasurement,
    addAnnotation,
    removeAnnotation,
    addAnnotationReply,
    updateAnnotationStatus,
    updateAnnotationPosition,
    clearAnnotations,
    loadAnnotations,
    selectAnnotation,
    hoverAnnotation,
    openAnnotationPanel,
    closeAnnotationPanel,
    openAnnotationModal,
    closeAnnotationModal,
    openCollaborationPanel,
    closeCollaborationPanel,
    setActiveCollaborationTab,
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
  ]);

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
