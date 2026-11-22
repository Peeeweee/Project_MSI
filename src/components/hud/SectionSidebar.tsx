import { useRef, useState, type MouseEvent } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Expand,
  Focus,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  buildWorldClipPath,
  FULL_MAP_DISPLAY_1200,
  SECTIONS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Section,
  type SectionId,
} from '../../data/sections';
import {
  computeBaseMetrics,
  MAX_SCALE,
  MIN_SCALE,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_DESKTOP,
  type CameraState,
  type ViewportSize,
} from '../../lib/cameraMath';
import type { LoadedCropMeta } from '../../lib/preload';
import { OwnerBadge } from './OwnerBadge';
import { TiltCard } from './TiltCard';
import { TOP_BAR_HEIGHT } from './TopBar';

interface SectionSidebarProps {
  section: Section | null;
  visible: boolean;
  collapsed: boolean;
  camera: CameraState;
  stageViewport: ViewportSize;
  isCustomView: boolean;
  isolateActive: boolean;
  cardTiltEnabled: boolean;
  ownerBadgeEnabled: boolean;
  loadedCropMeta?: LoadedCropMeta;
  onToggleCollapsed: () => void;
  onSelectSection: (id: SectionId) => void;
  onPrev: () => void;
  onNext: () => void;
  onBackOverview: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleIsolate: () => void;
  onOpenCropLightbox: () => void;
  onHoverSound?: () => void;
}

const sidebarContainerVariants: Variants = {
  hidden: {
    x: -SIDEBAR_WIDTH_DESKTOP - 16,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 250,
      damping: 28,
      mass: 0.9,
      when: 'beforeChildren',
      delayChildren: 0.04,
      staggerChildren: 0.06,
    },
  },
  exit: {
    x: -SIDEBAR_WIDTH_DESKTOP - 16,
    opacity: 0,
    transition: {
      duration: 0.24,
      ease: [0.32, 0, 0.24, 1],
    },
  },
};

const contentOrchestratorVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.14 },
  },
};

const titleLettersContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.026,
      delayChildren: 0.04,
    },
  },
};

const letterVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 420, damping: 28 },
  },
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 28 },
  },
};

const miniMapVariants: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 280, damping: 24 },
  },
};

const buttonsGroupVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

const buttonItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 360, damping: 28 },
  },
};

/**
 * Primary "Back to overview (Zoom out)" button with magnetic pointer attraction
 * and subtle diagonal light-sweep shimmer.
 */
function MagneticBackButton({
  onClick,
  reducedMotion,
}: {
  onClick: () => void;
  reducedMotion: boolean | null;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 300, damping: 20, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 300, damping: 20, mass: 0.6 });

  const handleMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    rawX.set(dx * 6);
    rawY.set(dy * 3.5);
  };

  const handleLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      data-testid="sidebar-back"
      style={{ x, y }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      className="btn-light-sweep hud-btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#fff1ee] px-3.5 py-2 text-xs font-bold tracking-tight text-[#3b0a0a] shadow-lg shadow-[#160303]/45 hover:bg-[#ffe3dc]"
      title="Return to full overview (Esc)"
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
      <span>Back to overview (Zoom out)</span>
    </motion.button>
  );
}

/**
 * Artwork-thumbnail Mini-Map:
 * - Full artwork thumbnail with everything outside the active polygon dimmed.
 * - Bright spring-animated viewport rectangle showing live camera framing.
 * - Hovering other sections previews them cleanly with highlight & label.
 * - Clicking the mini-map returns to the overview.
 */
function ArtworkMiniMap({
  section,
  viewRect,
  zoomPercent,
  cardTiltEnabled,
  onBackOverview,
  onHoverSound,
  reducedMotion,
}: {
  section: Section;
  viewRect: { x: number; y: number; w: number; h: number };
  zoomPercent: number;
  cardTiltEnabled: boolean;
  onBackOverview: () => void;
  onHoverSound?: () => void;
  reducedMotion: boolean | null;
}) {
  const [previewSection, setPreviewSection] = useState<Section | null>(null);

  const activeClip = buildWorldClipPath(section);
  const previewClip =
    previewSection && previewSection.id !== section.id
      ? buildWorldClipPath(previewSection)
      : null;

  return (
    <TiltCard
      enabled={cardTiltEnabled}
      maxTilt={4.5}
      className="rounded-xl border border-[#ffd9d0]/18 bg-[#240505]/92 p-2"
    >
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[#ffd9d0]">
        <span>
          {previewSection && previewSection.id !== section.id
            ? `Preview: ${previewSection.n} · ${previewSection.name}`
            : 'Mini-map · Click for overview'}
        </span>
        <span className="font-mono-num text-[#fff1ee]">{zoomPercent}%</span>
      </div>

      <div
        role="button"
        tabIndex={0}
        data-testid="sidebar-minimap"
        aria-label="Mini-map overview. Click to return to full overview."
        onClick={onBackOverview}
        onMouseLeave={() => setPreviewSection(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onBackOverview();
          }
        }}
        className="group relative aspect-[2403/1540] w-full cursor-pointer overflow-hidden rounded-lg border border-[#ffd9d0]/20 bg-[#1a0303]"
      >
        {/* Dimmed full artwork thumbnail */}
        <img
          src={FULL_MAP_DISPLAY_1200}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="block h-full w-full select-none object-contain"
          style={{ filter: 'brightness(0.42) saturate(0.55)' }}
        />

        {/* Bright active polygon cutout */}
        <img
          src={FULL_MAP_DISPLAY_1200}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute inset-0 block h-full w-full select-none object-contain"
          style={{ clipPath: activeClip }}
        />

        {/* Hovered section preview cutout on mini-map */}
        {previewClip && (
          <motion.img
            key={`preview-${previewSection?.id}`}
            src={FULL_MAP_DISPLAY_1200}
            alt=""
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-none absolute inset-0 block h-full w-full select-none object-contain"
            style={{ clipPath: previewClip }}
          />
        )}

        {/* Interactive polygon outlines */}
        <svg
          viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {SECTIONS.map((s) => {
            const isCurrent = s.id === section.id;
            const isPreview = previewSection?.id === s.id && !isCurrent;

            return (
              <polygon
                key={s.id}
                data-testid={`minimap-poly-${s.id}`}
                points={s.polygon}
                fill="transparent"
                stroke={
                  isCurrent
                    ? s.accent
                    : isPreview
                      ? s.accent
                      : 'rgba(255, 217, 208, 0.28)'
                }
                strokeWidth={isCurrent ? 34 : isPreview ? 30 : 12}
                strokeLinejoin="round"
                onMouseEnter={() => {
                  setPreviewSection(s);
                  if (s.id !== section.id) onHoverSound?.();
                }}
              />
            );
          })}
        </svg>

        {/* Bright viewport indicator animated strictly on GPU transform (zero SVG layout repaint) */}
        <motion.div
          data-testid="minimap-viewport-rect"
          aria-hidden="true"
          initial={false}
          animate={{
            x: `${(viewRect.x / WORLD_WIDTH) * 100}%`,
            y: `${(viewRect.y / WORLD_HEIGHT) * 100}%`,
            scaleX: Math.max(0.08, viewRect.w / WORLD_WIDTH),
            scaleY: Math.max(0.08, viewRect.h / WORLD_HEIGHT),
          }}
          transition={
            reducedMotion
              ? { duration: 0.14 }
              : { type: 'spring', stiffness: 250, damping: 27, mass: 0.85 }
          }
          style={{
            transformOrigin: '0% 0%',
          }}
          className="pointer-events-none absolute inset-0 rounded-[4px] border-[3px] border-[#fff1ee] bg-[#fff1ee]/10 shadow-[0_0_10px_rgba(255,241,238,0.5)]"
        />

        {/* Subtle preview owner pill when hovering another region on the mini-map */}
        <AnimatePresence>
          {previewSection && previewSection.id !== section.id && (
            <motion.div
              key="minimap-preview-pill"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14 }}
              className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between rounded-md bg-[#200404]/95 px-2 py-1 text-[10px] font-medium text-[#fff1ee]"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: previewSection.accent }}
                />
                <span className="truncate">{previewSection.name}</span>
              </span>
              <span className="shrink-0 text-[#ffd9d0]">
                {previewSection.owner}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TiltCard>
  );
}

/**
 * Zoomed-section HUD:
 * - 330px deep maroon glass left sidebar on desktop (>= 768px)
 * - Expandable deep maroon glass bottom sheet on mobile (< 768px)
 */
export function SectionSidebar({
  section,
  visible,
  collapsed,
  camera,
  stageViewport,
  isCustomView,
  isolateActive,
  cardTiltEnabled,
  ownerBadgeEnabled,
  loadedCropMeta,
  onToggleCollapsed,
  onSelectSection,
  onPrev,
  onNext,
  onBackOverview,
  onResetView,
  onZoomIn,
  onZoomOut,
  onToggleIsolate,
  onOpenCropLightbox,
  onHoverSound,
}: SectionSidebarProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);
  const [prevHovered, setPrevHovered] = useState(false);
  const [nextHovered, setNextHovered] = useState(false);

  // Project live camera viewport back into 2403x1540 world coordinates for mini-map rect
  const { fitScale } = computeBaseMetrics(stageViewport);
  const effectiveScale = Math.max(0.001, fitScale * camera.scale);
  const viewW = Math.min(WORLD_WIDTH, stageViewport.width / effectiveScale);
  const viewH = Math.min(WORLD_HEIGHT, stageViewport.height / effectiveScale);
  const viewCx = WORLD_WIDTH / 2 - camera.x / effectiveScale;
  const viewCy = WORLD_HEIGHT / 2 - camera.y / effectiveScale;
  const viewRect = {
    x: Math.max(0, Math.min(WORLD_WIDTH - viewW, viewCx - viewW / 2)),
    y: Math.max(0, Math.min(WORLD_HEIGHT - viewH, viewCy - viewH / 2)),
    w: viewW,
    h: viewH,
  };

  const zoomPercent = Math.round(camera.scale * 100);

  return (
    <AnimatePresence>
      {visible && section && (
        <>
          {/* Desktop (>= 1024px): Minimized 56px TV-Friendly Rail OR Slim 248px Sidebar */}
          {collapsed ? (
            <motion.aside
              key="section-sidebar-rail"
              data-testid="section-sidebar"
              aria-label={`Minimized controls for ${section.name} musculature`}
              initial={{ x: -SIDEBAR_WIDTH_COLLAPSED - 12, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -SIDEBAR_WIDTH_COLLAPSED - 12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              style={{
                top: TOP_BAR_HEIGHT,
                width: SIDEBAR_WIDTH_COLLAPSED,
              }}
              className="hud-glass pointer-events-auto fixed bottom-0 left-0 z-30 hidden flex-col items-center justify-between border-y-0 border-l-0 border-r border-[#ffd9d0]/18 px-1.5 py-2.5 lg:flex"
            >
              {/* Top: Expand sidebar button + Active badge + Back to overview */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-testid="sidebar-expand-btn"
                  onClick={onToggleCollapsed}
                  aria-label="Expand left sidebar"
                  title="Expand left menu"
                  className="hud-btn flex h-9 w-9 items-center justify-center rounded-xl border border-[#ffd9d0]/20 bg-[#fff1ee]/8 text-[#ffd9d0] hover:bg-[#fff1ee]/16 hover:text-[#fff1ee]"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={onBackOverview}
                  aria-label="Back to overview (Esc)"
                  title="Back to overview (Esc)"
                  className="hud-btn flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff1ee] text-[#3b0a0a] shadow-md hover:bg-[#ffd9d0]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <span aria-hidden="true" className="my-0.5 h-px w-7 bg-[#ffd9d0]/18" />

                {/* Compact 1-4 section jump pills */}
                <div className="flex flex-col items-center gap-1.5">
                  {SECTIONS.map((s) => {
                    const isCurrent = s.id === section.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        data-testid={`jump-btn-${s.id}`}
                        onClick={() => onSelectSection(s.id)}
                        aria-label={`Jump to ${s.name} musculature (${s.owner})`}
                        aria-current={isCurrent ? 'page' : undefined}
                        title={`${s.n}. ${s.name} — ${s.owner}`}
                        className="hud-btn relative flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: isCurrent ? s.accent : `${s.accent}24`,
                          borderColor: isCurrent ? '#fff1ee' : `${s.accent}88`,
                          color: isCurrent ? s.badgeText : '#fff1ee',
                          boxShadow: isCurrent ? `0 0 14px ${s.accent}88` : undefined,
                        }}
                      >
                        <span className="font-mono-num">{s.n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom: Prev/Next + Zoom + Reset + Decolorize Emphasis toggle */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    data-testid="sidebar-prev"
                    onClick={onPrev}
                    aria-label="Previous section"
                    title="Previous section (←)"
                    className="hud-btn flex h-8 w-9 items-center justify-center rounded-xl border border-[#ffd9d0]/18 bg-[#fff1ee]/7 text-[#fff1ee] hover:bg-[#fff1ee]/15"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-testid="sidebar-next"
                    onClick={onNext}
                    aria-label="Next section"
                    title="Next section (→)"
                    className="hud-btn flex h-8 w-9 items-center justify-center rounded-xl border border-[#ffd9d0]/18 bg-[#fff1ee]/7 text-[#fff1ee] hover:bg-[#fff1ee]/15"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <span aria-hidden="true" className="my-0.5 h-px w-7 bg-[#ffd9d0]/18" />

                <button
                  type="button"
                  onClick={onZoomIn}
                  disabled={camera.scale >= MAX_SCALE - 0.05}
                  aria-label="Zoom in"
                  title="Zoom in (+)"
                  className="hud-btn flex h-8 w-9 items-center justify-center rounded-xl border border-[#ffd9d0]/16 bg-[#fff1ee]/7 text-[#fff1ee] hover:bg-[#fff1ee]/14 disabled:opacity-35"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onZoomOut}
                  disabled={camera.scale <= MIN_SCALE + 0.02}
                  aria-label="Zoom out"
                  title="Zoom out (-)"
                  className="hud-btn flex h-8 w-9 items-center justify-center rounded-xl border border-[#ffd9d0]/16 bg-[#fff1ee]/7 text-[#fff1ee] hover:bg-[#fff1ee]/14 disabled:opacity-35"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  data-testid="sidebar-reset-view"
                  onClick={onResetView}
                  aria-label="Reset view"
                  title="Reset view"
                  className="hud-btn flex h-8 w-9 items-center justify-center rounded-xl border text-[#fff1ee]"
                  style={{
                    backgroundColor: isCustomView
                      ? `${section.accent}33`
                      : 'rgba(255, 241, 238, 0.06)',
                    borderColor: isCustomView
                      ? section.accent
                      : 'rgba(255, 217, 208, 0.16)',
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  data-testid="sidebar-focus-toggle"
                  onClick={onToggleIsolate}
                  aria-pressed={isolateActive}
                  aria-label="Toggle active section emphasis & decolorization"
                  title={
                    isolateActive
                      ? 'Active emphasis ON — non-current parts decolorized (F)'
                      : 'Enable active section emphasis & decolorize others (F)'
                  }
                  className="hud-btn flex h-8 w-9 items-center justify-center rounded-xl border text-[#fff1ee]"
                  style={{
                    backgroundColor: isolateActive
                      ? `${section.accent}42`
                      : 'rgba(255, 241, 238, 0.06)',
                    borderColor: isolateActive
                      ? section.accent
                      : 'rgba(255, 217, 208, 0.16)',
                  }}
                >
                  <Focus className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.aside>
          ) : (
            <motion.aside
              key="section-sidebar-desktop"
              data-testid="section-sidebar"
              aria-label={`Section controls for ${section.name} musculature`}
              variants={sidebarContainerVariants}
              initial={prefersReducedMotion ? { opacity: 0 } : 'hidden'}
              animate={prefersReducedMotion ? { opacity: 1 } : 'visible'}
              exit={prefersReducedMotion ? { opacity: 0 } : 'exit'}
              style={{
                top: TOP_BAR_HEIGHT,
                width: SIDEBAR_WIDTH_DESKTOP,
              }}
              className="hud-glass pointer-events-auto fixed bottom-0 left-0 z-30 hidden flex-col justify-between overflow-y-auto border-y-0 border-l-0 border-r border-[#ffd9d0]/20 px-3 py-2.5 lg:flex"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={section.id}
                  variants={contentOrchestratorVariants}
                  initial={prefersReducedMotion ? { opacity: 0 } : 'hidden'}
                  animate={prefersReducedMotion ? { opacity: 1 } : 'visible'}
                  exit="exit"
                  className="flex flex-1 flex-col gap-2"
                >
                  {/* Header: Big accent badge + ZOOMED SECTION + Section name + Minimize button */}
                  <div className="space-y-1.5">
                    <div
                      className="flex items-start gap-2.5"
                      style={{ perspective: '650px' }}
                    >
                      <motion.div
                        layoutId={`section-badge-${section.id}`}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="mt-0.5 shrink-0"
                      >
                        <motion.span
                          initial={
                            prefersReducedMotion
                              ? { opacity: 1 }
                              : { rotateY: -90, scale: 0.72, opacity: 0 }
                          }
                          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                          }}
                          style={{
                            backgroundColor: section.accent,
                            color: section.badgeText,
                            boxShadow: `0 0 22px ${section.accent}70`,
                            transformStyle: 'preserve-3d',
                          }}
                          className="font-mono-num flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold"
                        >
                          {section.n}
                        </motion.span>
                      </motion.div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono-num block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#ffd9d0]">
                            ZOOMED SECTION
                          </span>
                          <button
                            type="button"
                            data-testid="sidebar-collapse-btn"
                            onClick={onToggleCollapsed}
                            aria-label="Minimize left sidebar"
                            title="Minimize left menu for more screen space"
                            className="hud-btn flex h-6 w-6 items-center justify-center rounded-lg text-[#ffd9d0] hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
                          >
                            <PanelLeftClose className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <motion.h2
                          layoutId={`section-title-${section.id}`}
                          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                          className="font-display mt-0.5 text-[21px] font-semibold leading-none tracking-tight text-[#fff1ee]"
                        >
                          <motion.span
                            variants={titleLettersContainerVariants}
                            initial={prefersReducedMotion ? false : 'hidden'}
                            animate="visible"
                            aria-label={section.name}
                            className="inline-flex flex-wrap"
                          >
                            {section.name.split('').map((ch, idx) => (
                              <motion.span
                                key={`${section.id}-${idx}`}
                                variants={letterVariants}
                                aria-hidden="true"
                                className="inline-block"
                              >
                                {ch === ' ' ? '\u00A0' : ch}
                              </motion.span>
                            ))}
                          </motion.span>
                        </motion.h2>

                        {/* Short accent underline */}
                        <motion.div
                          initial={prefersReducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 280,
                            damping: 24,
                            delay: 0.14,
                          }}
                          style={{
                            originX: 0,
                            backgroundColor: section.accent,
                            boxShadow: `0 0 12px ${section.accent}88`,
                          }}
                          className="mt-1.5 h-[2.5px] w-9 rounded-full"
                        />
                      </div>
                    </div>

                    <motion.div variants={fadeUpVariants} className="pl-[46px]">
                      <OwnerBadge
                        section={section}
                        enabled={ownerBadgeEnabled}
                        cardTiltEnabled={cardTiltEnabled}
                        onHoverSound={onHoverSound}
                      />
                    </motion.div>
                  </div>

                {/* Mini-map: Full artwork thumbnail + dimmed non-active + spring viewport rect */}
                <motion.div variants={miniMapVariants}>
                  <ArtworkMiniMap
                    section={section}
                    viewRect={viewRect}
                    zoomPercent={zoomPercent}
                    cardTiltEnabled={cardTiltEnabled}
                    onBackOverview={onBackOverview}
                    onHoverSound={onHoverSound}
                    reducedMotion={prefersReducedMotion}
                  />
                </motion.div>

                {/* Primary magnetic button with subtle light sweep */}
                <motion.div variants={buttonItemVariants}>
                  <MagneticBackButton
                    onClick={onBackOverview}
                    reducedMotion={prefersReducedMotion}
                  />
                </motion.div>

                {/* "Jump to another section" list of 4 accent buttons with sliding layoutId indicator */}
                <motion.div
                  variants={buttonsGroupVariants}
                  className="flex flex-col gap-2"
                >
                  <motion.span
                    variants={buttonItemVariants}
                    className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ffd9d0]"
                  >
                    Jump to another section
                  </motion.span>

                  <motion.div
                    variants={buttonItemVariants}
                    className="flex flex-col gap-1"
                  >
                    {SECTIONS.map((s) => {
                      const isCurrent = s.id === section.id;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          data-testid={`jump-btn-${s.id}`}
                          onClick={() => onSelectSection(s.id)}
                          aria-current={isCurrent ? 'page' : undefined}
                          className="hud-btn relative flex items-center justify-between overflow-hidden rounded-xl border px-3 py-1.5 text-left text-xs transition-all"
                          style={{
                            backgroundColor: isCurrent
                              ? 'rgba(255, 241, 238, 0.05)'
                              : `${s.accent}26`,
                            borderColor: isCurrent
                              ? 'rgba(255, 217, 208, 0.16)'
                              : `${s.accent}88`,
                            opacity: isCurrent ? 0.68 : 1,
                          }}
                        >
                          {/* Sliding layoutId indicator bar marking active item */}
                          {isCurrent && (
                            <motion.span
                              layoutId="sidebar-jump-indicator"
                              transition={{
                                type: 'spring',
                                stiffness: 360,
                                damping: 30,
                              }}
                              style={{ backgroundColor: s.accent }}
                              className="absolute bottom-1.5 left-1 top-1.5 w-1 rounded-full"
                            />
                          )}

                          <span className="flex items-center gap-2.5 pl-1.5">
                            <span
                              className="font-mono-num inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold"
                              style={{
                                backgroundColor: s.accent,
                                color: s.badgeText,
                              }}
                            >
                              {s.n}
                            </span>
                            <span className="font-semibold text-[#fff1ee]">
                              {s.name}
                            </span>
                          </span>

                          <span className="text-[11px] text-[#ffd9d0]">
                            {isCurrent ? 'Current' : s.owner}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>

                  {/* Previous / Next buttons with arrow micro-animations */}
                  <motion.div
                    variants={buttonItemVariants}
                    className="grid grid-cols-2 gap-2 pt-0.5"
                  >
                    <button
                      type="button"
                      data-testid="sidebar-prev"
                      onClick={onPrev}
                      onMouseEnter={() => setPrevHovered(true)}
                      onMouseLeave={() => setPrevHovered(false)}
                      className="hud-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/18 bg-[#fff1ee]/7 px-3 py-2 text-xs font-semibold text-[#fff1ee] hover:border-[#ffd9d0]/32 hover:bg-[#fff1ee]/14"
                      title="Previous section (Left Arrow)"
                    >
                      <motion.span
                        animate={{
                          x: prevHovered && !prefersReducedMotion ? -3.5 : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        className="inline-flex"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 text-[#ffd9d0]" />
                      </motion.span>
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      data-testid="sidebar-next"
                      onClick={onNext}
                      onMouseEnter={() => setNextHovered(true)}
                      onMouseLeave={() => setNextHovered(false)}
                      className="hud-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/18 bg-[#fff1ee]/7 px-3 py-2 text-xs font-semibold text-[#fff1ee] hover:border-[#ffd9d0]/32 hover:bg-[#fff1ee]/14"
                      title="Next section (Right Arrow)"
                    >
                      <span>Next</span>
                      <motion.span
                        animate={{
                          x: nextHovered && !prefersReducedMotion ? 3.5 : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        className="inline-flex"
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-[#ffd9d0]" />
                      </motion.span>
                    </button>
                  </motion.div>

                  {/* Zoom controls + Reset view + Isolate */}
                  <motion.div
                    variants={buttonItemVariants}
                    className="flex items-center gap-1.5"
                  >
                    <button
                      type="button"
                      onClick={onZoomOut}
                      disabled={camera.scale <= MIN_SCALE + 0.02}
                      className="hud-btn flex h-8 w-8 items-center justify-center rounded-xl border border-[#ffd9d0]/16 bg-[#fff1ee]/7 text-[#fff1ee] hover:bg-[#fff1ee]/14 disabled:opacity-35"
                      aria-label="Zoom out"
                      title="Zoom out (-)"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onZoomIn}
                      disabled={camera.scale >= MAX_SCALE - 0.05}
                      className="hud-btn flex h-8 w-8 items-center justify-center rounded-xl border border-[#ffd9d0]/16 bg-[#fff1ee]/7 text-[#fff1ee] hover:bg-[#fff1ee]/14 disabled:opacity-35"
                      aria-label="Zoom in"
                      title="Zoom in (+)"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      data-testid="sidebar-reset-view"
                      onClick={onResetView}
                      className="hud-btn flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-medium"
                      style={{
                        backgroundColor: isCustomView
                          ? `${section.accent}33`
                          : 'rgba(255, 241, 238, 0.06)',
                        borderColor: isCustomView
                          ? section.accent
                          : 'rgba(255, 217, 208, 0.16)',
                        color: '#fff1ee',
                      }}
                      title="Reset pan & zoom to section default"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset view</span>
                    </button>

                    <button
                      type="button"
                      onClick={onToggleIsolate}
                      aria-pressed={isolateActive}
                      className="hud-btn flex h-8 w-8 items-center justify-center rounded-xl border"
                      style={{
                        backgroundColor: isolateActive
                          ? `${section.accent}38`
                          : 'rgba(255, 241, 238, 0.06)',
                        borderColor: isolateActive
                          ? section.accent
                          : 'rgba(255, 217, 208, 0.16)',
                        color: '#fff1ee',
                      }}
                      aria-label="Toggle spotlight isolate"
                      title="Spotlight isolate this region (F)"
                    >
                      <Focus className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>

                  {loadedCropMeta && !loadedCropMeta.alignsWithBbox && (
                    <motion.button
                      variants={buttonItemVariants}
                      type="button"
                      onClick={onOpenCropLightbox}
                      className="hud-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/18 bg-[#fff1ee]/8 px-3 py-2 text-xs font-medium text-[#fff1ee] hover:bg-[#fff1ee]/15"
                    >
                      <Expand className="h-3.5 w-3.5" />
                      <span>Hi-Res Crop</span>
                    </motion.button>
                  )}
                </motion.div>

                {/* Footer tip */}
                <motion.p
                  variants={fadeUpVariants}
                  className="mt-auto border-t border-[#ffd9d0]/14 pt-2 text-center text-[11px] font-medium text-[#ffd9d0]/90"
                >
                  Pinch or scroll to zoom further.
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </motion.aside>
          )}

          {/* Tablet & Mobile (< 1024px): Expandable Deep Maroon Glass Bottom Sheet (compositor-only) */}
          <motion.section
            key="section-sheet-mobile"
            data-testid="section-sheet-mobile"
            aria-label={`Mobile section controls for ${section.name}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="hud-glass pb-safe pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-x-0 border-b-0 border-t border-[#ffd9d0]/22 px-3 pt-1.5 lg:hidden"
          >
            {/* Sheet expand/collapse handle */}
            <button
              type="button"
              onClick={() => setMobileSheetExpanded((e) => !e)}
              aria-expanded={mobileSheetExpanded}
              aria-label={mobileSheetExpanded ? 'Collapse section sheet' : 'Expand section sheet'}
              className="mx-auto mb-1.5 flex items-center gap-1 rounded-full px-3 py-0.5 text-[10px] font-medium text-[#ffd9d0] hover:bg-[#fff1ee]/10"
            >
              <span className="h-1 w-8 rounded-full bg-[#ffd9d0]/45" />
              {mobileSheetExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Compact header row always visible on tablet & mobile */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="font-mono-num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: section.accent,
                    color: section.badgeText,
                  }}
                >
                  {section.n}
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="font-display truncate text-sm font-semibold text-[#fff1ee]">
                    {section.name}
                  </div>
                  <div className="truncate text-[10px] text-[#ffd9d0]">
                    {section.owner} · {zoomPercent}%
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={onZoomOut}
                  className="hud-btn flex h-8 w-8 items-center justify-center rounded-xl border border-[#ffd9d0]/20 bg-[#fff1ee]/8 text-[#fff1ee]"
                  aria-label="Zoom out"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onZoomIn}
                  className="hud-btn flex h-8 w-8 items-center justify-center rounded-xl border border-[#ffd9d0]/20 bg-[#fff1ee]/8 text-[#fff1ee]"
                  aria-label="Zoom in"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onPrev}
                  className="hud-btn flex h-8 w-8 items-center justify-center rounded-xl border border-[#ffd9d0]/20 bg-[#fff1ee]/8 text-[#fff1ee]"
                  aria-label="Previous section"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="hud-btn flex h-8 w-8 items-center justify-center rounded-xl border border-[#ffd9d0]/20 bg-[#fff1ee]/8 text-[#fff1ee]"
                  aria-label="Next section"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onBackOverview}
                  className="hud-btn flex h-8 items-center gap-1 rounded-xl bg-[#fff1ee] px-2.5 text-xs font-bold text-[#3b0a0a]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Map</span>
                </button>
              </div>
            </div>

            {/* Expandable drawer body animated purely with transform/opacity */}
            <AnimatePresence initial={false}>
              {mobileSheetExpanded && (
                <motion.div
                  key="mobile-sheet-body"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="touch-scroll-y mt-2.5 flex max-h-[54dvh] flex-col gap-2.5 overflow-y-auto pr-0.5"
                >
                  <ArtworkMiniMap
                    section={section}
                    viewRect={viewRect}
                    zoomPercent={zoomPercent}
                    cardTiltEnabled={cardTiltEnabled}
                    onBackOverview={onBackOverview}
                    onHoverSound={onHoverSound}
                    reducedMotion={prefersReducedMotion}
                  />

                  <div className="grid grid-cols-2 gap-1.5">
                    {SECTIONS.map((s) => {
                      const isCurrent = s.id === section.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onSelectSection(s.id)}
                          className="hud-btn flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold text-[#fff1ee]"
                          style={{
                            backgroundColor: isCurrent
                              ? 'rgba(255, 241, 238, 0.05)'
                              : `${s.accent}28`,
                            borderColor: isCurrent
                              ? 'rgba(255, 217, 208, 0.16)'
                              : `${s.accent}88`,
                            opacity: isCurrent ? 0.68 : 1,
                          }}
                        >
                          <span
                            className="font-mono-num flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: s.accent,
                              color: s.badgeText,
                            }}
                          >
                            {s.n}
                          </span>
                          <span className="truncate">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={onResetView}
                      className="hud-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/20 bg-[#fff1ee]/8 py-1.5 text-xs font-medium text-[#fff1ee]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset view</span>
                    </button>
                    <p className="text-[10px] text-[#ffd9d0]">
                      Pinch or scroll to zoom further.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
