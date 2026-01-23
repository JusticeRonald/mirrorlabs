import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from '@/lib/viewer/SceneManager';
import { createSparkRenderer } from '@/lib/viewer/renderers';
import type { SplatLoadProgress, SplatSceneMetadata } from '@/types/viewer';
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
}: Viewer3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const isSplatLoadingRef = useRef<boolean>(false);

  // Store callbacks in refs to avoid effect re-runs when parent re-renders
  const onSplatLoadStartRef = useRef(onSplatLoadStart);
  const onSplatLoadProgressRef = useRef(onSplatLoadProgress);
  const onSplatLoadCompleteRef = useRef(onSplatLoadComplete);
  const onSplatLoadErrorRef = useRef(onSplatLoadError);

  // Keep callback refs updated
  useEffect(() => {
    onSplatLoadStartRef.current = onSplatLoadStart;
    onSplatLoadProgressRef.current = onSplatLoadProgress;
    onSplatLoadCompleteRef.current = onSplatLoadComplete;
    onSplatLoadErrorRef.current = onSplatLoadError;
  });

  // Handle point selection via raycasting
  const handleClick = useCallback((event: MouseEvent) => {
    if (!onPointSelect || !containerRef.current || !cameraRef.current || !sceneManagerRef.current) return;
    if (!activeTool || !['distance', 'area', 'angle', 'pin', 'comment'].includes(activeTool)) return;

    const rect = containerRef.current.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const intersections = sceneManagerRef.current.raycast(cameraRef.current, pointer);

    if (intersections.length > 0) {
      onPointSelect(intersections[0].point.clone());
    }
  }, [onPointSelect, activeTool]);

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

  // Update grid visibility
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Fit camera to bounding box
  const fitCameraToBounds = useCallback((boundingBox: THREE.Box3) => {
    if (!cameraRef.current || !controlsRef.current) return;

    // Validate bounding box - skip if empty or degenerate
    if (boundingBox.isEmpty()) {
      console.warn('[Viewer3D] fitCameraToBounds: Bounding box is empty, skipping camera fit');
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
      console.warn('[Viewer3D] fitCameraToBounds: Bounding box has near-zero size, using default camera position');
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

    console.log('[Viewer3D] Camera fitted to bounds:', {
      center: center.toArray(),
      size: size.toArray(),
      cameraDistance,
    });
  }, []);

  // Main scene setup
  useEffect(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    console.log('[Viewer3D] Scene setup starting:', {
      containerWidth,
      containerHeight,
      splatUrl,
      showGrid,
    });

    // Warn if container has zero dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      console.warn('[Viewer3D] WARNING: Container has zero dimensions!', {
        width: containerWidth,
        height: containerHeight,
      });
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    console.log('[Viewer3D] Scene created');

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
    console.log('[Viewer3D] WebGL renderer created:', {
      canvasWidth: renderer.domElement.width,
      canvasHeight: renderer.domElement.height,
      pixelRatio: renderer.getPixelRatio(),
    });

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.95;
    controls.minDistance = 0.1;
    controls.maxDistance = 500;
    controls.enableZoom = enableZoom;
    controlsRef.current = controls;

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

    // Grid - Amber themed
    const gridHelper = new THREE.GridHelper(20, 20, 0xFBBF24, 0x92400E);
    gridHelper.visible = showGrid;
    scene.add(gridHelper);
    gridRef.current = gridHelper;
    console.log('[Viewer3D] Grid created:', { visible: showGrid });

    // Only add placeholder geometry if no splat URL is provided
    if (!splatUrl) {
      console.log('[Viewer3D] No splatUrl - creating placeholder cube');
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
    } else {
      console.log('[Viewer3D] splatUrl provided - skipping placeholder cube, will load splat:', splatUrl);
    }

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

    // Click handler for point selection
    renderer.domElement.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      sceneManager.dispose();
      // Reset loading flag to prevent stuck state if component unmounts during load
      isSplatLoadingRef.current = false;
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [scanId, modelUrl, onSceneReady, handleClick, enableZoom, splatUrl]);

  // Load splat when URL changes (must run AFTER main scene setup)
  useEffect(() => {
    console.log('[Viewer3D] Splat load effect triggered:', {
      splatUrl,
      hasSceneManager: !!sceneManagerRef.current,
      hasRenderer: !!rendererRef.current,
      isLoading: isSplatLoadingRef.current,
    });

    if (!splatUrl || !sceneManagerRef.current || !rendererRef.current) {
      console.log('[Viewer3D] Splat load effect skipped - missing dependencies');
      return;
    }
    if (isSplatLoadingRef.current) {
      console.log('[Viewer3D] Splat load effect skipped - already loading');
      return;
    }

    const sceneManager = sceneManagerRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;

    if (!scene) {
      console.log('[Viewer3D] Splat load effect skipped - no scene');
      return;
    }

    console.log('[Viewer3D] Starting splat load for:', splatUrl);
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

    // Load the splat
    console.log('[Viewer3D] Calling sceneManager.loadSplat...');
    sceneManager.loadSplat(splatUrl, (progress) => {
      console.log('[Viewer3D] Splat load progress:', progress.percentage + '%');
      onSplatLoadProgressRef.current?.(progress);
    })
      .then((metadata) => {
        isSplatLoadingRef.current = false;
        console.log('[Viewer3D] Splat load SUCCESS:', {
          splatCount: metadata.splatCount,
          hasBoundingBox: !!metadata.boundingBox,
          boundingBox: metadata.boundingBox ? {
            min: metadata.boundingBox.min.toArray(),
            max: metadata.boundingBox.max.toArray(),
          } : null,
        });

        // Fit camera to splat bounds
        if (metadata.boundingBox) {
          fitCameraToBounds(metadata.boundingBox);
        }

        onSplatLoadCompleteRef.current?.({
          ...metadata,
          url: splatUrl,
        });
      })
      .catch((error) => {
        isSplatLoadingRef.current = false;
        console.error('[Viewer3D] Splat load FAILED:', error);
        onSplatLoadErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      });
  }, [splatUrl, fitCameraToBounds]);

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

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
      data-reset-view={resetView}
    />
  );
};

export default Viewer3D;
