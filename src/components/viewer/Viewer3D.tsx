import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { SceneManager } from '@/lib/viewer/SceneManager';
import { createSparkRenderer } from '@/lib/viewer/renderers';
import { RotationGizmoFeedback } from '@/lib/viewer/RotationGizmoFeedback';
import { CameraAnimator } from '@/lib/viewer/CameraAnimator';
import { MagnifierUpdater } from '@/lib/viewer/MagnifierUpdater';
import { CURSOR_TARGET, CURSOR_GIZMO_DRAG, CURSOR_PLACEMENT } from '@/lib/viewer/cursors';
import type { SplatLoadProgress, SplatSceneMetadata, SplatOrientation, SplatTransform, TransformMode, TransformAxis, Annotation, Measurement, SelectedMeasurementPoint } from '@/types/viewer';
import { ViewMode } from '@/types/viewer';

interface Viewer3DProps {
  className?: string;
  scanId?: string;
  modelUrl?: string;
  splatUrl?: string;
  onPointSelect?: (point: THREE.Vector3) => void;
  viewMode?: ViewMode;
  showGrid?: boolean;
  activeTool?: string | null;
  onSceneReady?: (sceneManager: SceneManager) => void;
  enableZoom?: boolean;
  onSplatLoadStart?: () => void;
  onSplatLoadProgress?: (progress: SplatLoadProgress) => void;
  onSplatLoadComplete?: (metadata: SplatSceneMetadata) => void;
  onSplatLoadError?: (error: Error) => void;
  /** Initial orientation to apply when splat loads (defaults to DEFAULT_SPLAT_ORIENTATION) */
  initialOrientation?: SplatOrientation;
  /** Initial full transform to apply when splat loads (takes precedence over initialOrientation) */
  initialTransform?: SplatTransform;
  /** Transform gizmo mode (null = hidden) */
  transformMode?: TransformMode | null;
  /** Callback when transform changes via gizmo interaction */
  onTransformChange?: (transform: SplatTransform) => void;
  /** Callback to expose the resetView function to parent */
  onResetView?: (resetFn: () => void) => void;
  /** Callback when annotation marker is hovered */
  onAnnotationHover?: (annotationId: string | null) => void;
  /** Callback when annotation marker is clicked */
  onAnnotationSelect?: (annotationId: string | null) => void;
  /** Currently hovered annotation ID (for external control) */
  hoveredAnnotationId?: string | null;
  /** Currently selected annotation ID (for external control) */
  selectedAnnotationId?: string | null;
  /** Annotations to render as 3D markers (deprecated - using HTML overlay instead) */
  annotations?: Annotation[];
  /** Callback to expose the camera to parent for HTML annotation overlay */
  onCameraReady?: (camera: THREE.PerspectiveCamera) => void;
  /** Measurements for point editing */
  measurements?: Measurement[];
  /** Currently selected measurement point for editing */
  selectedMeasurementPoint?: SelectedMeasurementPoint | null;
  /** Callback when a measurement point is moved via gizmo */
  onMeasurementPointMove?: (measurementId: string, pointIndex: number, newPosition: THREE.Vector3) => void;
  /** Callback to deselect the currently selected measurement point */
  onMeasurementPointDeselect?: () => void;
  /** Callback when annotation is moved (click-to-relocate or gizmo) */
  onAnnotationMove?: (annotationId: string, position: THREE.Vector3) => void;
  /** Callback to expose the CameraAnimator to parent for saved views fly-to */
  onCameraAnimatorReady?: (animator: CameraAnimator) => void;
  /** Callback for camera quaternion updates (for axis navigator) */
  onCameraQuaternionUpdate?: (quaternion: THREE.Quaternion) => void;
  /** Callback to expose the WebGL renderer to parent */
  onRendererReady?: (renderer: THREE.WebGLRenderer) => void;
  /** Callback to expose the OrbitControls to parent */
  onControlsReady?: (controls: OrbitControls) => void;
  /** Canvas element for the magnifier loupe (receives cropped WebGL content) */
  magnifierCanvas?: HTMLCanvasElement | null;
  /** Callback for mouse position updates (for magnifier loupe positioning) */
  onMousePositionUpdate?: (x: number, y: number, visible: boolean) => void;
}

const Viewer3D = ({
  className = '',
  scanId,
  modelUrl,
  splatUrl,
  onPointSelect,
  viewMode = 'solid',
  showGrid = true,
  activeTool = null,
  onSceneReady,
  enableZoom = true,
  onSplatLoadStart,
  onSplatLoadProgress,
  onSplatLoadComplete,
  onSplatLoadError,
  initialOrientation,
  initialTransform,
  transformMode = null,
  onTransformChange,
  onResetView,
  onAnnotationHover,
  onAnnotationSelect,
  hoveredAnnotationId,
  selectedAnnotationId,
  annotations,
  onCameraReady,
  measurements,
  selectedMeasurementPoint,
  onMeasurementPointMove,
  onMeasurementPointDeselect,
  onAnnotationMove,
  onCameraAnimatorReady,
  onCameraQuaternionUpdate,
  onRendererReady,
  onControlsReady,
  magnifierCanvas,
  onMousePositionUpdate,
}: Viewer3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const xAxisLineRef = useRef<THREE.Line | null>(null);
  const zAxisLineRef = useRef<THREE.Line | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const isSplatLoadingRef = useRef<boolean>(false);
  const rotationFeedbackRef = useRef<RotationGizmoFeedback | null>(null);
  const cameraAnimatorRef = useRef<CameraAnimator | null>(null);
  // Helper object for measurement point gizmo attachment
  const measurementPointHelperRef = useRef<THREE.Object3D | null>(null);
  // Helper object for annotation gizmo attachment
  const annotationHelperRef = useRef<THREE.Object3D | null>(null);
  // Store removed gizmo elements (E/XYZE circles) to restore when leaving rotate mode
  const removedGizmoElementsRef = useRef<{ parent: THREE.Object3D; child: THREE.Object3D }[]>([]);
  // Track pointer position for drag detection (to avoid triggering clicks on camera drags)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  // Track whether the transform gizmo is being dragged (for cursor feedback)
  const gizmoDraggingRef = useRef(false);
  // Magnifier loupe updater (canvas crop logic in render loop)
  const magnifierUpdaterRef = useRef<MagnifierUpdater | null>(null);

  // Store callbacks and values in refs to avoid effect re-runs when parent re-renders
  const onSplatLoadStartRef = useRef(onSplatLoadStart);
  const onSplatLoadProgressRef = useRef(onSplatLoadProgress);
  const onSplatLoadCompleteRef = useRef(onSplatLoadComplete);
  const onSplatLoadErrorRef = useRef(onSplatLoadError);
  const initialOrientationRef = useRef(initialOrientation);
  const initialTransformRef = useRef(initialTransform);
  const onTransformChangeRef = useRef(onTransformChange);
  const onResetViewRef = useRef(onResetView);
  const onAnnotationHoverRef = useRef(onAnnotationHover);
  const onAnnotationSelectRef = useRef(onAnnotationSelect);
  const activeToolRef = useRef(activeTool);
  const onPointSelectRef = useRef(onPointSelect);
  const onCameraReadyRef = useRef(onCameraReady);
  const onMeasurementPointMoveRef = useRef(onMeasurementPointMove);
  const onMeasurementPointDeselectRef = useRef(onMeasurementPointDeselect);
  const onAnnotationMoveRef = useRef(onAnnotationMove);
  const onCameraAnimatorReadyRef = useRef(onCameraAnimatorReady);
  const onCameraQuaternionUpdateRef = useRef(onCameraQuaternionUpdate);
  const onRendererReadyRef = useRef(onRendererReady);
  const onControlsReadyRef = useRef(onControlsReady);
  const onMousePositionUpdateRef = useRef(onMousePositionUpdate);

  // Keep callback refs updated
  // Intentionally no deps - refs should always have latest callback values to avoid stale closures
  useEffect(() => {
    onSplatLoadStartRef.current = onSplatLoadStart;
    onSplatLoadProgressRef.current = onSplatLoadProgress;
    onSplatLoadCompleteRef.current = onSplatLoadComplete;
    onSplatLoadErrorRef.current = onSplatLoadError;
    initialOrientationRef.current = initialOrientation;
    initialTransformRef.current = initialTransform;
    onTransformChangeRef.current = onTransformChange;
    onResetViewRef.current = onResetView;
    onAnnotationHoverRef.current = onAnnotationHover;
    onAnnotationSelectRef.current = onAnnotationSelect;
    activeToolRef.current = activeTool;
    onPointSelectRef.current = onPointSelect;
    onCameraReadyRef.current = onCameraReady;
    onMeasurementPointMoveRef.current = onMeasurementPointMove;
    onMeasurementPointDeselectRef.current = onMeasurementPointDeselect;
    onAnnotationMoveRef.current = onAnnotationMove;
    onCameraAnimatorReadyRef.current = onCameraAnimatorReady;
    onCameraQuaternionUpdateRef.current = onCameraQuaternionUpdate;
    onRendererReadyRef.current = onRendererReady;
    onControlsReadyRef.current = onControlsReady;
    onMousePositionUpdateRef.current = onMousePositionUpdate;
  });

  // Track pointer position on mousedown for drag detection
  const handlePointerDown = useCallback((event: PointerEvent) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  // Track selected measurement point for click-to-move
  const selectedMeasurementPointRef = useRef(selectedMeasurementPoint);
  useEffect(() => {
    selectedMeasurementPointRef.current = selectedMeasurementPoint;
  }, [selectedMeasurementPoint]);

  // Track selected annotation for click-to-relocate
  const selectedAnnotationIdRef = useRef(selectedAnnotationId);
  useEffect(() => {
    selectedAnnotationIdRef.current = selectedAnnotationId;
  }, [selectedAnnotationId]);

  // Handle point selection via raycasting
  const handleClick = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneManagerRef.current) return;

    // Check if this was a drag (not a click) - ignore if mouse moved > 3px
    if (pointerDownRef.current) {
      const distance = Math.hypot(
        event.clientX - pointerDownRef.current.x,
        event.clientY - pointerDownRef.current.y
      );
      if (distance > 3) {
        // User was dragging camera - ignore click
        pointerDownRef.current = null;
        return;
      }
    }
    pointerDownRef.current = null;

    const rect = containerRef.current.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // First check if clicking on an annotation marker
    const annotationId = sceneManagerRef.current.pickAnnotation(cameraRef.current, pointer);
    if (annotationId) {
      onAnnotationSelectRef.current?.(annotationId);
      return;
    }

    // If an annotation is selected, click-to-relocate behavior
    const editingAnnotation = selectedAnnotationIdRef.current;
    if (editingAnnotation) {
      const pickResult = sceneManagerRef.current.pickSplatPosition(cameraRef.current, pointer);
      if (pickResult) {
        const newPos = pickResult.position.clone();
        onAnnotationMoveRef.current?.(editingAnnotation, newPos);
        sceneManagerRef.current.updateAnnotationPosition(editingAnnotation, newPos);
        if (annotationHelperRef.current) {
          annotationHelperRef.current.position.copy(newPos);
        }
        onAnnotationSelectRef.current?.(null);
        return;
      }
    }

    // If a measurement point is selected (editing mode), click-to-move behavior
    const editingPoint = selectedMeasurementPointRef.current;
    if (editingPoint) {
      const pickResult = sceneManagerRef.current.pickSplatPosition(cameraRef.current, pointer);
      if (pickResult) {
        const newPos = pickResult.position.clone();
        // Move the selected point to the clicked position
        onMeasurementPointMoveRef.current?.(
          editingPoint.measurementId,
          editingPoint.pointIndex,
          newPos
        );
        // Update 3D line geometry in the scene
        sceneManagerRef.current.updateMeasurementPoint(
          editingPoint.measurementId,
          editingPoint.pointIndex,
          newPos
        );
        // Update gizmo helper position so the 3D gizmo follows
        if (measurementPointHelperRef.current) {
          measurementPointHelperRef.current.position.copy(newPos);
        }
        onMeasurementPointDeselectRef.current?.();
        return; // Don't create new measurements while editing a point
      }
    }

    // If using a measurement/annotation tool, pick splat surface
    const currentTool = activeToolRef.current;
    const pointSelectCallback = onPointSelectRef.current;
    if (pointSelectCallback && currentTool && ['distance', 'area', 'angle', 'pin', 'comment'].includes(currentTool)) {
      // Try splat picking first
      const pickResult = sceneManagerRef.current.pickSplatPosition(cameraRef.current, pointer);
      if (pickResult) {
        pointSelectCallback(pickResult.position.clone());
        return;
      }

      // Fall back to regular raycasting for non-splat content
      const intersections = sceneManagerRef.current.raycast(cameraRef.current, pointer);
      if (intersections.length > 0) {
        pointSelectCallback(intersections[0].point.clone());
      }
    }
  }, []);

  // Handle mouse move for annotation hover detection and measurement point dragging
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneManagerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Update magnifier position
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    magnifierUpdaterRef.current?.setMousePosition(mx, my);
    const magnifierVisible = magnifierUpdaterRef.current?.enabled ?? false;
    onMousePositionUpdateRef.current?.(mx, my, magnifierVisible);
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Check if hovering over an annotation marker
    const annotationId = sceneManagerRef.current.pickAnnotation(cameraRef.current, pointer);
    onAnnotationHoverRef.current?.(annotationId);

    // Update cursor style based on: gizmo drag > gizmo hover > editing point > selected annotation > active tool > hover state > default
    // Priority: Gizmo dragging > Gizmo hovered > Selected measurement point > Selected annotation > Placement tool > Hover > Default
    if (containerRef.current) {
      const currentTool = activeToolRef.current;
      const isPlacementTool = currentTool && ['comment', 'pin', 'distance', 'area', 'angle'].includes(currentTool);
      const editingPoint = selectedMeasurementPointRef.current;
      const gizmoHovered = transformControlsRef.current?.axis != null;
      const gizmoDragging = gizmoDraggingRef.current;

      if (gizmoDragging) {
        // Show move-arrows cursor when dragging gizmo axis
        containerRef.current.style.cursor = CURSOR_GIZMO_DRAG;
      } else if (gizmoHovered) {
        // Show default cursor when hovering gizmo axis (not CURSOR_TARGET)
        containerRef.current.style.cursor = 'default';
      } else if (editingPoint) {
        // Show target cursor when a measurement point is selected (click-to-move mode)
        containerRef.current.style.cursor = CURSOR_TARGET;
      } else if (selectedAnnotationIdRef.current) {
        // Show target cursor when annotation is selected (click-to-relocate mode)
        containerRef.current.style.cursor = CURSOR_TARGET;
      } else if (isPlacementTool) {
        // Keep placement cursor when a placement tool is active (don't override on hover)
        containerRef.current.style.cursor = CURSOR_PLACEMENT;
      } else if (annotationId) {
        // Show pointer when hovering over an annotation (only when no tool active)
        containerRef.current.style.cursor = 'pointer';
      } else {
        containerRef.current.style.cursor = 'default';
      }
    }
  }, []);

  // Update view mode (for non-splat content)
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const material = mesh.material as THREE.MeshStandardMaterial;

    switch (viewMode) {
      case 'wireframe':
        material.wireframe = true;
        break;
      case 'points':
        material.wireframe = true;
        break;
      case 'solid':
      default:
        material.wireframe = false;
        break;
    }
  }, [viewMode]);

  // Update grid visibility (includes axis lines)
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
    if (xAxisLineRef.current) {
      xAxisLineRef.current.visible = showGrid;
    }
    if (zAxisLineRef.current) {
      zAxisLineRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Fit camera to bounding box
  const fitCameraToBounds = useCallback((boundingBox: THREE.Box3) => {
    if (!cameraRef.current || !controlsRef.current) return;

    // Validate bounding box - skip if empty or degenerate
    if (boundingBox.isEmpty()) {
      return;
    }

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);

    // Check for degenerate bounding box (all dimensions near zero)
    if (maxDim < 0.001) {
      camera.position.set(5, 5, 5);
      controls.target.set(center.x, center.y, center.z);
      controls.update();
      return;
    }

    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    cameraDistance *= 1.5; // Add some padding

    // Position camera
    const direction = new THREE.Vector3(1, 0.5, 1).normalize();
    camera.position.copy(center).add(direction.multiplyScalar(cameraDistance));
    camera.lookAt(center);

    // Update controls target
    controls.target.copy(center);
    controls.update();

    // Update near/far planes based on scene size
    camera.near = cameraDistance / 100;
    camera.far = cameraDistance * 100;
    camera.updateProjectionMatrix();
  }, []);

  // Main scene setup
  useEffect(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Skip setup if container has zero dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create rotation feedback for Godot-style gizmo visualization
    const rotationFeedback = new RotationGizmoFeedback(scene);
    rotationFeedbackRef.current = rotationFeedback;

    // Create SceneManager
    const sceneManager = new SceneManager(scene);
    sceneManagerRef.current = sceneManager;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Notify parent that camera is ready (for HTML annotation overlay)
    onCameraReadyRef.current?.(camera);

    // Renderer setup - note: antialias:false is recommended for Spark
    const renderer = new THREE.WebGLRenderer({
      antialias: !splatUrl, // Disable antialiasing for splat rendering
      alpha: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    renderer.shadowMap.enabled = !splatUrl; // Disable shadows for splat rendering
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Notify parent that renderer is ready (for axis navigator gizmo)
    onRendererReadyRef.current?.(renderer);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.95;
    controls.minDistance = 0.1;
    controls.maxDistance = 500;
    controls.enableZoom = enableZoom;
    controlsRef.current = controls;

    // Notify parent that controls are ready (for axis navigator gizmo)
    onControlsReadyRef.current?.(controls);

    // Transform Controls (for gizmo manipulation)
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSize(0.75); // Slightly smaller gizmo for less visual clutter
    scene.add(transformControls.getHelper());
    transformControlsRef.current = transformControls;

    // Camera Animator (for fly-to functionality)
    const cameraAnimator = new CameraAnimator(camera, controls);
    cameraAnimatorRef.current = cameraAnimator;
    onCameraAnimatorReadyRef.current?.(cameraAnimator);

    // Magnifier Updater (canvas crop for loupe)
    const magnifierUpdater = new MagnifierUpdater();
    magnifierUpdaterRef.current = magnifierUpdater;

    // Disable OrbitControls while dragging the gizmo
    transformControls.addEventListener('dragging-changed', (event: { value: boolean }) => {
      controls.enabled = !event.value;
      gizmoDraggingRef.current = event.value;

      // Handle rotation gizmo feedback (Godot-style arc + label)
      const activeAxis = event.value ? (transformControls.axis as TransformAxis) : null;
      if (event.value && transformControls.mode === 'rotate' && activeAxis) {
        // Start rotation feedback
        const splatMesh = sceneManagerRef.current?.getSplatMesh();
        if (splatMesh) {
          rotationFeedbackRef.current?.startRotation(
            activeAxis,
            splatMesh.quaternion.clone(),
            splatMesh.position.clone(),
            0.75  // Match transformControls.setSize(0.75)
          );
        }
      } else {
        // End rotation feedback
        rotationFeedbackRef.current?.endRotation();
      }
    });

    // Emit transform changes when gizmo is manipulated
    transformControls.addEventListener('objectChange', () => {
      const sceneManager = sceneManagerRef.current;
      if (sceneManager) {
        const transform = sceneManager.getSplatTransform();
        if (transform) {
          // Notify parent of transform change
          onTransformChangeRef.current?.(transform);

          // Update rotation feedback if active
          if (transformControls.mode === 'rotate') {
            const splatMesh = sceneManagerRef.current?.getSplatMesh();
            if (splatMesh) {
              rotationFeedbackRef.current?.updateRotation(splatMesh.quaternion.clone());
            }
          }
        }
      }
    });

    // Shift key snapping for precise transforms (Unreal Engine style)
    let isShiftPressed = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isShiftPressed) {
        isShiftPressed = true;
        transformControls.setTranslationSnap(0.1);      // 10cm increments
        transformControls.setRotationSnap(Math.PI / 18); // 10° increments
        transformControls.setScaleSnap(0.1);             // 10% increments
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftPressed = false;
        transformControls.setTranslationSnap(null);
        transformControls.setRotationSnap(null);
        transformControls.setScaleSnap(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Lights (for non-splat content)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(10, 10, 5);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-10, -10, -5);
    scene.add(directionalLight2);

    // Grid - neutral white/gray lines
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
    gridHelper.visible = showGrid;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // X-axis line (red) - ground plane
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff4444 });
    const xAxisPoints = [
      new THREE.Vector3(-10, 0, 0),
      new THREE.Vector3(10, 0, 0)
    ];
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints(xAxisPoints);
    const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
    xAxisLine.visible = showGrid;
    scene.add(xAxisLine);
    xAxisLineRef.current = xAxisLine;

    // Z-axis line (blue) - ground plane
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x4444ff });
    const zAxisPoints = [
      new THREE.Vector3(0, 0, -10),
      new THREE.Vector3(0, 0, 10)
    ];
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints(zAxisPoints);
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
    zAxisLine.visible = showGrid;
    scene.add(zAxisLine);
    zAxisLineRef.current = zAxisLine;

    // Only add placeholder geometry if no splat URL is provided
    if (!splatUrl) {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshStandardMaterial({
        color: 0xF59E0B,
        metalness: 0.1,
        roughness: 0.8,
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(0, 1, 0);
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
      meshRef.current = cube;

      // Add a floor plane for shadow receiving
      const floorGeometry = new THREE.PlaneGeometry(20, 20);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 1,
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0;
      floor.receiveShadow = true;
      scene.add(floor);

      // Register with scene manager
      sceneManager.addObject('main-model', cube);
      sceneManager.addObject('floor', floor);
    }

    // Initialize picking system for splat and annotation picking
    sceneManager.initPickingSystem(renderer);

    // Notify parent that scene is ready
    if (onSceneReady) {
      onSceneReady(sceneManager);
    }

    // Animation loop
    let animationFrameId: number;
    const clock = clockRef.current;
    clock.start();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();

      controls.update();

      // Ensure camera matrix is updated before passing to Spark renderer
      camera.updateMatrixWorld();

      // Update splat renderer if active
      if (sceneManager.hasSplatLoaded()) {
        sceneManager.updateSplat(camera, deltaTime);
      }

      renderer.render(scene, camera);

      // Update magnifier loupe (must be in same rAF as render for drawImage to work)
      magnifierUpdaterRef.current?.update(renderer.domElement);

      // Notify parent of camera quaternion for axis navigator
      onCameraQuaternionUpdateRef.current?.(camera.quaternion);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Pointerdown handler for drag detection
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Click handler for point selection and annotation selection
    renderer.domElement.addEventListener('click', handleClick);

    // Mousemove handler for annotation hover detection and measurement point dragging
    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    // Pointerleave handler to hide magnifier when mouse exits canvas
    const handlePointerLeave = () => {
      onMousePositionUpdateRef.current?.(0, 0, false);
    };
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      transformControls.dispose();
      rotationFeedback.dispose();
      cameraAnimator.dispose();
      renderer.dispose();
      sceneManager.dispose();
      // Reset loading flag to prevent stuck state if component unmounts during load
      isSplatLoadingRef.current = false;
      rotationFeedbackRef.current = null;
      transformControlsRef.current = null;
      cameraAnimatorRef.current = null;
      magnifierUpdaterRef.current = null;
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [scanId, modelUrl, onSceneReady, handlePointerDown, handleClick, handleMouseMove, enableZoom, splatUrl]);

  // Load splat when URL changes (must run AFTER main scene setup)
  useEffect(() => {
    if (!splatUrl || !sceneManagerRef.current || !rendererRef.current) {
      return;
    }
    if (isSplatLoadingRef.current) {
      return;
    }

    const sceneManager = sceneManagerRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;

    if (!scene) {
      return;
    }

    isSplatLoadingRef.current = true;
    onSplatLoadStartRef.current?.();

    // Remove placeholder geometry when loading a splat
    if (meshRef.current) {
      scene.remove(meshRef.current);
      sceneManager.removeObject('main-model');
      meshRef.current = null;
    }

    // Remove floor for splat scenes
    const floor = sceneManager.getObject('floor');
    if (floor) {
      sceneManager.removeObject('floor');
    }

    // Create and set up the splat renderer
    const splatRenderer = createSparkRenderer(renderer, scene);
    sceneManager.setSplatRenderer(splatRenderer);

    // Load the splat with initial transform (or orientation for backward compatibility)
    sceneManager.loadSplat(
      splatUrl,
      (progress) => {
        onSplatLoadProgressRef.current?.(progress);
      },
      initialOrientationRef.current,
      initialTransformRef.current
    )
      .then((metadata) => {
        isSplatLoadingRef.current = false;

        // Fit camera to splat bounds
        if (metadata.boundingBox) {
          fitCameraToBounds(metadata.boundingBox);
        }

        // Attach TransformControls to the splat mesh
        const transformControls = transformControlsRef.current;
        const splatMesh = sceneManager.getSplatMesh();
        if (transformControls && splatMesh) {
          transformControls.attach(splatMesh);
        }

        onSplatLoadCompleteRef.current?.({
          ...metadata,
          url: splatUrl,
        });
      })
      .catch((error) => {
        isSplatLoadingRef.current = false;
        onSplatLoadErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      });
  }, [splatUrl, fitCameraToBounds]);

  // Update transform controls mode and visibility
  useEffect(() => {
    const transformControls = transformControlsRef.current;
    if (!transformControls) return;

    if (transformMode === null) {
      // Hide the gizmo
      transformControls.enabled = false;
      transformControls.visible = false;
      transformControls.getHelper().visible = false;

      // Restore any removed elements when gizmo is hidden
      removedGizmoElementsRef.current.forEach(({ parent, child }) => {
        parent.add(child);
      });
      removedGizmoElementsRef.current = [];
    } else {
      // Show and set the mode
      transformControls.enabled = true;
      transformControls.visible = true;
      transformControls.getHelper().visible = true;
      transformControls.setMode(transformMode);

      // Remove XYZE and E (yellow/gray free-rotation circles) in rotate mode
      // Note: We must physically remove them because TransformControls resets
      // visibility/opacity every frame in updateMatrixWorld()
      if (transformMode === 'rotate') {
        const helper = transformControls.getHelper();
        const toRemove: { parent: THREE.Object3D; child: THREE.Object3D }[] = [];

        helper.traverse((child: THREE.Object3D) => {
          // TransformControls uses .name property for axis identification
          // "XYZE" = gray free-rotation circle, "E" = yellow outer ring
          if (child.name === 'XYZE' || child.name === 'E') {
            if (child.parent) {
              toRemove.push({ parent: child.parent, child });
            }
          }
        });

        // Remove after traversal to avoid mutation during iteration
        toRemove.forEach(({ parent, child }) => {
          parent.remove(child);
        });
        removedGizmoElementsRef.current = toRemove;
      } else {
        // Restore removed elements when switching to non-rotate mode
        removedGizmoElementsRef.current.forEach(({ parent, child }) => {
          parent.add(child);
        });
        removedGizmoElementsRef.current = [];
      }
    }
  }, [transformMode]);

  // Measurement point gizmo effect - attaches TransformControls when a point is selected
  useEffect(() => {
    const transformControls = transformControlsRef.current;
    const scene = sceneRef.current;
    const sceneManager = sceneManagerRef.current;

    if (!transformControls || !scene || !sceneManager) return;

    // Clean up existing helper
    if (measurementPointHelperRef.current) {
      transformControls.detach();
      scene.remove(measurementPointHelperRef.current);
      measurementPointHelperRef.current = null;
    }

    if (selectedMeasurementPoint) {
      // Get world position from SceneManager (handles LOCAL→WORLD conversion correctly)
      const worldPos = sceneManager.getMeasurementPointWorldPosition(
        selectedMeasurementPoint.measurementId,
        selectedMeasurementPoint.pointIndex
      );
      if (!worldPos) return;

      // Create helper at world position
      const helper = new THREE.Object3D();
      helper.position.copy(worldPos);
      scene.add(helper);
      measurementPointHelperRef.current = helper;

      // Attach gizmo in translate mode
      transformControls.attach(helper);
      transformControls.setMode('translate');
      transformControls.enabled = true;
      transformControls.visible = true;
      transformControls.getHelper().visible = true;

      // Handle gizmo movement - pass WORLD position (renderers handle conversion internally)
      const handleChange = () => {
        if (measurementPointHelperRef.current && selectedMeasurementPoint) {
          const newWorldPos = measurementPointHelperRef.current.position.clone();
          // Update both ViewerContext (via callback) and SceneManager renderer
          // Both expect WORLD positions and handle conversion internally
          onMeasurementPointMoveRef.current?.(
            selectedMeasurementPoint.measurementId,
            selectedMeasurementPoint.pointIndex,
            newWorldPos
          );
          sceneManager.updateMeasurementPoint(
            selectedMeasurementPoint.measurementId,
            selectedMeasurementPoint.pointIndex,
            newWorldPos
          );
        }
      };

      // Disable orbit controls during any gizmo interaction (prevents camera fight)
      const handleObjectChange = () => {
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
        handleChange();
      };

      // On drag END, snap to nearest surface (avoids jitter during drag)
      const handleDragEnd = () => {
        if (measurementPointHelperRef.current && selectedMeasurementPoint && cameraRef.current) {
          const snapped = sceneManager.snapPositionToSplatSurface(
            cameraRef.current,
            measurementPointHelperRef.current.position
          );
          measurementPointHelperRef.current.position.copy(snapped);
          // Pass WORLD position - renderers handle conversion internally
          onMeasurementPointMoveRef.current?.(
            selectedMeasurementPoint.measurementId,
            selectedMeasurementPoint.pointIndex,
            snapped
          );
          sceneManager.updateMeasurementPoint(
            selectedMeasurementPoint.measurementId,
            selectedMeasurementPoint.pointIndex,
            snapped
          );
        }
      };

      const handleDraggingChanged = (e: { value: boolean }) => {
        if (!e.value) {
          handleDragEnd(); // Drag ended - snap to surface
          // Re-enable orbit controls after drag
          if (controlsRef.current) {
            controlsRef.current.enabled = true;
          }
        }
      };

      transformControls.addEventListener('objectChange', handleObjectChange);
      transformControls.addEventListener('dragging-changed', handleDraggingChanged);

      return () => {
        transformControls.removeEventListener('objectChange', handleObjectChange);
        transformControls.removeEventListener('dragging-changed', handleDraggingChanged);
      };
    } else {
      // No point selected - re-attach to splat mesh if transform mode active
      const splatMesh = sceneManager.getSplatMesh();
      if (splatMesh && transformMode !== null) {
        transformControls.attach(splatMesh);
      }
    }
  }, [selectedMeasurementPoint, transformMode]);

  // Annotation gizmo effect - attaches TransformControls when an annotation is selected
  useEffect(() => {
    const transformControls = transformControlsRef.current;
    const scene = sceneRef.current;
    const sceneManager = sceneManagerRef.current;

    if (!transformControls || !scene || !sceneManager) return;

    // Clean up existing annotation helper
    if (annotationHelperRef.current) {
      // Only detach if we're the current attachment
      if (transformControls.object === annotationHelperRef.current) {
        transformControls.detach();
      }
      scene.remove(annotationHelperRef.current);
      annotationHelperRef.current = null;
    }

    // Don't show annotation gizmo if a measurement point is selected (measurement takes priority)
    if (selectedMeasurementPoint) return;

    if (selectedAnnotationId) {
      // Get world position from SceneManager (handles LOCAL→WORLD conversion correctly)
      const worldPos = sceneManager.getAnnotationWorldPosition(selectedAnnotationId);
      if (!worldPos) return;

      // Create helper at world position
      const helper = new THREE.Object3D();
      helper.position.copy(worldPos);
      scene.add(helper);
      annotationHelperRef.current = helper;

      // Attach gizmo in translate mode
      transformControls.attach(helper);
      transformControls.setMode('translate');
      transformControls.enabled = true;
      transformControls.visible = true;
      transformControls.getHelper().visible = true;

      // Handle gizmo movement - pass WORLD position (renderers handle conversion internally)
      const handleChange = () => {
        if (annotationHelperRef.current && selectedAnnotationId) {
          const newWorldPos = annotationHelperRef.current.position.clone();
          // Update both ViewerContext (via callback) and SceneManager renderer
          // Both expect WORLD positions and handle conversion internally
          onAnnotationMoveRef.current?.(selectedAnnotationId, newWorldPos);
          sceneManager.updateAnnotationPosition(selectedAnnotationId, newWorldPos);
        }
      };

      // Disable orbit controls during gizmo interaction
      const handleObjectChange = () => {
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
        handleChange();
      };

      // On drag END, snap to nearest surface
      const handleDragEnd = () => {
        if (annotationHelperRef.current && selectedAnnotationId && cameraRef.current) {
          const snapped = sceneManager.snapPositionToSplatSurface(
            cameraRef.current,
            annotationHelperRef.current.position
          );
          annotationHelperRef.current.position.copy(snapped);
          // Pass WORLD position - renderers handle conversion internally
          onAnnotationMoveRef.current?.(selectedAnnotationId, snapped);
          sceneManager.updateAnnotationPosition(selectedAnnotationId, snapped);
        }
      };

      const handleDraggingChanged = (e: { value: boolean }) => {
        if (!e.value) {
          handleDragEnd(); // Drag ended - snap to surface
          // Re-enable orbit controls after drag
          if (controlsRef.current) {
            controlsRef.current.enabled = true;
          }
        }
      };

      transformControls.addEventListener('objectChange', handleObjectChange);
      transformControls.addEventListener('dragging-changed', handleDraggingChanged);

      return () => {
        transformControls.removeEventListener('objectChange', handleObjectChange);
        transformControls.removeEventListener('dragging-changed', handleDraggingChanged);
      };
    } else {
      // No annotation selected - re-attach to splat mesh if transform mode active and no measurement selected
      const splatMesh = sceneManager.getSplatMesh();
      if (splatMesh && transformMode !== null && !selectedMeasurementPoint) {
        transformControls.attach(splatMesh);
      }
    }
  }, [selectedAnnotationId, selectedMeasurementPoint, transformMode]);

  // Reset view function
  const resetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    const sceneManager = sceneManagerRef.current;
    if (sceneManager?.hasSplatLoaded()) {
      const bounds = sceneManager.getSplatBoundingBox();
      if (bounds) {
        fitCameraToBounds(bounds);
        return;
      }
    }

    // Default reset for non-splat content
    cameraRef.current.position.set(5, 5, 5);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, [fitCameraToBounds]);

  // Expose resetView function to parent component
  useEffect(() => {
    onResetViewRef.current?.(resetView);
  }, [resetView]);

  // Note: 3D annotation marker sync removed - now using HTML overlay via AnnotationIconOverlay

  // Update cursor immediately when tool or editing state changes
  useEffect(() => {
    if (containerRef.current) {
      const isPlacementTool = activeTool && ['comment', 'pin', 'distance', 'area', 'angle'].includes(activeTool);
      if (selectedMeasurementPoint) {
        // Show target cursor when a measurement point is selected (click-to-move mode)
        containerRef.current.style.cursor = CURSOR_TARGET;
      } else if (selectedAnnotationId) {
        // Show target cursor when annotation is selected (can be dragged)
        containerRef.current.style.cursor = CURSOR_TARGET;
      } else if (isPlacementTool) {
        containerRef.current.style.cursor = CURSOR_PLACEMENT;
      } else {
        containerRef.current.style.cursor = 'default';
      }
    }
  }, [activeTool, selectedMeasurementPoint, selectedAnnotationId]);

  // Sync magnifier enabled state with active tool / editing state
  useEffect(() => {
    const placementTools = ['comment', 'pin', 'distance', 'area', 'angle'];
    const isPlacement = activeTool != null && placementTools.includes(activeTool);
    const isReposition = !!selectedAnnotationId || !!selectedMeasurementPoint;
    magnifierUpdaterRef.current?.setEnabled(isPlacement || isReposition);
  }, [activeTool, selectedAnnotationId, selectedMeasurementPoint]);

  // Sync magnifier canvas prop
  useEffect(() => {
    magnifierUpdaterRef.current?.setCanvas(magnifierCanvas ?? null);
  }, [magnifierCanvas]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
};

export default Viewer3D;
