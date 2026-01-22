import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from '@/lib/viewer/SceneManager';
import { ViewMode } from '@/types/viewer';

interface Viewer3DProps {
  className?: string;
  scanId?: string;
  modelUrl?: string;
  onPointSelect?: (point: THREE.Vector3) => void;
  viewMode?: ViewMode;
  showGrid?: boolean;
  activeTool?: string | null;
  onSceneReady?: (sceneManager: SceneManager) => void;
}

const Viewer3D = ({
  className = '',
  scanId,
  modelUrl,
  onPointSelect,
  viewMode = 'solid',
  showGrid = true,
  activeTool = null,
  onSceneReady,
}: Viewer3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

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

  // Update view mode
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const material = mesh.material as THREE.MeshStandardMaterial;

    switch (viewMode) {
      case 'wireframe':
        material.wireframe = true;
        break;
      case 'points':
        // For points mode, we'd ideally switch to a PointsMaterial
        // For now, just use wireframe as a placeholder
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

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

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

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.9;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    // Lights
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

    // Sample geometry - placeholder for actual 3D scan
    // In production, this would load the actual model from modelUrl
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

    // Notify parent that scene is ready
    if (onSceneReady) {
      onSceneReady(sceneManager);
    }

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
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
      geometry.dispose();
      material.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      sceneManager.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [scanId, modelUrl, showGrid, onSceneReady, handleClick]);

  // Reset view function exposed via ref
  const resetView = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(5, 5, 5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, []);

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
