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
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Section, SectionSubZone } from '../../data/sections';
import { clamp, type ViewportSize } from '../../lib/cameraMath';
import { HOVER_SPRING, pickTransition } from '../../lib/springs';

interface HoverTooltipProps {
  section: Section | null;
  subZone?: SectionSubZone | null;
  isSubZoneActive?: boolean;
  position: { x: number; y: number } | null;
  viewport: ViewportSize;
  hudVisible: boolean;
  cardTiltEnabled: boolean;
}

const FOLLOW_SPRING = { stiffness: 320, damping: 26, mass: 0.55 };
const TILT_SPRING = { stiffness: 210, damping: 22, mass: 0.55 };

/**
 * Compact, modern floating capsule tooltip attached to the cursor with
 * spring-lag follow, subtle accent aura, and velocity-coupled 3D micro-tilt.
 * Supports both Level-1 main sections and Level-2 sub-parts.
 */
export function HoverTooltip({
  section,
  subZone = null,
  isSubZoneActive = false,
  position,
  viewport,
  hudVisible,
  cardTiltEnabled,
}: HoverTooltipProps) {
  const prefersReducedMotion = useReducedMotion();
  const appearTransition = pickTransition(HOVER_SPRING, prefersReducedMotion);

  const visible =
    hudVisible && (section !== null || subZone !== null) && position !== null;

  const pillW = subZone ? 270 : 210;
  const pillH = 38;
  const rawX = (position?.x ?? 0) + 16;
  const rawY = (position?.y ?? 0) - pillH - 12;

  const clampedX = clamp(rawX, 12, Math.max(12, viewport.width - pillW - 12));
  const clampedY =
    rawY < 52
      ? clamp((position?.y ?? 0) + 18, 52, Math.max(52, viewport.height - pillH - 14))
      : clamp(rawY, 52, Math.max(52, viewport.height - pillH - 14));

  const targetX = useMotionValue(clampedX);
  const targetY = useMotionValue(clampedY);

  const smoothX = useSpring(targetX, FOLLOW_SPRING);
  const smoothY = useSpring(targetY, FOLLOW_SPRING);

  const vx = useVelocity(smoothX);
  const vy = useVelocity(smoothY);

  const rawRotateY = useTransform(vx, [-1600, 0, 1600], [-10, 0, 10], {
    clamp: true,
  });
  const rawRotateX = useTransform(vy, [-1600, 0, 1600], [8, 0, -8], {
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

  useEffect(() => {
    if (visible) {
      smoothX.jump(clampedX);
      smoothY.jump(clampedY);
      targetX.jump(clampedX);
      targetY.jump(clampedY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const accent = section?.accent ?? '#f59e0b';
  const badgeText = section?.badgeText ?? '#2a1200';

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
            initial={{ opacity: 0, scale: 0.88, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 2 }}
            transition={appearTransition}
            style={{
              x: smoothX,
              y: smoothY,
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
              borderColor: `${accent}66`,
              boxShadow: `0 10px 26px -6px rgba(10, 1, 1, 0.72), 0 0 18px -4px ${accent}55, inset 0 1px 0 rgba(255, 241, 238, 0.14)`,
            }}
            className="fixed left-0 top-0 inline-flex items-center gap-2 rounded-full border bg-[#190303]/92 py-1 pr-2 pl-1.5 backdrop-blur-md"
          >
            {/* Glowing index or sub-part code badge */}
            <span
              className="font-mono-num flex h-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
              style={{
                minWidth: '20px',
                backgroundColor: accent,
                color: badgeText,
                boxShadow: `0 0 10px ${accent}80`,
              }}
            >
              {subZone ? subZone.code : section.n}
            </span>

            {/* Crisp inline title + presenter/detail chip */}
            {subZone ? (
              <div className="flex flex-col leading-tight whitespace-nowrap">
                <span className="font-display text-[12px] font-semibold tracking-tight text-[#fff1ee]">
                  {subZone.label}
                </span>
                <span className="max-w-[215px] truncate text-[9.5px] text-[#ffd9d0]/75">
                  {subZone.detail}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="font-display text-[13px] font-semibold tracking-tight text-[#fff1ee]">
                  {section.name}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[10px] text-[#ffd9d0]/40"
                >
                  ·
                </span>
                <span className="text-[11px] font-medium text-[#ffd9d0]/80">
                  {section.owner}
                </span>
              </div>
            )}

            {/* Micro action pill */}
            <span
              className="ml-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide uppercase"
              style={{
                backgroundColor: `${accent}28`,
                color: '#fff1ee',
                border: `1px solid ${accent}55`,
              }}
            >
              {subZone ? (isSubZoneActive ? 'Zoom Out' : 'Zoom In') : 'View'}
              {subZone && isSubZoneActive ? (
                <ArrowDownLeft className="h-2.5 w-2.5" />
              ) : (
                <ArrowUpRight className="h-2.5 w-2.5" />
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
