import { useEffect } from 'react';
import {
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from 'framer-motion';

export interface DepthParallaxValues {
  /** Smooth normalized horizontal input in [-1, 1] */
  nx: MotionValue<number>;
  /** Smooth normalized vertical input in [-1, 1] */
  ny: MotionValue<number>;
}

const DEPTH_SPRING = { stiffness: 105, damping: 24, mass: 0.95 };

/**
 * Shared 3-layer depth parallax input driven by mouse pointer on desktop
 * and device orientation tilt (gamma/beta) on mobile.
 */
export function useDepthParallax(enabled: boolean): DepthParallaxValues {
  const prefersReducedMotion = useReducedMotion();
  const active = enabled && !prefersReducedMotion;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const nx = useSpring(rawX, DEPTH_SPRING);
  const ny = useSpring(rawY, DEPTH_SPRING);

  useEffect(() => {
    if (!active) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const xNorm = Math.max(-1, Math.min(1, (e.clientX / w - 0.5) * 2));
      const yNorm = Math.max(-1, Math.min(1, (e.clientY / h - 0.5) * 2));
      rawX.set(xNorm);
      rawY.set(yNorm);
    };

    const handlePointerLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // Gamma: left/right tilt [-25..25deg], Beta: forward/back centered near 45deg handheld
      const xNorm = Math.max(-1, Math.min(1, e.gamma / 25));
      const yNorm = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      rawX.set(xNorm);
      rawY.set(yNorm);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('deviceorientation', handleOrientation, {
      passive: true,
    });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [active, rawX, rawY]);

  return { nx, ny };
}

