import { motion, useReducedMotion } from 'framer-motion';
import type { TransitionPhase } from '../../hooks/useCamera';

interface CinematicEffectsProps {
  phase: TransitionPhase;
  isFocused: boolean;
  panDirection: 1 | -1;
}

/**
 * Pure opacity-only depth-of-field overlays (60fps compositor friendly):
 * 1. Very light radial vignette that closes gently during Phase 2 ("Fly in")
 *    and settles lightly around the focused section.
 * 2. Faint directional motion-blur streak (opacity only) that fades smoothly
 *    in and out during Fly-In and Pan-Through travel.
 */
export function CinematicEffects({
  phase,
  isFocused,
  panDirection,
}: CinematicEffectsProps) {
  const prefersReducedMotion = useReducedMotion();

  const vignetteOpacity =
    phase === 'fly-in'
      ? 0.52
      : phase === 'pan-through'
        ? 0.42
        : isFocused && phase !== 'zoom-out'
          ? 0.2
          : 0;

  const showStreak =
    !prefersReducedMotion &&
    (phase === 'fly-in' || phase === 'pan-through');

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {/* Subtle radial depth-of-field vignette (opacity only) */}
      <motion.div
        initial={false}
        animate={{ opacity: vignetteOpacity }}
        transition={
          prefersReducedMotion
            ? { duration: 0.16 }
            : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
        }
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 76% 74% at 54% 50%, rgba(20, 3, 3, 0) 56%, rgba(18, 3, 3, 0.62) 100%)',
        }}
      />

      {/* Faint motion-blur speed streak (opacity only, fades in and out during flight) */}
      <motion.div
        key={`${phase}-${panDirection}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: showStreak ? [0, 0.3, 0] : 0 }}
        transition={{
          duration: phase === 'pan-through' ? 0.58 : 0.62,
          times: [0, 0.4, 1],
          ease: 'easeInOut',
        }}
        className="absolute inset-0"
        style={{
          background:
            panDirection === 1
              ? 'linear-gradient(96deg, rgba(255, 241, 238, 0) 15%, rgba(255, 217, 208, 0.14) 44%, rgba(255, 241, 238, 0.08) 58%, rgba(255, 241, 238, 0) 85%)'
              : 'linear-gradient(264deg, rgba(255, 241, 238, 0) 15%, rgba(255, 217, 208, 0.14) 44%, rgba(255, 241, 238, 0.08) 58%, rgba(255, 241, 238, 0) 85%)',
        }}
      />
    </div>
  );
}

