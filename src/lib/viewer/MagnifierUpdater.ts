/**
 * MagnifierUpdater — render-loop helper for the magnifier loupe.
 *
 * Crops a small region of the WebGL canvas around the cursor and draws it
 * scaled-up into a separate overlay canvas. Must be called from the animate()
 * loop right after renderer.render() so `drawImage` can read the WebGL
 * framebuffer within the same rAF callback.
 */
export class MagnifierUpdater {
  private loupeCanvas: HTMLCanvasElement | null = null;
  private loupeCtx: CanvasRenderingContext2D | null = null;
  private _enabled = false;
  private _mouseX = 0; // CSS pixels relative to container
  private _mouseY = 0;
  private _zoomFactor = 2.5;
  private _loupeSize = 140; // CSS px diameter

  setCanvas(canvas: HTMLCanvasElement | null): void {
    this.loupeCanvas = canvas;
    this.loupeCtx = canvas ? canvas.getContext('2d') : null;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  setMousePosition(x: number, y: number): void {
    this._mouseX = x;
    this._mouseY = y;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get loupeSize(): number {
    return this._loupeSize;
  }

  /** Called in animate() right after renderer.render() */
  update(sourceCanvas: HTMLCanvasElement): void {
    if (!this._enabled || !this.loupeCanvas || !this.loupeCtx) return;

    const dpr = sourceCanvas.width / sourceCanvas.clientWidth;
    const srcCenterX = this._mouseX * dpr;
    const srcCenterY = this._mouseY * dpr;

    // Source region to crop (small area that gets stretched to fill loupe)
    const srcSize = (this._loupeSize * dpr) / this._zoomFactor;

    // Clamp to canvas bounds
    const sx = Math.max(0, Math.min(sourceCanvas.width - srcSize, srcCenterX - srcSize / 2));
    const sy = Math.max(0, Math.min(sourceCanvas.height - srcSize, srcCenterY - srcSize / 2));
    const sw = Math.min(srcSize, sourceCanvas.width - sx);
    const sh = Math.min(srcSize, sourceCanvas.height - sy);

    // Destination (loupe at device pixel resolution for sharpness)
    const destSize = this._loupeSize * dpr;
    this.loupeCanvas.width = destSize;
    this.loupeCanvas.height = destSize;

    this.loupeCtx.clearRect(0, 0, destSize, destSize);
    this.loupeCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, destSize, destSize);
  }
}
