import { forwardRef, useRef, useEffect } from 'react';

interface MagnifierLoupeProps {
  visible: boolean;
  mouseX: number; // container-relative CSS px
  mouseY: number;
  loupeSize?: number; // default 140
}

/**
 * Circular magnifier loupe overlay.
 *
 * Renders a zoomed-in crop of the WebGL canvas around the cursor for precise
 * point placement (annotations, measurements). The inner <canvas> is exposed
 * via forwardRef so the parent can pass it to MagnifierUpdater.
 *
 * Positioning is done via ref-based style.transform to avoid React re-renders
 * on every mousemove.
 */
const MagnifierLoupe = forwardRef<HTMLCanvasElement, MagnifierLoupeProps>(
  ({ visible, mouseX, mouseY, loupeSize = 140 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Update position via DOM ref (avoids React re-renders on every mousemove)
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      if (!visible) {
        el.style.display = 'none';
        return;
      }

      el.style.display = 'block';

      // Position loupe centered above cursor with 24px gap
      const offset = loupeSize / 2 + 24;
      let translateY = mouseY - offset - loupeSize / 2;

      // If loupe goes above container, flip to below cursor
      if (translateY < 0) {
        translateY = mouseY + 24 - loupeSize / 2 + loupeSize / 2;
      }

      const translateX = mouseX - loupeSize / 2;
      el.style.transform = `translate(${translateX}px, ${translateY}px)`;
    }, [visible, mouseX, mouseY, loupeSize]);

    return (
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: loupeSize,
          height: loupeSize,
          pointerEvents: 'none',
          zIndex: 50,
          display: 'none',
        }}
      >
        {/* Zoomed canvas content */}
        <canvas
          ref={ref}
          style={{
            width: loupeSize,
            height: loupeSize,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)',
            display: 'block',
          }}
        />
        {/* Crosshair overlay */}
        <svg
          width={loupeSize}
          height={loupeSize}
          viewBox={`0 0 ${loupeSize} ${loupeSize}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        >
          {/* Dark shadow lines for contrast */}
          <line
            x1={loupeSize / 2}
            y1={0}
            x2={loupeSize / 2}
            y2={loupeSize}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={2}
          />
          <line
            x1={0}
            y1={loupeSize / 2}
            x2={loupeSize}
            y2={loupeSize / 2}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={2}
          />
          {/* White crosshair lines */}
          <line
            x1={loupeSize / 2}
            y1={0}
            x2={loupeSize / 2}
            y2={loupeSize}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={loupeSize / 2}
            x2={loupeSize}
            y2={loupeSize / 2}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={1}
          />
        </svg>
      </div>
    );
  }
);

MagnifierLoupe.displayName = 'MagnifierLoupe';

export { MagnifierLoupe };
export type { MagnifierLoupeProps };
