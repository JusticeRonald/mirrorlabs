import { useRef, useEffect, useCallback, useState } from 'react';
import {
  DrawingEngine,
  type MarkupTool,
  type StrokeStyle,
  type Point2D,
  type Markup,
  type CameraSnapshot,
  DEFAULT_STROKE_STYLE,
} from '@/lib/viewer/DrawingEngine';
import { cn } from '@/lib/utils';

interface DrawingCanvasProps {
  /** Container element for dimension tracking */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Current tool (null = disabled) */
  activeTool: MarkupTool;
  /** Current stroke style */
  style?: Partial<StrokeStyle>;
  /** Camera state for associating markups with view */
  cameraSnapshot: CameraSnapshot | null;
  /** Current user ID */
  userId: string;
  /** Existing markups to display */
  markups?: Markup[];
  /** Callback when a markup is created */
  onMarkupCreate?: (markup: Omit<Markup, 'id'>) => void;
  /** Whether canvas is interactive */
  enabled?: boolean;
}

/**
 * DrawingCanvas - Canvas overlay for markup drawing
 *
 * Provides 2D drawing capabilities on top of the 3D viewer.
 * Markups are stored with camera state for view-dependent display.
 */
export function DrawingCanvas({
  containerRef,
  activeTool,
  style = {},
  cameraSnapshot,
  userId,
  markups = [],
  onMarkupCreate,
  enabled = true,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize drawing engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new DrawingEngine(canvasRef.current);
    engineRef.current = engine;

    // Set up completion callback
    engine.onComplete((points: Point2D[], tool: MarkupTool) => {
      if (!tool || !cameraSnapshot) return;

      const markup: Omit<Markup, 'id'> = {
        type: tool,
        points,
        style: engine.getStyle(),
        cameraSnapshot,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      };

      onMarkupCreate?.(markup);
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [cameraSnapshot, userId, onMarkupCreate]);

  // Update tool
  useEffect(() => {
    engineRef.current?.setTool(activeTool);
  }, [activeTool]);

  // Update style
  useEffect(() => {
    engineRef.current?.setStyle({ ...DEFAULT_STROKE_STYLE, ...style });
  }, [style]);

  // Load markups
  useEffect(() => {
    engineRef.current?.loadMarkups(markups);
  }, [markups]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !engineRef.current) return;

      const { clientWidth, clientHeight } = containerRef.current;
      canvasRef.current.style.width = `${clientWidth}px`;
      canvasRef.current.style.height = `${clientHeight}px`;
      engineRef.current.resize(clientWidth, clientHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [containerRef]);

  // Convert mouse event to normalized coordinates
  const eventToNormalized = useCallback((e: React.MouseEvent): Point2D => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !activeTool || e.button !== 0) return;

      const point = eventToNormalized(e);
      engineRef.current?.startStroke(point);
      setIsDrawing(true);
    },
    [enabled, activeTool, eventToNormalized]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !isDrawing) return;

      const point = eventToNormalized(e);
      engineRef.current?.continueStroke(point);
    },
    [enabled, isDrawing, eventToNormalized]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !isDrawing) return;

      const point = eventToNormalized(e);
      engineRef.current?.endStroke(point);
      setIsDrawing(false);
    },
    [enabled, isDrawing, eventToNormalized]
  );

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      engineRef.current?.cancelStroke();
      setIsDrawing(false);
    }
  }, [isDrawing]);

  // Only show when a tool is active
  if (!activeTool) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 z-20',
        enabled && activeTool ? 'cursor-crosshair' : 'pointer-events-none'
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
}

export default DrawingCanvas;
