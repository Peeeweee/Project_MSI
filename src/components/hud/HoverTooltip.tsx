import { useEffect } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Section } from '../../data/sections';
import { clamp, type ViewportSize } from '../../lib/cameraMath';
import { HOVER_SPRING, pickTransition } from '../../lib/springs';

interface HoverTooltipProps {
  section: Section | null;
  position: { x: number; y: number } | null;
  viewport: ViewportSize;
  hudVisible: boolean;
  cardTiltEnabled: boolean;
}

const FOLLOW_SPRING = { stiffness: 250, damping: 24, mass: 0.72 };
const TILT_SPRING = { stiffness: 180, damping: 20, mass: 0.65 };

/**
 * Floating tooltip card attached to the cursor with spring-lag follow and
 * velocity-coupled 3D tilt toward the cursor movement direction.
 */
export function HoverTooltip({
  section,
  position,
  viewport,
  hudVisible,
  cardTiltEnabled,
}: HoverTooltipProps) {
  const prefersReducedMotion = useReducedMotion();
  const appearTransition = pickTransition(HOVER_SPRING, prefersReducedMotion);

  const visible = hudVisible && section !== null && position !== null;

  const cardW = 244;
  const cardH = 88;
  const rawX = (position?.x ?? 0) + 22;
  const rawY = (position?.y ?? 0) - cardH - 16;

  const clampedX = clamp(rawX, 14, Math.max(14, viewport.width - cardW - 14));
  const clampedY =
    rawY < 54
      ? clamp((position?.y ?? 0) + 24, 54, Math.max(54, viewport.height - cardH - 18))
      : clamp(rawY, 54, Math.max(54, viewport.height - cardH - 18));

  const targetX = useMotionValue(clampedX);
  const targetY = useMotionValue(clampedY);

  const smoothX = useSpring(targetX, FOLLOW_SPRING);
  const smoothY = useSpring(targetY, FOLLOW_SPRING);

  // 3D tilt toward cursor travel direction (derived from spring velocity)
  const vx = useVelocity(smoothX);
  const vy = useVelocity(smoothY);

  const rawRotateY = useTransform(vx, [-1600, 0, 1600], [-14, 0, 14], {
    clamp: true,
  });
  const rawRotateX = useTransform(vy, [-1600, 0, 1600], [12, 0, -12], {
    clamp: true,
  });

  const rotateY = useSpring(
    useTransform(rawRotateY, (deg) =>
      prefersReducedMotion || !cardTiltEnabled ? 0 : deg,
    ),
    TILT_SPRING,
  );
  const rotateX = useSpring(
    useTransform(rawRotateX, (deg) =>
      prefersReducedMotion || !cardTiltEnabled ? 0 : deg,
    ),
    TILT_SPRING,
  );

  // Snap immediately on first appearance so card never flies in from (0,0)
  useEffect(() => {
    if (!visible) return;
    if (prefersReducedMotion) {
      targetX.jump(clampedX);
      targetY.jump(clampedY);
      smoothX.jump(clampedX);
      smoothY.jump(clampedY);
    } else {
      targetX.set(clampedX);
      targetY.set(clampedY);
    }
  }, [clampedX, clampedY, prefersReducedMotion, smoothX, smoothY, targetX, targetY, visible]);

  // Snap starting coordinates when transitioning from hidden -> visible
  useEffect(() => {
    if (visible) {
      smoothX.jump(clampedX);
      smoothY.jump(clampedY);
      targetX.jump(clampedX);
      targetY.jump(clampedY);
    }
    // Intentionally triggers only when visibility flips on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      style={{ perspective: '850px' }}
    >
      <AnimatePresence>
        {visible && section && (
          <motion.div
            key="hover-tooltip-card"
            data-testid="hover-tooltip"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={appearTransition}
            style={{
              x: smoothX,
              y: smoothY,
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
            }}
            className="hud-glass fixed left-0 top-0 w-[244px] overflow-hidden rounded-2xl"
          >
            {/* Subtle section accent strip */}
            <div
              className="h-[3px] w-full"
              style={{ backgroundColor: section.accent }}
            />

            <div className="p-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="font-mono-num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm"
                  style={{
                    backgroundColor: section.accent,
                    color: section.badgeText,
                    boxShadow: `0 0 14px ${section.accent}66`,
                  }}
                >
                  {section.n}
                </span>

                <div className="min-w-0 leading-tight">
                  <div className="font-display truncate text-[16px] font-semibold tracking-tight text-[#fff1ee]">
                    {section.name}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-medium text-[#ffd9d0]">
                    Prepared by {section.owner}
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-[#ffd9d0]/16 pt-2 text-[11px] font-semibold">
                <span style={{ color: '#fff1ee' }}>Click to dive in</span>
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: section.accent,
                    color: section.badgeText,
                  }}
                >
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

