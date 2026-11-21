import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export interface ClickRippleItem {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface ClickRippleProps {
  ripples: ClickRippleItem[];
}

/**
 * Expanding concentric ripple ring launched at the exact click point right
 * before / as the camera flies into a section.
 */
export function ClickRipple({ ripples }: ClickRippleProps) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="fixed"
            style={{ left: ripple.x, top: ripple.y }}
          >
            {/* Primary expanding crisp ring */}
            <motion.span
              initial={{ scale: 0.2, opacity: 0.95 }}
              animate={{ scale: 3.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
              style={{
                borderColor: ripple.color,
                boxShadow: `0 0 18px ${ripple.color}88`,
              }}
              className="block -ml-6 -mt-6 h-12 w-12 rounded-full border-2"
            />
            {/* Secondary trailing warm-cream ring */}
            <motion.span
              initial={{ scale: 0.15, opacity: 0.7 }}
              animate={{ scale: 2.3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.48,
                delay: 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute left-0 top-0 block -ml-6 -mt-6 h-12 w-12 rounded-full border border-[#fff1ee]/80"
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

