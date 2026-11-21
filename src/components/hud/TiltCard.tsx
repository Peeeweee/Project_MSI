import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';

interface TiltCardProps {
  children: ReactNode;
  enabled?: boolean;
  maxTilt?: number;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}

const TILT_SPRING = { stiffness: 260, damping: 24, mass: 0.7 };

/**
 * Reusable 3D-tilting glass HUD card wrapper with a soft specular highlight
 * that tracks the cursor smoothly across the card surface.
 */
export function TiltCard({
  children,
  enabled = true,
  maxTilt = 6.5,
  className = '',
  style,
  'data-testid': testId,
}: TiltCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const active = enabled && !prefersReducedMotion;
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovering, setHovering] = useState(false);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const smoothGlareX = useSpring(glareX, TILT_SPRING);
  const smoothGlareY = useSpring(glareY, TILT_SPRING);

  const specularBg = useMotionTemplate`radial-gradient(210px circle at ${smoothGlareX}% ${smoothGlareY}%, rgba(255, 241, 238, 0.22), rgba(255, 217, 208, 0.06) 45%, transparent 72%)`;

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!active || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const v = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));

    rawRotateY.set((u - 0.5) * 2 * maxTilt);
    rawRotateX.set(-(v - 0.5) * 2 * maxTilt);
    glareX.set(u * 100);
    glareY.set(v * 100);
  };

  const handleLeave = () => {
    setHovering(false);
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  return (
    <div style={{ perspective: '900px' }}>
      <motion.div
        ref={ref}
        data-testid={testId}
        onMouseEnter={() => active && setHovering(true)}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{
          ...style,
          rotateX: active ? rotateX : 0,
          rotateY: active ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        className={`relative overflow-hidden ${className}`}
      >
        {children}

        {/* Moving specular highlight following the cursor */}
        {active && (
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={{ opacity: hovering ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: specularBg }}
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
          />
        )}
      </motion.div>
    </div>
  );
}

