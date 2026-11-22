import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import type { Section, SectionSubZone } from '../../data/sections';
import { HUD_SPRING, pickTransition } from '../../lib/springs';

interface SectionNavPadProps {
  section: Section | null;
  activeSubZoneId: string | null;
  activeSubZone: SectionSubZone | null;
  visible: boolean;
  sidebarCollapsed: boolean;
  isCustomView: boolean;
  onPan: (dx: number, dy: number) => void;
  onSelectSubZone: (subZoneId: string | null) => void;
  onFocusCardBbox?: (bbox: readonly [number, number, number, number]) => void;
  onPrevSubZone: () => void;
  onNextSubZone: () => void;
  onResetView: () => void;
}

const TAP_PAN_STEP = 220;
const HOLD_PAN_STEP = 155;
const HOLD_INTERVAL_MS = 140;

/**
 * Classroom-TV & Mobile 2-Level Sub-Part Navigation Controls for Poster Mode:
 * - Top-center floating Level-2 Sub-Part Breadcrumb & Step-Through Bar when zoomed into a sub-part
 *   ([← Full Section] | [‹] 2.4 · Forelimb (4-Source Tetrapods) [›])
 * - Bottom-center numbered sub-part dock (Full + 1.1..1.6 / 2.1..2.7 / 3.1..3.5 / 4.1..4.8)
 * - Bottom-right 4-way arrow D-pad (tap or press-and-hold) + center reset button
 */
export function SectionNavPad({
  section,
  activeSubZoneId,
  activeSubZone,
  visible,
  sidebarCollapsed,
  isCustomView,
  onPan,
  onSelectSubZone,
  onFocusCardBbox,
  onPrevSubZone,
  onNextSubZone,
  onResetView,
}: SectionNavPadProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const pointerTriggeredRef = useRef(false);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const stopHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    stopHold();
  }, [section?.id, stopHold]);

  useEffect(() => stopHold, [stopHold]);

  // Keep active sub-part pill centered inside the horizontal bottom dock
  useEffect(() => {
    setActiveCardId(null);
    if (!activeSubZoneId) return;
    const btn = pillRefs.current[activeSubZoneId];
    if (btn && typeof btn.scrollIntoView === 'function') {
      btn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeSubZoneId]);

  const startPanHold = useCallback(
    (dirX: number, dirY: number) => {
      stopHold();
      pointerTriggeredRef.current = true;
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
      onPan(dirX * TAP_PAN_STEP, dirY * TAP_PAN_STEP);
    },
    [onPan],
  );

  const show = Boolean(visible && section);
  const activeSubIndex =
    section && activeSubZoneId
      ? section.subZones.findIndex((z) => z.id === activeSubZoneId)
      : -1;

  return (
    <AnimatePresence>
      {show && section && (
        <>
          {/* Top-center Level-2 Sub-Part Navigator Banner (only shown for sections with sub-parts, i.e. Jenny's Appendicular section) */}
          {section.subZones.length > 0 && (
            <motion.div
              key="subzone-top-navigator"
              data-testid="subzone-top-navigator"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={transition}
            style={
              {
                '--desktop-left': sidebarCollapsed ? '60px' : '256px',
              } as React.CSSProperties
            }
            className="pointer-events-none fixed inset-x-2 top-[52px] z-30 flex flex-col items-center gap-1 px-1 lg:right-4 lg:left-[var(--desktop-left)]"
          >
            {activeSubZone ? (
              <>
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="hud-glass pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 shadow-xl"
                  style={{
                    borderColor: `${section.accent}66`,
                    boxShadow: `0 12px 28px -8px rgba(10, 1, 1, 0.78), 0 0 18px -6px ${section.accent}44`,
                  }}
                >
                  {/* 1-click Back to Full Section button */}
                  <button
                    type="button"
                    data-testid="subzone-back-to-section"
                    onClick={() => onSelectSubZone(null)}
                    className="hud-btn flex shrink-0 items-center gap-1 rounded-full bg-[#fff1ee] px-2.5 py-1 text-[11px] font-bold text-[#240505] shadow-sm hover:bg-[#ffd9d0]"
                    title={`Zoom back out to full ${section.name} section (Esc)`}
                  >
                    <Minimize2 className="h-3 w-3" />
                    <span>Full {section.name}</span>
                  </button>

                  <span
                    aria-hidden="true"
                    className="h-4 w-px shrink-0 bg-[#ffd9d0]/20"
                  />

                  {/* Prev Sub-Part */}
                  <button
                    type="button"
                    data-testid="subzone-prev-btn"
                    onClick={onPrevSubZone}
                    className="hud-btn flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#ffd9d0] hover:bg-[#fff1ee]/14 hover:text-[#fff1ee]"
                    aria-label="Previous sub-part"
                    title="Previous sub-part"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  {/* Active Sub-Part Badge + Title + Counter */}
                  <div className="flex min-w-0 items-center gap-1.5 px-1">
                    <span
                      className="font-mono-num shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: section.accent,
                        color: section.badgeText,
                      }}
                    >
                      {activeSubZone.code}
                    </span>
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-[11.5px] font-semibold text-[#fff1ee]">
                        {activeSubZone.label}
                      </span>
                      <span className="hidden truncate text-[9.5px] text-[#ffd9d0]/75 sm:block">
                        {activeSubZone.detail}
                      </span>
                    </div>
                    <span className="font-mono-num hidden shrink-0 rounded bg-[#2a0707]/85 px-1.5 py-0.5 text-[9.5px] text-[#ffd9d0]/75 md:inline-block">
                      {activeSubIndex + 1}/{section.subZones.length}
                    </span>
                  </div>

                  {/* Next Sub-Part */}
                  <button
                    type="button"
                    data-testid="subzone-next-btn"
                    onClick={onNextSubZone}
                    className="hud-btn flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#ffd9d0] hover:bg-[#fff1ee]/14 hover:text-[#fff1ee]"
                    aria-label="Next sub-part"
                    title="Next sub-part"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Level-3 Individual Animal Specimen Card Zoom Pills (e.g. Amphibians / Reptiles / Avians / Mammals / Ungulates) */}
                {activeSubZone.cards && activeSubZone.cards.length > 0 && onFocusCardBbox && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="hud-glass pointer-events-auto flex items-center gap-1 rounded-full border border-[#ffd9d0]/20 px-2 py-0.5 text-[10.5px] shadow-lg"
                  >
                    <span className="px-1 text-[9.5px] font-semibold tracking-wider text-[#ffd9d0]/65 uppercase">
                      Zoom Card:
                    </span>
                    <button
                      type="button"
                      data-testid="subzone-card-all"
                      onClick={() => {
                        setActiveCardId(null);
                        onSelectSubZone(activeSubZone.id);
                      }}
                      className={`hud-btn rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        activeCardId === null
                          ? 'bg-[#fff1ee] text-[#240505]'
                          : 'text-[#ffd9d0]/85 hover:bg-[#fff1ee]/12'
                      }`}
                    >
                      All ({activeSubZone.cards.length})
                    </button>
                    {activeSubZone.cards.map((card) => {
                      const isCardActive = activeCardId === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          data-testid={`subzone-card-${card.id}`}
                          onClick={() => {
                            if (isCardActive) {
                              setActiveCardId(null);
                              onSelectSubZone(activeSubZone.id);
                            } else {
                              setActiveCardId(card.id);
                              onFocusCardBbox(card.bbox);
                            }
                          }}
                          className={`hud-btn rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isCardActive
                              ? 'shadow-sm'
                              : 'text-[#ffd9d0]/90 hover:bg-[#fff1ee]/12'
                          }`}
                          style={
                            isCardActive
                              ? {
                                  backgroundColor: section.accent,
                                  color: section.badgeText,
                                }
                              : undefined
                          }
                        >
                          {card.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* Subtle Level-1 helper pill letting users know they can click any numbered sub-part on the poster */
              <div
                onClick={(e) => e.stopPropagation()}
                className="hud-glass pointer-events-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] text-[#ffd9d0]/85 shadow-md"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: section.accent }}
                />
                <span>
                  Click any{' '}
                  <strong className="font-semibold text-[#fff1ee]">
                    {section.n}.1–{section.n}.{section.subZones.length} sub-part
                  </strong>{' '}
                  on the poster or below to zoom in
                </span>
                <button
                  type="button"
                  data-testid="subzone-start-tour-btn"
                  onClick={onNextSubZone}
                  className="hud-btn ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: section.accent,
                    color: section.badgeText,
                  }}
                >
                  Start {section.n}.1 →
                </button>
              </div>
            )}
            </motion.div>
          )}

          {/* Bottom-center quick sub-zone jump bar (sits cleanly above mobile bottom sheet on <1024px) */}
          {section.subZones.length > 0 && (
            <motion.div
              key="section-subzone-bar"
              data-testid="section-subzone-bar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={transition}
              style={
                {
                  '--desktop-left': sidebarCollapsed ? '60px' : '256px',
                } as React.CSSProperties
              }
              className="pointer-events-none fixed inset-x-2 bottom-[88px] z-30 flex justify-center px-1 lg:right-[112px] lg:bottom-2.5 lg:left-[var(--desktop-left)] lg:px-2"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="hud-glass touch-scroll-x pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full px-1.5 py-1 shadow-lg"
                role="toolbar"
                aria-label={`${section.name} sub-parts (${section.subZones.length} parts)`}
              >
                <button
                  type="button"
                  data-testid="subzone-full-btn"
                  onClick={() => onResetView()}
                  aria-pressed={activeSubZoneId === null && !isCustomView}
                  className={`hud-btn shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    activeSubZoneId === null && !isCustomView
                      ? 'bg-[#fff1ee] text-[#240505] shadow-sm'
                      : 'text-[#ffd9d0]/85 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]'
                  }`}
                >
                  Full ({section.subZones.length})
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
                      ref={(el) => {
                        pillRefs.current[zone.id] = el;
                      }}
                      type="button"
                      data-testid={`subzone-${zone.id}`}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectSubZone(isActive ? null : zone.id);
                      }}
                      aria-pressed={isActive}
                      title={`${zone.code} ${zone.label} — ${zone.detail}`}
                      className={`hud-btn flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
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
                      <span
                        className={`font-mono-num text-[10px] font-bold ${
                          isActive ? 'opacity-95' : 'opacity-70'
                        }`}
                      >
                        {zone.code}
                      </span>
                      <span>{zone.label}</span>
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
              onClick={() => onResetView()}
              className={`hud-btn flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                isCustomView || activeSubZoneId !== null
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
