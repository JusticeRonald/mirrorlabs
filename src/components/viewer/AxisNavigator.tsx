import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewportGizmo } from 'three-viewport-gizmo';

export type ViewDirection = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';

interface AxisNavigatorProps {
  /** Main viewer camera */
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera | null;
  /** Main viewer WebGL renderer */
  renderer: THREE.WebGLRenderer | null;
  /** Main viewer OrbitControls for camera sync */
  controls: OrbitControls | null;
  /** Size of the navigator widget (default: 140) */
  size?: number;
  /** Callback when user clicks a view direction (optional) */
  onViewChange?: (view: ViewDirection) => void;
}

/**
 * AxisNavigator - Professional Blender-style 3D orientation gizmo
 *
 * Uses three-viewport-gizmo library for high-quality sphere visualization.
 * Shows current camera orientation and allows clicking axes to snap to
 * orthographic views (front, back, top, bottom, left, right).
 */
export function AxisNavigator({
  camera,
  renderer,
  controls,
  size = 140,
  onViewChange,
}: AxisNavigatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gizmoRef = useRef<ViewportGizmo | null>(null);

  // Initialize gizmo when camera/renderer are ready
  useEffect(() => {
    if (!camera || !renderer || !containerRef.current) return;

    // Create ViewportGizmo with Blender-style sphere configuration
    const gizmo = new ViewportGizmo(camera, renderer, {
      // Container for the gizmo
      container: containerRef.current,

      // Visual type - sphere matches Blender style
      type: 'sphere',

      // Size - larger than default for better visibility
      size,

      // Animation settings - disabled because we handle animation ourselves
      // The gizmo's internal animation uses wrong distance (causes "zoom through" bug)
      animated: false,
      speed: 1.2,

      // Font styling
      font: {
        family: 'Inter, system-ui, sans-serif',
        weight: '600',
      },

      // Background sphere
      background: {
        enabled: true,
        color: 0x1a1a1a,
        opacity: 0,
        hover: {
          color: 0x2a2a2a,
          opacity: 0.8,
        },
      },

      // Axis colors (Blender standard: X=red, Y=green, Z=blue)
      x: {
        color: 0xf73c3c,
        label: 'X',
        labelColor: 0xffffff,
        line: true,
        hover: {
          color: 0xff6b6b,

        },
      },
      y: {
        color: 0x6ccb26,
        label: 'Y',
        labelColor: 0xffffff,
        line: true,
        hover: {
          color: 0x8fef4a,

        },
      },
      z: {
        color: 0x178cf0,
        label: 'Z',
        labelColor: 0xffffff,
        line: true,
        hover: {
          color: 0x4aa8ff,

        },
      },

      // Negative axes (darker shades)
      nx: {
        color: 0x942424,
        labelColor: 0xcccccc,
        line: false,
        hover: {
          color: 0xb03030,

        },
      },
      ny: {
        color: 0x417a17,
        labelColor: 0xcccccc,
        line: false,
        hover: {
          color: 0x5a9a20,

        },
      },
      nz: {
        color: 0x0e5490,
        labelColor: 0xcccccc,
        line: false,
        hover: {
          color: 0x1470b8,

        },
      },
    });

    gizmoRef.current = gizmo;

    // Attach to OrbitControls for automatic camera sync
    if (controls) {
      gizmo.attachControls(controls);
    }

    // Animation loop - REQUIRED for gizmo to render
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      gizmo.update(); // Sync orientation with camera
      gizmo.render(); // Draw the gizmo
    };
    animate();

    // Listen for view change events on 'start' (BEFORE gizmo moves camera)
    // This allows our animation (via onViewChange) to override the gizmo's instant snap
    const handleStart = () => {
      if (!onViewChange) return;

      // Get the clicked direction from the gizmo's target quaternion
      // _quaternionEnd is set when user clicks an axis, before animation starts
      const gizmoAny = gizmo as unknown as { _quaternionEnd?: THREE.Quaternion };
      if (!gizmoAny._quaternionEnd) return;

      // Calculate direction from the target quaternion
      // The gizmo positions camera at (0, 0, 1) rotated by quaternion
      const direction = new THREE.Vector3(0, 0, 1);
      direction.applyQuaternion(gizmoAny._quaternionEnd);

      // Find the closest axis direction to determine which view was clicked
      const axes: { dir: THREE.Vector3; view: ViewDirection }[] = [
        { dir: new THREE.Vector3(0, 0, 1), view: 'front' },
        { dir: new THREE.Vector3(0, 0, -1), view: 'back' },
        { dir: new THREE.Vector3(0, 1, 0), view: 'top' },
        { dir: new THREE.Vector3(0, -1, 0), view: 'bottom' },
        { dir: new THREE.Vector3(1, 0, 0), view: 'right' },
        { dir: new THREE.Vector3(-1, 0, 0), view: 'left' },
      ];

      let closestView: ViewDirection = 'front';
      let maxDot = -Infinity;

      for (const axis of axes) {
        const dot = direction.dot(axis.dir);
        if (dot > maxDot) {
          maxDot = dot;
          closestView = axis.view;
        }
      }

      // Fire callback to trigger our smooth animation with correct distance
      onViewChange(closestView);
    };

    gizmo.addEventListener('start', handleStart);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      gizmo.removeEventListener('start', handleStart);
      gizmo.dispose();
      gizmoRef.current = null;
    };
  }, [camera, renderer, controls, size, onViewChange]);

  // Update gizmo when controls change (reattach)
  useEffect(() => {
    const gizmo = gizmoRef.current;
    if (!gizmo || !controls) return;

    gizmo.attachControls(controls);
  }, [controls]);

  return (
    <div
      ref={containerRef}
      className=""
      style={{
        width: size,
        height: size,
        position: 'relative',
      }}
    />
  );
}

export default AxisNavigator;
