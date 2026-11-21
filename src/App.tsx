import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import {
  SECTION_BY_ID,
  SECTIONS,
  type Section,
  type SectionId,
} from './data/sections';
import { useCamera } from './hooks/useCamera';
import { useDepthParallax } from './hooks/useDepthParallax';
import { useEffectsSettings } from './hooks/useEffectsSettings';
import { useViewportSize } from './hooks/useViewportSize';
import { worldToScreen } from './lib/cameraMath';
import { preloadSectionAndNext, type LoadedCropMeta } from './lib/preload';
import { playHoverTick, playTransitionWhoosh } from './lib/sound';
import { AmbientBackdrop } from './components/stage/AmbientBackdrop';
import { Stage } from './components/stage/Stage';
import { TOP_BAR_HEIGHT, TopBar, type ViewMode } from './components/hud/TopBar';

const ThreeDVisualStage = lazy(() => import('./components/stage/ThreeDVisualStage'));

let threeDPreloaded = false;
function preloadThreeDAssets() {
  if (threeDPreloaded) return;
  threeDPreloaded = true;
  void import('./components/stage/ThreeDVisualStage');
  void fetch('./models/muscles.glb', { priority: 'low' as RequestPriority }).catch(() => {});
}
import { SectionSidebar } from './components/hud/SectionSidebar';
import { SummaryCard } from './components/hud/SummaryCard';
import { HoverTooltip } from './components/hud/HoverTooltip';
import { MagneticCursor } from './components/hud/MagneticCursor';
import { ClickRipple, type ClickRippleItem } from './components/hud/ClickRipple';
import { ShortcutsOverlay } from './components/hud/ShortcutsOverlay';
import { CropLightbox } from './components/hud/CropLightbox';
import { EffectsPopover } from './components/hud/EffectsPopover';
import { IntroOverlay } from './components/hud/IntroOverlay';

const IDLE_HINT_DELAY_MS = 4000;
const IDLE_HINT_STEP_MS = 580;

export default function App() {
  const viewport = useViewportSize();
  const prefersReducedMotion = useReducedMotion();
  const { config: effects, activePreset, applyPreset, toggleEffect } =
    useEffectsSettings();

  const [viewMode, setViewMode] = useState<ViewMode>('poster');
  const [hudVisible, setHudVisible] = useState(true);
  // Minimized left sidebar rail by default so zoomed artwork fills classroom TVs cleanly
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  // Emphasize current zoomed section & decolorize non-current sections by default
  const [isolateActive, setIsolateActive] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [cropLightboxOpen, setCropLightboxOpen] = useState(false);

  // Play 2-second micro-intro on initial overview load (skipped if deep-linked to #section or disabled)
  const [introActive, setIntroActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasHash = window.location.hash.replace(/^#/, '').trim().length > 0;
    return !hasHash && effects.intro;
  });

  const [hoveredSection, setHoveredSection] = useState<Section | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [idleHintSectionId, setIdleHintSectionId] = useState<SectionId | null>(null);
  const [ripples, setRipples] = useState<ClickRippleItem[]>([]);

  const [loadedCrops, setLoadedCrops] = useState<
    Partial<Record<SectionId, LoadedCropMeta>>
  >({});
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const handleCropLoaded = useCallback((id: SectionId, meta: LoadedCropMeta) => {
    setLoadedCrops((prevCrops) =>
      prevCrops[id] ? prevCrops : { ...prevCrops, [id]: meta },
    );
  }, []);

  const depth = useDepthParallax(effects.parallax);

  const topBarOffset = hudVisible ? TOP_BAR_HEIGHT : 0;
  const stageViewport = useMemo(
    () => ({
      width: viewport.width,
      height: Math.max(200, viewport.height - topBarOffset),
    }),
    [viewport.height, viewport.width, topBarOffset],
  );

  const camera = useCamera({
    viewport: stageViewport,
    hudVisible,
    sidebarCollapsed,
  });
  const {
    activeSection,
    lockingSectionId,
    sidebarVisible,
    isCustomView,
    goOverview: rawGoOverview,
    goSection: rawGoSection,
    next: rawNext,
    prev: rawPrev,
    resetSectionView,
    zoomByFactor,
    getLiveCamera,
  } = camera;

  const activeSectionId = activeSection?.id ?? null;

  const rippleIdRef = useRef(0);
  const idleHintDoneRef = useRef(false);
  const idleTimersRef = useRef<number[]>([]);

  const handleHoverSound = useCallback(() => {
    playHoverTick(effects.sound);
  }, [effects.sound]);

  const goOverview = useCallback(() => {
    if (activeSectionId !== null) {
      playTransitionWhoosh(effects.sound, 'out');
    }
    rawGoOverview();
  }, [activeSectionId, effects.sound, rawGoOverview]);

  const goSection = useCallback(
    (id: SectionId) => {
      playTransitionWhoosh(
        effects.sound,
        activeSectionId && activeSectionId !== id ? 'pan' : 'in',
      );
      rawGoSection(id);
    },
    [activeSectionId, effects.sound, rawGoSection],
  );

  const next = useCallback(() => {
    playTransitionWhoosh(effects.sound, activeSectionId ? 'pan' : 'in');
    rawNext();
  }, [activeSectionId, effects.sound, rawNext]);

  const prev = useCallback(() => {
    playTransitionWhoosh(effects.sound, activeSectionId ? 'pan' : 'in');
    rawPrev();
  }, [activeSectionId, effects.sound, rawPrev]);

  const cancelIdleHint = useCallback(() => {
    idleHintDoneRef.current = true;
    for (const id of idleTimersRef.current) {
      window.clearTimeout(id);
    }
    idleTimersRef.current = [];
    setIdleHintSectionId(null);
  }, []);

  // Dismiss intro cleanly if reduced motion is enabled or intro toggle is turned off
  useEffect(() => {
    if (prefersReducedMotion || !effects.intro) {
      setIntroActive(false);
    }
  }, [effects.intro, prefersReducedMotion]);

  // One-time 4-second idle shimmering sweep plays cleanly AFTER the 2s micro-intro finishes
  useEffect(() => {
    if (
      introActive ||
      prefersReducedMotion ||
      idleHintDoneRef.current ||
      activeSectionId !== null ||
      lockingSectionId !== null
    ) {
      return;
    }

    const startTimer = window.setTimeout(() => {
      if (idleHintDoneRef.current) return;

      SECTIONS.forEach((section, index) => {
        const t = window.setTimeout(() => {
          setIdleHintSectionId(section.id);
        }, index * IDLE_HINT_STEP_MS);
        idleTimersRef.current.push(t);
      });

      const endTimer = window.setTimeout(() => {
        setIdleHintSectionId(null);
        idleHintDoneRef.current = true;
      }, SECTIONS.length * IDLE_HINT_STEP_MS);
      idleTimersRef.current.push(endTimer);
    }, IDLE_HINT_DELAY_MS);

    idleTimersRef.current.push(startTimer);

    const handleFirstInteraction = () => cancelIdleHint();
    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    window.addEventListener('wheel', handleFirstInteraction, { passive: true });

    return () => {
      for (const id of idleTimersRef.current) {
        window.clearTimeout(id);
      }
      idleTimersRef.current = [];
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('wheel', handleFirstInteraction);
    };
  }, [
    activeSectionId,
    cancelIdleHint,
    introActive,
    lockingSectionId,
    prefersReducedMotion,
  ]);

  // Lazy-load active section's crop & predictively preload the NEXT section's crop
  const prevAnnouncedRef = useRef<SectionId | null | undefined>(undefined);
  useEffect(() => {
    if (activeSectionId) {
      preloadSectionAndNext(activeSectionId, handleCropLoaded);
    }

    // Announce section changes cleanly to screen readers (aria-live="polite")
    if (prevAnnouncedRef.current !== undefined && prevAnnouncedRef.current !== activeSectionId) {
      if (activeSectionId) {
        const s = SECTION_BY_ID[activeSectionId];
        setLiveAnnouncement(`${s.name} musculature, prepared by ${s.owner}`);
      } else {
        setLiveAnnouncement('Full muscular system overview');
      }
    }
    prevAnnouncedRef.current = activeSectionId;
  }, [activeSectionId, handleCropLoaded]);

  // Clear hover & lightbox when section changes
  useEffect(() => {
    setHoveredSection(null);
    setHoverPos(null);
    setCropLightboxOpen(false);
  }, [activeSectionId]);

  const getSectionScreenAnchor = useCallback(
    (section: Section) => {
      const pt = worldToScreen(
        section.anchor[0],
        section.anchor[1],
        getLiveCamera(),
        stageViewport,
      );
      return { x: pt.x, y: pt.y + topBarOffset };
    },
    [getLiveCamera, stageViewport, topBarOffset],
  );

  const handleHoverSection = useCallback(
    (section: Section | null, pointer?: { x: number; y: number }) => {
      if (section) {
        cancelIdleHint();
        // Lazy-load hovered crop + predictively preload the next section's crop on hover
        preloadSectionAndNext(section.id, handleCropLoaded);
      }
      if (!section || section.id === activeSectionId || lockingSectionId !== null) {
        setHoveredSection(null);
        setHoverPos(null);
        return;
      }
      setHoveredSection((prevHovered) => {
        if (prevHovered?.id !== section.id) {
          playHoverTick(effects.sound);
        }
        return section;
      });
      if (pointer) {
        setHoverPos(pointer);
      }
    },
    [activeSectionId, cancelIdleHint, effects.sound, handleCropLoaded, lockingSectionId],
  );

  const handleAnchorHover = useCallback(
    (section: Section | null) => {
      if (section) {
        cancelIdleHint();
        preloadSectionAndNext(section.id, handleCropLoaded);
      }
      if (!section || section.id === activeSectionId || lockingSectionId !== null) {
        setHoveredSection(null);
        setHoverPos(null);
        return;
      }
      setHoveredSection((prevHovered) => {
        if (prevHovered?.id !== section.id) {
          playHoverTick(effects.sound);
        }
        return section;
      });
      setHoverPos(getSectionScreenAnchor(section));
    },
    [
      activeSectionId,
      cancelIdleHint,
      effects.sound,
      getSectionScreenAnchor,
      handleCropLoaded,
      lockingSectionId,
    ],
  );

  const triggerRippleAndGo = useCallback(
    (id: SectionId, clickPoint?: { x: number; y: number }) => {
      cancelIdleHint();
      setHoveredSection(null);
      setHoverPos(null);
      setEffectsOpen(false);

      const section = SECTION_BY_ID[id];
      const origin = clickPoint ?? getSectionScreenAnchor(section);
      const rippleId = ++rippleIdRef.current;

      setRipples((prevRipples) => [
        ...prevRipples,
        { id: rippleId, x: origin.x, y: origin.y, color: section.accent },
      ]);

      window.setTimeout(() => {
        setRipples((prevRipples) => prevRipples.filter((r) => r.id !== rippleId));
      }, 650);

      goSection(id);
    },
    [cancelIdleHint, getSectionScreenAnchor, goSection],
  );

  const handleToggleEffect = useCallback(
    (key: keyof typeof effects) => {
      if (key === 'sound' && !effects.sound) {
        // Confirm sound activation with a soft tick right on toggle
        playHoverTick(true);
      }
      toggleEffect(key);
    },
    [effects.sound, toggleEffect],
  );

  const handleChangeViewMode = useCallback(
    (mode: ViewMode) => {
      if (mode === viewMode) return;
      cancelIdleHint();
      setHoveredSection(null);
      setHoverPos(null);
      setEffectsOpen(false);
      playTransitionWhoosh(effects.sound, mode === '3d' ? 'in' : 'out');
      setViewMode(mode);
      setLiveAnnouncement(
        mode === '3d' ? '3D Visual Model mode' : 'Poster overview mode',
      );
    },
    [cancelIdleHint, effects.sound, viewMode],
  );

  const handleIntroComplete = useCallback(() => {
    setIntroActive(false);
  }, []);

  const handleReplayIntro = useCallback(() => {
    if (activeSectionId !== null) {
      rawGoOverview();
    }
    idleHintDoneRef.current = false;
    setIntroActive(true);
  }, [activeSectionId, rawGoOverview]);

  // Global keyboard shortcuts (disabled while micro-intro listens for skip-any-key)
  useEffect(() => {
    if (introActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (cropLightboxOpen) {
          setCropLightboxOpen(false);
          return;
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (effectsOpen) {
          setEffectsOpen(false);
          return;
        }
        goOverview();
        return;
      }

      if (cropLightboxOpen || shortcutsOpen) {
        if (e.key === '?' && shortcutsOpen) {
          setShortcutsOpen(false);
        }
        return;
      }

      switch (e.key) {
        case '1':
        case '2':
        case '3':
        case '4': {
          const section = SECTIONS[Number(e.key) - 1];
          if (section) {
            e.preventDefault();
            triggerRippleAndGo(section.id);
          }
          break;
        }
        case '0': {
          e.preventDefault();
          goOverview();
          break;
        }
        case 'ArrowRight':
        case 'ArrowDown': {
          e.preventDefault();
          next();
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          e.preventDefault();
          prev();
          break;
        }
        case '+':
        case '=': {
          e.preventDefault();
          zoomByFactor(1.35);
          break;
        }
        case '-':
        case '_': {
          e.preventDefault();
          zoomByFactor(1 / 1.35);
          break;
        }
        case 'f':
        case 'F': {
          if (activeSectionId) {
            e.preventDefault();
            setIsolateActive((v) => !v);
          }
          break;
        }
        case 'v':
        case 'V': {
          e.preventDefault();
          handleChangeViewMode(viewMode === 'poster' ? '3d' : 'poster');
          break;
        }
        case 'h':
        case 'H': {
          e.preventDefault();
          setHudVisible((v) => !v);
          break;
        }
        case '?': {
          e.preventDefault();
          setEffectsOpen(false);
          setShortcutsOpen((v) => !v);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSectionId,
    cropLightboxOpen,
    effectsOpen,
    goOverview,
    handleChangeViewMode,
    introActive,
    next,
    prev,
    shortcutsOpen,
    triggerRippleAndGo,
    viewMode,
    zoomByFactor,
  ]);

  const activeCropMeta = activeSectionId ? loadedCrops[activeSectionId] : undefined;
  const isPosterMode = viewMode === 'poster';
  const magneticCursorEnabled =
    isPosterMode &&
    activeSectionId === null &&
    lockingSectionId === null &&
    !introActive &&
    !effectsOpen &&
    !shortcutsOpen &&
    !cropLightboxOpen;

  return (
    <LayoutGroup>
      <div className="relative flex h-dvh w-dvw flex-col overflow-hidden bg-[#240505]">
        {/* Keyboard skip link for screen readers & keyboard-only users */}
        <a href="#interactive-map" className="skip-link">
          Skip to interactive map
        </a>

        {/* Screen-reader live region announcing section changes */}
        <div
          data-testid="sr-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveAnnouncement}
        </div>

        {/* Layer 1: Ambient background (yields GPU budget during active camera transitions) */}
        <AmbientBackdrop
          enabled={effects.ambient}
          lite={activePreset === 'lite'}
          paused={camera.isTransitioning}
          depthX={depth.nx}
          depthY={depth.ny}
        />

        {/* Slim 44px top glass bar ABOVE <Stage> sharing layoutId pills with sidebar */}
        <TopBar
          viewMode={viewMode}
          activeSectionId={activeSectionId}
          hoveredSectionId={hoveredSection?.id ?? null}
          sidebarVisible={
            isPosterMode && hudVisible && sidebarVisible && !sidebarCollapsed
          }
          scale={camera.camera.scale}
          hudVisible={hudVisible}
          effectsOpen={effectsOpen}
          effectsPreset={activePreset}
          onChangeViewMode={handleChangeViewMode}
          onPreload3D={preloadThreeDAssets}
          onResetOverview={goOverview}
          onHoverPill={(sec) => {
            if (isPosterMode) handleAnchorHover(sec);
          }}
          onSelectPill={(id, pt) => {
            if (isPosterMode) {
              triggerRippleAndGo(id, pt);
            } else {
              goSection(id);
            }
          }}
          onToggleEffects={() => {
            setShortcutsOpen(false);
            setEffectsOpen((v) => !v);
          }}
          onToggleHud={() => setHudVisible((v) => !v)}
          onOpenShortcuts={() => {
            setEffectsOpen(false);
            setShortcutsOpen(true);
          }}
        />

        {/* Smooth architectural transition between Poster Mode and 3D Visual Model Mode */}
        <AnimatePresence mode="wait">
          {isPosterMode ? (
            <motion.div
              key="poster-mode-shell"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex min-h-0 flex-1 flex-col"
            >
              {/* Layer 2: Full-viewport <Stage> with LQIP skeleton, 3D intro lift & depth parallax */}
              <Stage
                camera={camera}
                stageViewport={stageViewport}
                hudVisible={hudVisible}
                sidebarCollapsed={sidebarCollapsed}
                hoveredSection={hoveredSection}
                isolateActiveSection={isolateActive}
                idleHintSectionId={idleHintSectionId}
                loadedCrops={loadedCrops}
                magneticCursorEnabled={magneticCursorEnabled}
                depthX={depth.nx}
                depthY={depth.ny}
                parallaxEnabled={effects.parallax}
                introActive={introActive}
                skeletonEnabled={effects.skeleton}
                onHoverSection={handleHoverSection}
                onFocusSectionKeyboard={handleAnchorHover}
                onSelectSection={triggerRippleAndGo}
              />

              {/* Phase 3 orchestrated minimized 56px rail / expandable 248px left sidebar */}
              <SectionSidebar
                section={activeSection}
                visible={hudVisible && sidebarVisible}
                collapsed={sidebarCollapsed}
                camera={camera.camera}
                stageViewport={stageViewport}
                isCustomView={isCustomView}
                isolateActive={isolateActive}
                cardTiltEnabled={effects.cardTilt}
                ownerBadgeEnabled={effects.ownerBadge}
                loadedCropMeta={activeCropMeta}
                onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
                onSelectSection={(id) => goSection(id)}
                onPrev={prev}
                onNext={next}
                onBackOverview={goOverview}
                onResetView={resetSectionView}
                onZoomIn={() => zoomByFactor(1.35)}
                onZoomOut={() => zoomByFactor(1 / 1.35)}
                onToggleIsolate={() => setIsolateActive((v) => !v)}
                onOpenCropLightbox={() => setCropLightboxOpen(true)}
                onHoverSound={handleHoverSound}
              />

              {/* Layer 3: Floating glass summary card with 3D specular tilt & foreground parallax */}
              <SummaryCard
                section={activeSection}
                visible={hudVisible && sidebarVisible}
                sidebarCollapsed={sidebarCollapsed}
                cardTiltEnabled={effects.cardTilt}
                depthX={depth.nx}
                depthY={depth.ny}
                parallaxEnabled={effects.parallax}
              />
            </motion.div>
          ) : (
            <motion.div
              key="3d-visual-mode-shell"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex min-h-0 flex-1 flex-col"
            >
              <Suspense
                fallback={
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#ffd9d0]/25 border-t-[#ffd9d0]" />
                    <div className="font-display text-sm font-semibold text-[#fff1ee]">
                      Preparing 3D Anatomical Stage…
                    </div>
                  </div>
                }
              >
                <ThreeDVisualStage
                  stageViewport={stageViewport}
                  activeSection={activeSection}
                  cardTiltEnabled={effects.cardTilt}
                  onSelectSection={(id) => {
                    if (id) {
                      goSection(id);
                    } else {
                      goOverview();
                    }
                  }}
                  onPrev={prev}
                  onNext={next}
                  onSwitchToPoster={() => handleChangeViewMode('poster')}
                  onHoverSound={handleHoverSound}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overview spring-lagged 3D-tilting cursor tooltip (Poster mode only) */}
        <HoverTooltip
          section={isPosterMode ? hoveredSection : null}
          position={hoverPos}
          viewport={viewport}
          hudVisible={hudVisible && !introActive && isPosterMode}
          cardTiltEnabled={effects.cardTilt}
        />

        {/* Custom magnetic ring cursor on overview */}
        <MagneticCursor
          enabled={magneticCursorEnabled}
          hoveredSection={hoveredSection}
        />

        {/* Phase 1 expanding click ripple */}
        <ClickRipple ripples={ripples} />

        {/* Effects settings popover (Full / Lite / Off + individual toggles) */}
        <EffectsPopover
          open={effectsOpen}
          config={effects}
          activePreset={activePreset}
          onClose={() => setEffectsOpen(false)}
          onSelectPreset={applyPreset}
          onToggleEffect={handleToggleEffect}
          onReplayIntro={handleReplayIntro}
        />

        {/* 2-second micro-intro (skippable with any key or click) */}
        <IntroOverlay
          active={introActive}
          onComplete={handleIntroComplete}
        />

        <ShortcutsOverlay
          open={shortcutsOpen}
          cardTiltEnabled={effects.cardTilt}
          onClose={() => setShortcutsOpen(false)}
        />

        <CropLightbox
          section={activeSection}
          open={cropLightboxOpen}
          onClose={() => setCropLightboxOpen(false)}
        />
      </div>
    </LayoutGroup>
  );
}
