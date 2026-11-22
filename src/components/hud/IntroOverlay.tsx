import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SECTIONS } from '../../data/sections';

interface IntroOverlayProps {
  active: boolean;
  onComplete: () => void;
}

const INTRO_DURATION_MS = 1150;

/**
 * Quick, sleek 1.15-second cinematic title reveal on initial load:
 * - Animated orbital SVG ring around the anatomical striated muscle emblem
 * - Smooth optical reveal of "MUSCULAR SYSTEM" with expanding hairline beams
 * - Staggered 4-region color chips (no bulky counter boxes)
 * - Immediately skippable with any tap, click, or key press
 */
export function IntroOverlay({ active, onComplete }: IntroOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return;

    if (prefersReducedMotion) {
      onCompleteRef.current();
      return;
    }

    const timer = window.setTimeout(
      () => onCompleteRef.current(),
      INTRO_DURATION_MS,
    );

    const handleSkipKey = (e: KeyboardEvent) => {
      e.preventDefault();
      onCompleteRef.current();
    };

    window.addEventListener('keydown', handleSkipKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleSkipKey);
    };
  }, [active, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {active && !prefersReducedMotion && (
        <motion.div
          key="micro-intro-overlay"
          data-testid="intro-overlay"
          onClick={onComplete}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.03,
            filter: 'blur(6px)',
            pointerEvents: 'none',
          }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-[#180202]/80 p-6 backdrop-blur-lg"
        >
          {/* Ambient radial crimson-gold glow behind emblem */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1.15 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="pointer-events-none absolute h-64 w-64 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(220, 56, 56, 0.28) 0%, rgba(120, 18, 18, 0.1) 52%, transparent 75%)',
            }}
          />

          {/* Anatomical Muscle Emblem with Animated Orbital Ring */}
          <div className="relative mb-3.5 flex h-16 w-16 items-center justify-center">
            <svg
              viewBox="0 0 72 72"
              className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="36"
                cy="36"
                r="33"
                fill="none"
                stroke="rgba(255, 217, 208, 0.14)"
                strokeWidth="1.25"
              />
              <motion.circle
                cx="36"
                cy="36"
                r="33"
                fill="none"
                stroke="#ffd9d0"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeDasharray="208"
                initial={{ strokeDashoffset: 208, opacity: 0.4 }}
                animate={{ strokeDashoffset: 0, opacity: 0.9 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            <motion.img
              src="./favicon.svg?v=5"
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.68, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="h-11 w-11 rounded-2xl shadow-2xl"
            />
          </div>

          {/* Overline with expanding flanking beams */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.05 }}
            className="mb-2 flex items-center gap-2.5"
          >
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 28, opacity: 0.55 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="h-px bg-gradient-to-r from-transparent to-[#ffd9d0]"
            />
            <span className="font-mono-num text-[10px] font-semibold tracking-[0.26em] text-[#ffd9d0]/90 uppercase">
              Comparative Vertebrate Anatomy
            </span>
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 28, opacity: 0.55 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="h-px bg-gradient-to-l from-transparent to-[#ffd9d0]"
            />
          </motion.div>

          {/* Sleek Optical Title Reveal */}
          <motion.h1
            initial={{ opacity: 0, y: 10, scale: 0.96, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.38, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-center text-3xl font-semibold tracking-[0.16em] text-[#fff1ee] sm:text-5xl"
          >
            MUSCULAR SYSTEM
          </motion.h1>

          {/* Sweeping specular light underline */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.48, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2.5 h-px w-48 bg-gradient-to-r from-transparent via-[#ffd9d0]/70 to-transparent sm:w-64"
          />

          {/* 4 Staggered CVA Region Pills (replaces old 4-4 counter box) */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {SECTIONS.map((s, idx) => (
              <motion.span
                key={s.id}
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.26,
                  delay: 0.16 + idx * 0.045,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd9d0]/18 bg-[#2a0606]/85 px-2.5 py-1 text-[11px] font-medium text-[#fff1ee] shadow-md"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: s.accent,
                    boxShadow: `0 0 8px ${s.accent}`,
                  }}
                />
                <span>{s.name}</span>
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
