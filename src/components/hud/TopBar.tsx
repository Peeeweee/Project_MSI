import { type MouseEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Box,
  Eye,
  EyeOff,
  GitCompareArrows,
  Keyboard,
  Map,
  QrCode,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  SECTION_BY_ID,
  SECTIONS,
  type Section,
  type SectionId,
} from '../../data/sections';
import type { EffectsPreset } from '../../hooks/useEffectsSettings';
import { HUD_SPRING, pickTransition } from '../../lib/springs';

export const TOP_BAR_HEIGHT = 44;
export type ViewMode = 'poster' | '3d';

interface TopBarProps {
  viewMode: ViewMode;
  activeSectionId: SectionId | null;
  hoveredSectionId: SectionId | null;
  sidebarVisible: boolean;
  scale: number;
  hudVisible: boolean;
  effectsOpen: boolean;
  compareOpen: boolean;
  qrOpen: boolean;
  effectsPreset: EffectsPreset | 'custom';
  onChangeViewMode: (mode: ViewMode) => void;
  onPreload3D?: () => void;
  onResetOverview: () => void;
  onHoverPill: (section: Section | null) => void;
  onSelectPill: (id: SectionId, clickPoint?: { x: number; y: number }) => void;
  onToggleCompare: () => void;
  onToggleQr: () => void;
  onToggleEffects: () => void;
  onToggleHud: () => void;
  onOpenShortcuts: () => void;
}

/**
 * Slim 44px glass-morphism top bar placed ABOVE <Stage> so it NEVER covers any
 * artwork content. Shares layoutId badges & titles with <SectionSidebar> for
 * seamless morphing between the overview pills and the sidebar header.
 */
export function TopBar({
  viewMode,
  activeSectionId,
  hoveredSectionId,
  sidebarVisible,
  scale,
  hudVisible,
  effectsOpen,
  compareOpen,
  qrOpen,
  effectsPreset,
  onChangeViewMode,
  onPreload3D,
  onResetOverview,
  onHoverPill,
  onSelectPill,
  onToggleCompare,
  onToggleQr,
  onToggleEffects,
  onToggleHud,
  onOpenShortcuts,
}: TopBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);
  const activeSection = activeSectionId ? SECTION_BY_ID[activeSectionId] : null;
  const zoomPercent = Math.round(scale * 100);
  const isZoomed = scale > 1.03 || activeSection !== null;

  if (!hudVisible) {
    return (
      <div className="pointer-events-none fixed right-3 top-3 z-40">
        <button
          type="button"
          onClick={onToggleHud}
          className="hud-pill hud-btn pointer-events-auto flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#ffd9d0] hover:bg-[#5c1212]/90 hover:text-[#fff1ee]"
          aria-label="Show interface (H)"
          title="Show controls (H)"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>HUD</span>
        </button>
      </div>
    );
  }

  return (
    <header
      style={{ height: TOP_BAR_HEIGHT }}
      className="hud-topbar relative z-30 flex w-full shrink-0 items-center justify-between gap-1.5 px-2.5 sm:gap-2 sm:px-5"
    >
      {/* Left: Slim title "MUSCULAR SYSTEM" + mode switcher */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={onResetOverview}
          className="hud-btn group flex shrink-0 items-center gap-1.5 rounded-full py-1 text-left focus-visible:outline-2 sm:gap-2"
          title="Return to full overview (Esc)"
        >
          <span
            className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border transition-all duration-200 group-hover:scale-105"
            style={{
              borderColor: activeSection
                ? `${activeSection.accent}cc`
                : 'rgba(255, 217, 208, 0.35)',
              boxShadow: activeSection
                ? `0 0 12px ${activeSection.accent}88`
                : '0 0 8px rgba(255, 217, 208, 0.22)',
            }}
          >
            <img
              src="./favicon.svg?v=5"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full select-none object-cover"
            />
          </span>
          <span className="font-display whitespace-nowrap text-xs font-semibold tracking-[0.06em] text-[#fff1ee] sm:hidden">
            MSI
          </span>
          <span className="font-display hidden whitespace-nowrap text-[13px] font-semibold tracking-[0.08em] text-[#fff1ee] sm:inline md:text-[15px] md:tracking-[0.14em]">
            MUSCULAR SYSTEM
          </span>
        </button>

        {/* Poster <-> 3D Visual Model segmented switcher */}
        <div
          role="group"
          aria-label="View mode"
          className="ml-0.5 flex shrink-0 items-center rounded-full border border-[#ffd9d0]/18 bg-[#240505]/85 p-0.5 sm:ml-1"
        >
          {(
            [
              { id: 'poster', label: 'Poster', shortLabel: 'Poster', Icon: Map },
              { id: '3d', label: '3D Model', shortLabel: '3D', Icon: Box },
            ] as const
          ).map(({ id, label, shortLabel, Icon }) => {
            const active = viewMode === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`mode-${id}`}
                aria-pressed={active}
                onMouseEnter={() => {
                  if (id === '3d') onPreload3D?.();
                }}
                onFocus={() => {
                  if (id === '3d') onPreload3D?.();
                }}
                onClick={() => onChangeViewMode(id)}
                className="hud-btn relative flex h-6 items-center gap-1 rounded-full px-2 text-[10.5px] font-semibold sm:text-[11px]"
                style={{
                  color: active ? '#3b0a0a' : '#ffd9d0',
                }}
                title={`Switch to ${label} mode (V)`}
              >
                {active && (
                  <motion.span
                    layoutId="view-mode-pill"
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-[#fff1ee]"
                  />
                )}
                <Icon className="relative z-10 h-3 w-3 shrink-0" />
                <span className="relative z-10 sm:hidden">{shortLabel}</span>
                <span className="relative z-10 hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {activeSection ? (
            <motion.span
              key={activeSection.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={transition}
              className="hidden items-center gap-1.5 border-l border-[#ffd9d0]/20 pl-2.5 text-xs whitespace-nowrap text-[#ffd9d0] 2xl:inline-flex"
            >
              <span className="font-semibold text-[#fff1ee]">
                {activeSection.name}
              </span>
              <span className="text-[#ffd9d0]">· {activeSection.owner}</span>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Right: 4 small numbered pills mirroring hotspots + compact utilities */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div
          role="group"
          aria-label="Quick section hotspots"
          className="hidden items-center gap-1 sm:flex sm:gap-1.5"
        >
          {SECTIONS.map((section) => {
            const isActive = activeSectionId === section.id;
            const isHovered = hoveredSectionId === section.id;
            // When this section is revealed in the sidebar, its layoutId lives there
            const morphedToSidebar = sidebarVisible && isActive;

            return (
              <button
                key={section.id}
                type="button"
                data-testid={`topbar-pill-${section.id}`}
                aria-label={`Zoom into ${section.name} musculature, prepared by ${section.owner}`}
                aria-pressed={isActive}
                onMouseEnter={() => onHoverPill(section)}
                onMouseLeave={() => onHoverPill(null)}
                onFocus={() => onHoverPill(section)}
                onBlur={() => onHoverPill(null)}
                onClick={(e: MouseEvent<HTMLButtonElement>) =>
                  onSelectPill(section.id, { x: e.clientX, y: e.clientY })
                }
                className="hud-btn relative flex h-7 items-center gap-1 rounded-full border px-1.5 text-xs font-semibold transition-colors sm:gap-1.5 sm:px-2.5"
                style={{
                  backgroundColor: isActive
                    ? `${section.accent}42`
                    : isHovered
                      ? `${section.accent}33`
                      : 'rgba(255, 241, 238, 0.06)',
                  borderColor: isActive
                    ? section.accent
                    : isHovered
                      ? section.accent
                      : 'rgba(255, 217, 208, 0.18)',
                  color: '#fff1ee',
                  boxShadow:
                    isActive || isHovered
                      ? `0 0 12px ${section.accent}55`
                      : 'none',
                }}
                title={`${section.n}. ${section.name} — Prepared by ${section.owner}`}
              >
                {morphedToSidebar ? (
                  <span
                    className="font-mono-num inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: section.accent,
                      color: section.badgeText,
                    }}
                  >
                    {section.n}
                  </span>
                ) : (
                  <motion.span
                    layoutId={`section-badge-${section.id}`}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="font-mono-num inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: section.accent,
                      color: section.badgeText,
                    }}
                  >
                    {section.n}
                  </motion.span>
                )}

                {morphedToSidebar ? (
                  <span className="hidden text-[11px] font-medium text-[#fff1ee]/85 xl:inline">
                    {section.name}
                  </span>
                ) : (
                  <motion.span
                    layoutId={`section-title-${section.id}`}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="hidden text-[11px] font-medium text-[#fff1ee]/90 xl:inline"
                  >
                    {section.name}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>

        <span
          aria-hidden="true"
          className="mx-0.5 hidden h-4 w-px bg-[#ffd9d0]/18 sm:block"
        />

        {viewMode === 'poster' && isZoomed && (
          <button
            type="button"
            onClick={onResetOverview}
            className="hud-btn hidden h-7 items-center gap-1 rounded-full border border-[#ffd9d0]/20 bg-[#fff1ee]/8 px-2.5 text-[11px] font-medium text-[#fff1ee] hover:bg-[#fff1ee]/15 sm:flex"
            title="Reset to overview (Esc)"
          >
            <RotateCcw className="h-3 w-3 text-[#ffd9d0]" />
            <span className="font-mono-num">{zoomPercent}%</span>
          </button>
        )}

        {/* #4: Evolutionary Homology Comparison modal trigger */}
        <button
          type="button"
          data-testid="compare-trigger"
          aria-expanded={compareOpen}
          aria-label="Evolutionary homology comparison"
          onClick={onToggleCompare}
          className="hud-btn flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: compareOpen
              ? 'rgba(255, 241, 238, 0.18)'
              : 'rgba(255, 241, 238, 0.06)',
            borderColor: compareOpen
              ? 'rgba(255, 217, 208, 0.45)'
              : 'rgba(255, 217, 208, 0.18)',
            color: '#fff1ee',
          }}
          title="Evolution Comparison: Fish vs. Amphibian vs. Reptile/Bird vs. Mammal (C)"
        >
          <GitCompareArrows className="h-3.5 w-3.5 text-[#ffd9d0]" />
          <span className="hidden md:inline">Compare</span>
        </button>

        {/* #5: Mobile Classroom Companion QR Code trigger (kept in top bar, off the home canvas) */}
        <button
          type="button"
          data-testid="qr-trigger"
          aria-expanded={qrOpen}
          aria-label="Mobile QR code companion"
          onClick={onToggleQr}
          className="hud-btn flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: qrOpen
              ? 'rgba(255, 241, 238, 0.18)'
              : 'rgba(255, 241, 238, 0.06)',
            borderColor: qrOpen
              ? 'rgba(255, 217, 208, 0.45)'
              : 'rgba(255, 217, 208, 0.18)',
            color: '#fff1ee',
          }}
          title="Mobile QR Code Companion (Q)"
        >
          <QrCode className="h-3.5 w-3.5 text-[#ffd9d0]" />
          <span className="hidden lg:inline">QR</span>
        </button>

        <button
          type="button"
          data-testid="effects-trigger"
          aria-expanded={effectsOpen}
          aria-label="Visual effects settings"
          onClick={onToggleEffects}
          className="hud-btn flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: effectsOpen
              ? 'rgba(255, 241, 238, 0.16)'
              : 'rgba(255, 241, 238, 0.05)',
            borderColor: effectsOpen
              ? 'rgba(255, 217, 208, 0.42)'
              : 'rgba(255, 217, 208, 0.16)',
            color: '#fff1ee',
          }}
          title="Effects: Full / Lite / Off"
        >
          <SlidersHorizontal className="h-3 w-3 text-[#ffd9d0]" />
          <span className="hidden capitalize sm:inline">{effectsPreset}</span>
        </button>

        <button
          type="button"
          onClick={onOpenShortcuts}
          className="hud-btn hidden h-7 w-7 items-center justify-center rounded-full text-[#ffd9d0]/80 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee] sm:flex"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleHud}
          className="hud-btn flex h-7 w-7 items-center justify-center rounded-full text-[#ffd9d0]/80 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]"
          aria-label="Hide interface (H)"
          title="Clean presentation view (H)"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
