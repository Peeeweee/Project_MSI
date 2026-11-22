import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
} from 'lucide-react';
import type { Section } from '../../data/sections';
import { HUD_SPRING, pickTransition } from '../../lib/springs';

interface SectionNavPadProps {
  section: Section | null;
  visible: boolean;
  sidebarCollapsed: boolean;
  isCustomView: boolean;
  onPan: (dx: number, dy: number) => void;
  onFocusBbox: (bbox: readonly [number, number, number, number]) => void;
  onResetView: () => void;
}

const TAP_PAN_STEP = 220;
const HOLD_PAN_STEP = 155;
const HOLD_INTERVAL_MS = 140;

/**
 * Compact classroom-TV navigation controls for Poster Mode:
 * - Bottom-center slim sub-zone jump pills (e.g., Extrinsic Eye / Mandibular / Hyoid & Branchial)
 * - Bottom-right 4-way arrow D-pad (tap or press-and-hold) + center reset button
 */
export function SectionNavPad({
  section,
  visible,
  sidebarCollapsed,
  isCustomView,
  onPan,
  onFocusBbox,
  onResetView,
}: SectionNavPadProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);

  const [activeSubZoneId, setActiveSubZoneId] = useState<string | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const pointerTriggeredRef = useRef(false);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // Reset active sub-zone highlight when changing sections or returning to full section fit
  useEffect(() => {
    setActiveSubZoneId(null);
    stopHold();
  }, [section?.id, stopHold]);

  useEffect(() => {
    if (!isCustomView) {
      setActiveSubZoneId(null);
    }
  }, [isCustomView]);

  // Clear sub-zone pill highlight as soon as user pans manually with keyboard arrows / WASD
  useEffect(() => {
    if (!activeSubZoneId) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'w' ||
        e.key === 'W' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.key === 's' ||
        e.key === 'S' ||
        e.key === 'd' ||
        e.key === 'D'
      ) {
        setActiveSubZoneId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeSubZoneId]);

  useEffect(() => stopHold, [stopHold]);

  const startPanHold = useCallback(
    (dirX: number, dirY: number) => {
      stopHold();
      pointerTriggeredRef.current = true;
      setActiveSubZoneId(null);
      onPan(dirX * TAP_PAN_STEP, dirY * TAP_PAN_STEP);
      holdTimerRef.current = window.setInterval(() => {
        onPan(dirX * HOLD_PAN_STEP, dirY * HOLD_PAN_STEP);
      }, HOLD_INTERVAL_MS);
    },
    [onPan, stopHold],
  );

  const handleDirKeyboardClick = useCallback(
    (dirX: number, dirY: number) => {
      if (pointerTriggeredRef.current) {
        pointerTriggeredRef.current = false;
        return;
      }
      setActiveSubZoneId(null);
      onPan(dirX * TAP_PAN_STEP, dirY * TAP_PAN_STEP);
    },
    [onPan],
  );

  const show = Boolean(visible && section);

  return (
    <AnimatePresence>
      {show && section && (
        <>
          {/* Bottom-center quick sub-zone jump bar (sits cleanly above mobile bottom sheet on <1024px) */}
          {section.subZones.length > 0 && (
            <motion.div
              key="section-subzone-bar"
              data-testid="section-subzone-bar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={transition}
              style={{
                '--desktop-left': sidebarCollapsed ? '60px' : '256px',
              } as React.CSSProperties}
              className="pointer-events-none fixed inset-x-2 bottom-[88px] z-30 flex justify-center px-1 lg:right-[112px] lg:bottom-2.5 lg:left-[var(--desktop-left)] lg:px-2"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="hud-glass touch-scroll-x pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full px-1.5 py-1 shadow-lg"
                role="toolbar"
                aria-label={`${section.name} quick focus zones`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubZoneId(null);
                    onResetView();
                  }}
                  aria-pressed={activeSubZoneId === null && !isCustomView}
                  className={`hud-btn shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeSubZoneId === null && !isCustomView
                      ? 'bg-[#fff1ee] text-[#240505] shadow-sm'
                      : 'text-[#ffd9d0]/85 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]'
                  }`}
                >
                  Full
                </button>

                <span
                  aria-hidden="true"
                  className="mx-0.5 h-3.5 w-px shrink-0 bg-[#ffd9d0]/18"
                />

                {section.subZones.map((zone) => {
                  const isActive = activeSubZoneId === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      data-testid={`subzone-${zone.id}`}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setActiveSubZoneId(zone.id);
                        onFocusBbox(zone.bbox);
                      }}
                      aria-pressed={isActive}
                      className={`hud-btn shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                        isActive
                          ? 'shadow-sm'
                          : 'text-[#ffd9d0]/88 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]'
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor: section.accent,
                              color: section.badgeText,
                            }
                          : undefined
                      }
                    >
                      {zone.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Bottom-right compact 4-way directional pan D-pad (sits above sub-zone bar on mobile, bottom-right on desktop) */}
          <motion.div
            key="section-pan-dpad"
            data-testid="section-pan-dpad"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={transition}
            onClick={(e) => e.stopPropagation()}
            className="hud-glass pointer-events-auto fixed right-2.5 bottom-[132px] z-30 grid grid-cols-3 gap-0.5 rounded-2xl p-1 shadow-xl lg:right-3 lg:bottom-2.5"
            role="group"
            aria-label="Pan zoomed section with arrows"
          >
            <div />
            <button
              type="button"
              data-testid="dpad-up"
              onPointerDown={(e) => {
                e.stopPropagation();
                startPanHold(0, 1);
              }}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onClick={() => handleDirKeyboardClick(0, 1)}
              className="hud-btn flex h-7 w-7 items-center justify-center rounded-lg text-[#ffd9d0]/90 hover:bg-[#fff1ee]/14 hover:text-[#fff1ee] active:bg-[#fff1ee]/22"
              aria-label="Pan up"
              title="Pan up (↑ or W)"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <div />

            <button
              type="button"
              data-testid="dpad-left"
              onPointerDown={(e) => {
                e.stopPropagation();
                startPanHold(1, 0);
              }}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onClick={() => handleDirKeyboardClick(1, 0)}
              className="hud-btn flex h-7 w-7 items-center justify-center rounded-lg text-[#ffd9d0]/90 hover:bg-[#fff1ee]/14 hover:text-[#fff1ee] active:bg-[#fff1ee]/22"
              aria-label="Pan left"
              title="Pan left (← or A)"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              data-testid="dpad-reset"
              onClick={() => {
                setActiveSubZoneId(null);
                onResetView();
              }}
              className={`hud-btn flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                isCustomView
                  ? 'bg-[#fff1ee]/16 text-[#fff1ee] hover:bg-[#fff1ee]/24'
                  : 'text-[#ffd9d0]/55 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]'
              }`}
              aria-label="Reset section fit"
              title="Reset section fit"
            >
              <RotateCcw className="h-3 w-3" />
            </button>

            <button
              type="button"
              data-testid="dpad-right"
              onPointerDown={(e) => {
                e.stopPropagation();
                startPanHold(-1, 0);
              }}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onClick={() => handleDirKeyboardClick(-1, 0)}
              className="hud-btn flex h-7 w-7 items-center justify-center rounded-lg text-[#ffd9d0]/90 hover:bg-[#fff1ee]/14 hover:text-[#fff1ee] active:bg-[#fff1ee]/22"
              aria-label="Pan right"
              title="Pan right (→ or D)"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <div />
            <button
              type="button"
              data-testid="dpad-down"
              onPointerDown={(e) => {
                e.stopPropagation();
                startPanHold(0, -1);
              }}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              onClick={() => handleDirKeyboardClick(0, -1)}
              className="hud-btn flex h-7 w-7 items-center justify-center rounded-lg text-[#ffd9d0]/90 hover:bg-[#fff1ee]/14 hover:text-[#fff1ee] active:bg-[#fff1ee]/22"
              aria-label="Pan down"
              title="Pan down (↓ or S)"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <div />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
