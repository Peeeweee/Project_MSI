import { useEffect, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { Info, X } from 'lucide-react';
import type { Section } from '../../data/sections';
import { HUD_SPRING, pickTransition } from '../../lib/springs';
import { TiltCard } from './TiltCard';
import { TOP_BAR_HEIGHT } from './TopBar';

interface SummaryCardProps {
  section: Section | null;
  visible: boolean;
  sidebarCollapsed?: boolean;
  cardTiltEnabled: boolean;
  /** Layer 3 (foreground floating HUD) parallax input */
  depthX: MotionValue<number>;
  depthY: MotionValue<number>;
  parallaxEnabled: boolean;
}

const AUTO_COLLAPSE_MS = 6000;

/**
 * Glass-morphism section summary card floating at the top of the open artwork
 * area with a soft Z-depth shadow, 3D specular card tilt, Layer 3 foreground
 * parallax, and 6-second auto-collapse into a clickable "Info" chip.
 */
export function SummaryCard({
  section,
  visible,
  sidebarCollapsed = true,
  cardTiltEnabled,
  depthX,
  depthY,
  parallaxEnabled,
}: SummaryCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);
  const [collapsed, setCollapsed] = useState(false);

  // Layer 3 (foreground) parallax moves gently WITH pointer (opposite background glow)
  const hudShiftX = useTransform(depthX, (v) =>
    parallaxEnabled && !prefersReducedMotion ? v * 5 : 0,
  );
  const hudShiftY = useTransform(depthY, (v) =>
    parallaxEnabled && !prefersReducedMotion ? v * 3.5 : 0,
  );

  useEffect(() => {
    if (!visible || !section) {
      setCollapsed(false);
      return;
    }

    setCollapsed(false);
    const timer = window.setTimeout(() => {
      setCollapsed(true);
    }, AUTO_COLLAPSE_MS);

    return () => window.clearTimeout(timer);
  }, [section?.id, visible, section]);

  return (
    <motion.div
      style={{
        top: TOP_BAR_HEIGHT + 12,
        left: 0,
        x: hudShiftX,
        y: hudShiftY,
      }}
      className={`pointer-events-none fixed right-0 z-30 flex justify-center px-3 ${
        sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[260px]'
      }`}
    >
      <AnimatePresence mode="wait">
        {visible && section && (
          <motion.div
            key={`summary-wrap-${section.id}`}
            data-testid="summary-card-container"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={transition}
            className="pointer-events-auto"
          >
            {collapsed ? (
              <motion.button
                key="info-chip"
                layout
                type="button"
                data-testid="summary-info-chip"
                onClick={() => setCollapsed(false)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={transition}
                style={{
                  boxShadow:
                    '0 14px 30px -8px rgba(12, 2, 2, 0.68), inset 0 1px 0 rgba(255, 241, 238, 0.16)',
                }}
                className="hud-pill hud-btn flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#fff1ee] hover:border-[#ffd9d0]/35 hover:bg-[#5c1212]/90"
                title="Expand section summary"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: section.accent }}
                />
                <Info className="h-3.5 w-3.5 text-[#ffd9d0]" />
                <span>Info</span>
              </motion.button>
            ) : (
              <motion.div
                key="summary-expanded"
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={transition}
              >
                <TiltCard
                  enabled={cardTiltEnabled}
                  maxTilt={5}
                  data-testid="summary-card-expanded"
                  style={{
                    boxShadow:
                      '0 22px 44px -10px rgba(10, 1, 1, 0.74), 0 6px 16px -4px rgba(10, 1, 1, 0.5), inset 0 1px 0 rgba(255, 241, 238, 0.16)',
                  }}
                  className="hud-glass relative max-w-[calc(100vw-24px)] rounded-2xl px-4 py-2.5 md:max-w-[540px]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: section.accent,
                        boxShadow: `0 0 10px ${section.accent}`,
                      }}
                    />
                    <p className="text-xs leading-relaxed text-[#fff1ee]/95 sm:text-[13px]">
                      {section.summary}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCollapsed(true)}
                      className="hud-btn -mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#ffd9d0]/70 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]"
                      aria-label="Collapse summary to info chip"
                      title="Collapse to Info chip"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Subtle 6s auto-collapse progress hairline */}
                  {!prefersReducedMotion && (
                    <motion.div
                      key={`progress-${section.id}`}
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: 0 }}
                      transition={{
                        duration: AUTO_COLLAPSE_MS / 1000,
                        ease: 'linear',
                      }}
                      style={{
                        originX: 0,
                        backgroundColor: section.accent,
                      }}
                      className="absolute inset-x-0 bottom-0 h-[2px] opacity-65"
                    />
                  )}
                </TiltCard>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
