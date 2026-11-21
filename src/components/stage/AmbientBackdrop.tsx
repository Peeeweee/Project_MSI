import { useEffect, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';

interface AmbientBackdropProps {
  /** Enable slow-drifting particles & flowing muscle-fiber lines */
  enabled: boolean;
  /** Lighter density when preset is "Lite" */
  lite?: boolean;
  /** Pause canvas redraws during camera flight to give 100% compositor budget to zoom */
  paused?: boolean;
  /** Shared depth parallax normalized values [-1, 1] for Layer 1 background glow */
  depthX: MotionValue<number>;
  depthY: MotionValue<number>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  phase: number;
  hue: 'blush' | 'maroon';
}

interface FiberRibbon {
  baseY: number;
  amp: number;
  freq: number;
  speed: number;
  phase: number;
  width: number;
  alpha: number;
  color: string;
}

/**
 * Ambient background sitting strictly BEHIND the artwork letterbox:
 * - Layer 1 of the 3-layer depth parallax (deep maroon glow drifts subtly with mouse/tilt).
 * - High-performance 2D Canvas rendering soft muscle-fiber-like flowing maroon/blush lines
 *   and slow-drifting particles that gently bend toward the pointer.
 * - Immediately pauses its rAF loop when the browser tab is hidden (visibilitychange).
 */
export function AmbientBackdrop({
  enabled,
  lite = false,
  paused: externallyPaused = false,
  depthX,
  depthY,
}: AmbientBackdropProps) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedPropRef = useRef(externallyPaused);
  pausedPropRef.current = externallyPaused;

  // Layer 1 (deepest) parallax rate: moves opposite pointer by ±20px / ±14px
  const bgGlowX = useTransform(depthX, (v) => -v * 20);
  const bgGlowY = useTransform(depthY, (v) => -v * 14);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled || prefersReducedMotion) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particleCount = lite ? 18 : 34;
    const fiberCount = lite ? 4 : 7;

    const particles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.08 - Math.random() * 0.18,
      r: 1.1 + Math.random() * 2.1,
      alpha: 0.14 + Math.random() * 0.28,
      phase: i * 0.7,
      hue: i % 3 === 0 ? 'maroon' : 'blush',
    }));

    const fibers: FiberRibbon[] = Array.from({ length: fiberCount }, (_, i) => ({
      baseY: ((i + 0.5) / fiberCount) * height,
      amp: 22 + (i % 3) * 14,
      freq: 0.0022 + (i % 4) * 0.00055,
      speed: 0.25 + (i % 3) * 0.11,
      phase: i * 1.15,
      width: 1.1 + (i % 2) * 0.85,
      alpha: 0.08 + (i % 3) * 0.035,
      color: i % 2 === 0 ? '255, 217, 208' : '180, 48, 48',
    }));

    let mouseX = width / 2;
    let mouseY = height / 2;
    let smoothMx = mouseX;
    let smoothMy = mouseY;

    const handlePointer = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    let rafId = 0;
    let paused = document.hidden;
    let lastTime = performance.now();
    let elapsed = 0;

    const renderFrame = (now: number) => {
      if (paused) return;
      if (pausedPropRef.current) {
        lastTime = now;
        rafId = window.requestAnimationFrame(renderFrame);
        return;
      }
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      // Smooth pointer tracking so fibers & particles react gently
      smoothMx += (mouseX - smoothMx) * 0.04;
      smoothMy += (mouseY - smoothMy) * 0.04;

      ctx.clearRect(0, 0, width, height);

      const normMx = (smoothMx / Math.max(1, width) - 0.5) * 2;
      const normMy = (smoothMy / Math.max(1, height) - 0.5) * 2;

      // 1) Soft muscle-fiber-like flowing sine ribbons
      for (const f of fibers) {
        ctx.beginPath();
        const stepX = 36;
        const yBase = (f.baseY / Math.max(1, height)) * height;

        for (let x = -stepX; x <= width + stepX; x += stepX) {
          const distFromMouseX = (x - smoothMx) / Math.max(240, width * 0.45);
          const mousePull =
            Math.exp(-(distFromMouseX * distFromMouseX)) * normMy * 28;
          const wave =
            Math.sin(x * f.freq + elapsed * f.speed + f.phase + normMx * 0.55) *
              f.amp +
            Math.cos(x * f.freq * 0.55 - elapsed * f.speed * 0.7) * (f.amp * 0.35);
          const y = yBase + wave + mousePull;

          if (x === -stepX) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = `rgba(${f.color}, ${f.alpha})`;
        ctx.lineWidth = f.width;
        ctx.stroke();
      }

      // 2) Slow-drifting ambient particles reacting subtly to mouse proximity
      for (const p of particles) {
        p.x += p.vx + normMx * 0.14;
        p.y += p.vy + normMy * 0.08;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        const dx = smoothMx - p.x;
        const dy = smoothMy - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist < 180) {
          const pull = (1 - dist / 180) * 0.18;
          p.x += (dx / dist) * pull;
          p.y += (dy / dist) * pull;
        }

        const twinkle = 0.7 + 0.3 * Math.sin(elapsed * 1.4 + p.phase);
        const a = p.alpha * twinkle;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle =
          p.hue === 'blush'
            ? `rgba(255, 217, 208, ${a})`
            : `rgba(175, 42, 42, ${a * 1.25})`;
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        paused = true;
        window.cancelAnimationFrame(rafId);
      } else {
        paused = false;
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', handlePointer, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    if (!paused) {
      rafId = window.requestAnimationFrame(renderFrame);
    }

    return () => {
      paused = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, lite, prefersReducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#240505]"
    >
      {/* Layer 1 of 3-layer depth parallax: deep maroon ambient glow */}
      <motion.div
        style={{
          x: bgGlowX,
          y: bgGlowY,
          background:
            'radial-gradient(ellipse 84% 76% at 50% 50%, #631313 0%, #3b0a0a 54%, #200404 100%)',
        }}
        className="absolute -inset-8"
      />

      {/* Mouse-reactive muscle-fiber ribbons & slow-drifting particles */}
      {enabled && !prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          data-testid="ambient-canvas"
          className="absolute inset-0 block h-full w-full"
        />
      )}
    </div>
  );
}
