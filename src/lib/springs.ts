import type { Transition } from 'framer-motion';

/**
 * Critically damped / slightly overdamped spring presets.
 * Tuned to feel calm, editorial, and precise — never cartoonish or bouncy.
 */
export const CAMERA_SPRING = {
  type: 'spring' as const,
  stiffness: 175,
  damping: 29,
  mass: 1.05,
};

export const GESTURE_SPRING = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 38,
  mass: 0.65,
};

export const HUD_SPRING: Transition = {
  type: 'spring',
  stiffness: 330,
  damping: 32,
  mass: 0.8,
};

export const HOVER_SPRING: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
};

export const PARALLAX_SPRING = {
  stiffness: 120,
  damping: 24,
  mass: 0.9,
};

export const REDUCED_TRANSITION: Transition = {
  duration: 0.16,
  ease: 'easeOut',
};

export function pickTransition(
  spring: Transition,
  reducedMotion: boolean | null,
): Transition {
  return reducedMotion ? REDUCED_TRANSITION : spring;
}

