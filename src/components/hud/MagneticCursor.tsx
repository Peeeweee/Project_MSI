import { useEffect, useState } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import type { Section } from '../../data/sections';

interface MagneticCursorProps {
  /** Active only on overview when fine pointer is present */
  enabled: boolean;
  /** Currently hovered section (expands ring & applies accent glow) */
  hoveredSection: Section | null;
}

/**
 * Custom magnetic ring cursor that tracks the pointer with spring physics
 * and expands smoothly when hovering over interactive hotspots.
 */
export function MagneticCursor({
  enabled,
  hoveredSection,
}: MagneticCursorProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hasFinePointer, setHasFinePointer] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const ringX = useSpring(mouseX, { stiffness: 260, damping: 26, mass: 0.6 });
  const ringY = useSpring(mouseY, { stiffness: 260, damping: 26, mass: 0.6 });

  const dotX = useSpring(mouseX, { stiffness: 620, damping: 38, mass: 0.35 });
  const dotY = useSpring(mouseY, { stiffness: 620, damping: 38, mass: 0.35 });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: fine)');
    const update = () => setHasFinePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled || !hasFinePointer || prefersReducedMotion) {
      setVisible(false);
      return;
    }

    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setVisible(true);
    };

    const handleLeave = () => setVisible(false);
    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);

    window.addEventListener('pointermove', handleMove, { passive: true });
    document.addEventListener('pointerleave', handleLeave);
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [enabled, hasFinePointer, mouseX, mouseY, prefersReducedMotion]);

  if (!enabled || !hasFinePointer || prefersReducedMotion || !visible) {
    return null;
  }

  const isExpanded = hoveredSection !== null;
  const ringColor = hoveredSection?.accent ?? '#fff1ee';
  const targetScale = pressed ? 0.84 : isExpanded ? 1.45 : 1;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {/* Outer magnetic ring */}
      <motion.div
        data-testid="magnetic-cursor-ring"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          borderColor: ringColor,
          boxShadow: isExpanded
            ? `0 0 18px ${ringColor}66, inset 0 0 10px ${ringColor}28`
            : '0 0 10px rgba(59, 10, 10, 0.35)',
          backgroundColor: isExpanded ? `${ringColor}14` : 'transparent',
        }}
        animate={{
          scale: targetScale,
          opacity: isExpanded ? 0.95 : 0.72,
        }}
        transition={{
          type: 'spring',
          stiffness: 340,
          damping: 26,
        }}
        className="fixed left-0 top-0 h-6 w-6 rounded-full border-[1.75px]"
      />

      {/* Precision center dot */}
      <motion.div
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%',
          backgroundColor: isExpanded ? ringColor : '#fff1ee',
        }}
        animate={{
          scale: pressed ? 0.7 : isExpanded ? 1.15 : 1,
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full shadow-sm"
      />
    </div>
  );
}

