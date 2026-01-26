/**
 * DrawingEngine - Canvas-based drawing system for markup tools
 *
 * Provides 2D drawing capabilities overlaid on the 3D viewer for:
 * - Freehand drawing
 * - Shapes (circles, rectangles, arrows)
 * - Revision clouds (construction standard)
 * - Text labels
 *
 * Drawings are stored with camera state for view-dependent display.
 */

/**
 * Point in normalized coordinates (0-1)
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Camera state for markup display
 */
export interface CameraSnapshot {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
}

/**
 * Stroke style configuration
 */
export interface StrokeStyle {
  color: string;
  lineWidth: number;
  opacity: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  dashPattern?: number[];
}

/**
 * Default stroke styles
 */
export const DEFAULT_STROKE_STYLE: StrokeStyle = {
  color: '#EF4444', // Red
  lineWidth: 2,
  opacity: 1,
  lineCap: 'round',
  lineJoin: 'round',
};

/**
 * Markup tool types
 */
export type MarkupTool =
  | 'freehand'
  | 'circle'
  | 'rectangle'
  | 'arrow'
  | 'cloud'
  | 'text'
  | null;

/**
 * Markup data structure
 */
export interface Markup {
  id: string;
  type: Exclude<MarkupTool, null>;
  points: Point2D[];
  style: StrokeStyle;
  cameraSnapshot: CameraSnapshot;
  label?: string;
  createdAt: string;
  createdBy: string;
}

/**
 * DrawingEngine - Handles 2D markup drawing on canvas overlay
 */
export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentStroke: Point2D[] = [];
  private currentTool: MarkupTool = null;
  private currentStyle: StrokeStyle = { ...DEFAULT_STROKE_STYLE };
  private isDrawing = false;
  private startPoint: Point2D | null = null;

  // Stored markups for rendering
  private markups: Markup[] = [];

  // Callbacks
  private onStrokeComplete?: (points: Point2D[], tool: MarkupTool) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;

    // Set up canvas
    this.setupCanvas();
  }

  /**
   * Set up canvas for high-DPI rendering
   */
  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Set default styles
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  /**
   * Resize canvas (call when container resizes)
   */
  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  /**
   * Set the current drawing tool
   */
  setTool(tool: MarkupTool): void {
    this.currentTool = tool;
  }

  /**
   * Get the current drawing tool
   */
  getTool(): MarkupTool {
    return this.currentTool;
  }

  /**
   * Set the stroke style
   */
  setStyle(style: Partial<StrokeStyle>): void {
    this.currentStyle = { ...this.currentStyle, ...style };
  }

  /**
   * Get the current stroke style
   */
  getStyle(): StrokeStyle {
    return { ...this.currentStyle };
  }

  /**
   * Set callback for stroke completion
   */
  onComplete(callback: (points: Point2D[], tool: MarkupTool) => void): void {
    this.onStrokeComplete = callback;
  }

  /**
   * Start a drawing stroke
   */
  startStroke(point: Point2D): void {
    if (!this.currentTool) return;

    this.isDrawing = true;
    this.startPoint = point;
    this.currentStroke = [point];
  }

  /**
   * Continue a drawing stroke
   */
  continueStroke(point: Point2D): void {
    if (!this.isDrawing || !this.currentTool) return;

    if (this.currentTool === 'freehand') {
      this.currentStroke.push(point);
    }

    this.render();
  }

  /**
   * End a drawing stroke
   */
  endStroke(point: Point2D): Markup | null {
    if (!this.isDrawing || !this.currentTool) return null;

    this.isDrawing = false;

    // Finalize points based on tool
    let finalPoints: Point2D[];
    switch (this.currentTool) {
      case 'freehand':
        this.currentStroke.push(point);
        finalPoints = this.simplifyStroke(this.currentStroke, 0.002);
        break;
      case 'circle':
      case 'rectangle':
      case 'arrow':
        finalPoints = [this.startPoint!, point];
        break;
      case 'cloud':
        finalPoints = [this.startPoint!, point];
        break;
      default:
        finalPoints = this.currentStroke;
    }

    // Notify callback
    this.onStrokeComplete?.(finalPoints, this.currentTool);

    // Reset
    const tool = this.currentTool;
    this.currentStroke = [];
    this.startPoint = null;

    // Create markup object (ID and timestamps to be set by caller)
    const markup: Omit<Markup, 'id' | 'createdAt' | 'createdBy' | 'cameraSnapshot'> = {
      type: tool,
      points: finalPoints,
      style: { ...this.currentStyle },
    };

    this.render();

    return markup as Markup;
  }

  /**
   * Cancel current stroke
   */
  cancelStroke(): void {
    this.isDrawing = false;
    this.currentStroke = [];
    this.startPoint = null;
    this.render();
  }

  /**
   * Simplify stroke using Ramer-Douglas-Peucker algorithm
   */
  private simplifyStroke(points: Point2D[], tolerance: number): Point2D[] {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance from the line
    const first = points[0];
    const last = points[points.length - 1];

    let maxDist = 0;
    let maxIndex = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const dist = this.perpendicularDistance(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
      const left = this.simplifyStroke(points.slice(0, maxIndex + 1), tolerance);
      const right = this.simplifyStroke(points.slice(maxIndex), tolerance);

      // Remove duplicate point at junction
      return [...left.slice(0, -1), ...right];
    }

    // Otherwise, return just the endpoints
    return [first, last];
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(
    point: Point2D,
    lineStart: Point2D,
    lineEnd: Point2D
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    const lineLengthSq = dx * dx + dy * dy;

    if (lineLengthSq === 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
      );
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq
      )
    );

    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;

    return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
  }

  /**
   * Load markups to render
   */
  loadMarkups(markups: Markup[]): void {
    this.markups = markups;
    this.render();
  }

  /**
   * Add a markup to render
   */
  addMarkup(markup: Markup): void {
    this.markups.push(markup);
    this.render();
  }

  /**
   * Remove a markup
   */
  removeMarkup(id: string): void {
    this.markups = this.markups.filter((m) => m.id !== id);
    this.render();
  }

  /**
   * Clear all markups
   */
  clearMarkups(): void {
    this.markups = [];
    this.render();
  }

  /**
   * Render all markups and current stroke
   */
  render(): void {
    // Clear canvas
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    // Render stored markups
    for (const markup of this.markups) {
      this.renderMarkup(markup);
    }

    // Render current stroke (preview)
    if (this.isDrawing && this.startPoint) {
      this.applyStyle(this.currentStyle);

      switch (this.currentTool) {
        case 'freehand':
          this.renderFreehand(this.currentStroke);
          break;
        case 'circle':
          if (this.currentStroke.length >= 1) {
            const last = this.currentStroke[this.currentStroke.length - 1];
            this.renderCircle(this.startPoint, last);
          }
          break;
        case 'rectangle':
          if (this.currentStroke.length >= 1) {
            const last = this.currentStroke[this.currentStroke.length - 1];
            this.renderRectangle(this.startPoint, last);
          }
          break;
        case 'arrow':
          if (this.currentStroke.length >= 1) {
            const last = this.currentStroke[this.currentStroke.length - 1];
            this.renderArrow(this.startPoint, last);
          }
          break;
        case 'cloud':
          if (this.currentStroke.length >= 1) {
            const last = this.currentStroke[this.currentStroke.length - 1];
            this.renderCloud(this.startPoint, last);
          }
          break;
      }
    }
  }

  /**
   * Render a single markup
   */
  private renderMarkup(markup: Markup): void {
    this.applyStyle(markup.style);

    switch (markup.type) {
      case 'freehand':
        this.renderFreehand(markup.points);
        break;
      case 'circle':
        if (markup.points.length >= 2) {
          this.renderCircle(markup.points[0], markup.points[1]);
        }
        break;
      case 'rectangle':
        if (markup.points.length >= 2) {
          this.renderRectangle(markup.points[0], markup.points[1]);
        }
        break;
      case 'arrow':
        if (markup.points.length >= 2) {
          this.renderArrow(markup.points[0], markup.points[1]);
        }
        break;
      case 'cloud':
        if (markup.points.length >= 2) {
          this.renderCloud(markup.points[0], markup.points[1]);
        }
        break;
      case 'text':
        if (markup.points.length >= 1 && markup.label) {
          this.renderText(markup.points[0], markup.label);
        }
        break;
    }
  }

  /**
   * Apply stroke style to context
   */
  private applyStyle(style: StrokeStyle): void {
    this.ctx.strokeStyle = style.color;
    this.ctx.lineWidth = style.lineWidth;
    this.ctx.globalAlpha = style.opacity;
    this.ctx.lineCap = style.lineCap || 'round';
    this.ctx.lineJoin = style.lineJoin || 'round';
    if (style.dashPattern) {
      this.ctx.setLineDash(style.dashPattern);
    } else {
      this.ctx.setLineDash([]);
    }
  }

  /**
   * Convert normalized point to canvas coordinates
   */
  private toCanvas(point: Point2D): Point2D {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: point.x * rect.width,
      y: point.y * rect.height,
    };
  }

  /**
   * Render freehand stroke
   */
  private renderFreehand(points: Point2D[]): void {
    if (points.length < 2) return;

    this.ctx.beginPath();
    const start = this.toCanvas(points[0]);
    this.ctx.moveTo(start.x, start.y);

    for (let i = 1; i < points.length; i++) {
      const point = this.toCanvas(points[i]);
      this.ctx.lineTo(point.x, point.y);
    }

    this.ctx.stroke();
  }

  /**
   * Render circle
   */
  private renderCircle(start: Point2D, end: Point2D): void {
    const s = this.toCanvas(start);
    const e = this.toCanvas(end);

    const radius = Math.sqrt(Math.pow(e.x - s.x, 2) + Math.pow(e.y - s.y, 2));

    this.ctx.beginPath();
    this.ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * Render rectangle
   */
  private renderRectangle(start: Point2D, end: Point2D): void {
    const s = this.toCanvas(start);
    const e = this.toCanvas(end);

    this.ctx.beginPath();
    this.ctx.rect(s.x, s.y, e.x - s.x, e.y - s.y);
    this.ctx.stroke();
  }

  /**
   * Render arrow
   */
  private renderArrow(start: Point2D, end: Point2D): void {
    const s = this.toCanvas(start);
    const e = this.toCanvas(end);

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(s.x, s.y);
    this.ctx.lineTo(e.x, e.y);
    this.ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(e.y - s.y, e.x - s.x);
    const headLength = 15;

    this.ctx.beginPath();
    this.ctx.moveTo(e.x, e.y);
    this.ctx.lineTo(
      e.x - headLength * Math.cos(angle - Math.PI / 6),
      e.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(e.x, e.y);
    this.ctx.lineTo(
      e.x - headLength * Math.cos(angle + Math.PI / 6),
      e.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  /**
   * Render revision cloud (construction standard)
   */
  private renderCloud(start: Point2D, end: Point2D): void {
    const s = this.toCanvas(start);
    const e = this.toCanvas(end);

    const minX = Math.min(s.x, e.x);
    const minY = Math.min(s.y, e.y);
    const maxX = Math.max(s.x, e.x);
    const maxY = Math.max(s.y, e.y);

    const width = maxX - minX;
    const height = maxY - minY;

    // Calculate arc size based on rectangle size
    const arcSize = Math.min(width, height, 20) * 0.8;
    const numArcsH = Math.max(3, Math.ceil(width / arcSize));
    const numArcsV = Math.max(3, Math.ceil(height / arcSize));

    this.ctx.beginPath();

    // Top edge (left to right)
    for (let i = 0; i < numArcsH; i++) {
      const x = minX + (i + 0.5) * (width / numArcsH);
      this.ctx.arc(x, minY, arcSize / 2, Math.PI, 0, false);
    }

    // Right edge (top to bottom)
    for (let i = 0; i < numArcsV; i++) {
      const y = minY + (i + 0.5) * (height / numArcsV);
      this.ctx.arc(maxX, y, arcSize / 2, -Math.PI / 2, Math.PI / 2, false);
    }

    // Bottom edge (right to left)
    for (let i = numArcsH - 1; i >= 0; i--) {
      const x = minX + (i + 0.5) * (width / numArcsH);
      this.ctx.arc(x, maxY, arcSize / 2, 0, Math.PI, false);
    }

    // Left edge (bottom to top)
    for (let i = numArcsV - 1; i >= 0; i--) {
      const y = minY + (i + 0.5) * (height / numArcsV);
      this.ctx.arc(minX, y, arcSize / 2, Math.PI / 2, -Math.PI / 2, false);
    }

    this.ctx.stroke();
  }

  /**
   * Render text label
   */
  private renderText(position: Point2D, text: string): void {
    const p = this.toCanvas(position);

    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = this.currentStyle.color;
    this.ctx.fillText(text, p.x, p.y);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.markups = [];
    this.currentStroke = [];
    this.onStrokeComplete = undefined;
  }
}

export default DrawingEngine;
