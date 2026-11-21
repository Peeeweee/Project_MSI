import { useEffect, useRef, useState } from 'react';
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';

interface IntroOverlayProps {
  active: boolean;
  onComplete: () => void;
}

const INTRO_TITLE = 'MUSCULAR SYSTEM';

function AnimatedCounter({
  to,
  suffix = '',
  duration = 1.15,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  const [text, setText] = useState(`0${suffix}`);

  useEffect(() => {
    const controls = animate(mv, to, {
      duration,
      delay: 0.25,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = rounded.on('change', (latest) => setText(latest));
    return () => {
      controls.stop();
      unsub();
    };
  }, [duration, mv, rounded, to]);

  return <span className="font-mono-num">{text}</span>;
}

/**
 * 2-second micro-intro on first dashboard load:
 * - Assembles the "MUSCULAR SYSTEM" title letters with staggered 3D motion.
 * - Plays spring-eased animated counters (4 Regions, 4 Presenters, 100% Map).
 * - Immediately skippable with any key press or click.
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

    const timer = window.setTimeout(() => onCompleteRef.current(), 2000);

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
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-[#2b0606]/78 p-6 backdrop-blur-md"
        >
          <motion.img
            src="./favicon.svg?v=5"
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.75, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="mb-3 h-12 w-12 rounded-2xl shadow-xl"
          />

          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="font-mono-num mb-3 rounded-full border border-[#ffd9d0]/25 bg-[#3b0a0a]/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffd9d0]"
          >
            Comparative Vertebrate Anatomy
          </motion.span>

          {/* Assembling Title Letters */}
          <motion.h1
            aria-label={INTRO_TITLE}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.032, delayChildren: 0.06 },
              },
            }}
            className="font-display flex flex-wrap justify-center text-center text-3xl font-semibold tracking-[0.14em] text-[#fff1ee] sm:text-5xl"
          >
            {INTRO_TITLE.split('').map((ch, idx) => (
              <motion.span
                key={idx}
                aria-hidden="true"
                variants={{
                  hidden: {
                    opacity: 0,
                    y: idx % 2 === 0 ? -22 : 22,
                    scale: 0.82,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: 'spring',
                      stiffness: 280,
                      damping: 22,
                    },
                  },
                }}
                className="inline-block"
              >
                {ch === ' ' ? '\u00A0' : ch}
              </motion.span>
            ))}
          </motion.h1>

          {/* Animated Counters */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.45 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-5 rounded-2xl border border-[#ffd9d0]/18 bg-[#3b0a0a]/75 px-6 py-3 text-center shadow-xl sm:gap-8"
          >
            <div>
              <div className="text-xl font-bold text-[#fff1ee] sm:text-2xl">
                <AnimatedCounter to={4} />
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#ffd9d0]/75">
                Sections
              </div>
            </div>

            <span className="h-7 w-px bg-[#ffd9d0]/16" aria-hidden="true" />

            <div>
              <div className="text-xl font-bold text-[#fff1ee] sm:text-2xl">
                <AnimatedCounter to={4} />
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#ffd9d0]/75">
                Presenters
              </div>
            </div>

            <span className="h-7 w-px bg-[#ffd9d0]/16" aria-hidden="true" />

            <div>
              <div className="text-xl font-bold text-[#fff1ee] sm:text-2xl">
                <AnimatedCounter to={100} suffix="%" />
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#ffd9d0]/75">
                Interactive Map
              </div>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.72 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            className="mt-6 text-[11px] font-medium tracking-wide text-[#ffd9d0]"
          >
            Press any key or click to skip
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

