import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import {
  FULL_MAP_DISPLAY_1200,
  FULL_MAP_DISPLAY_2400,
  FULL_MAP_SRC,
  SECTION_BY_ID,
  type Section,
  type SectionId,
} from '../../data/sections';
import type { UseCameraReturn } from '../../hooks/useCamera';
import {
  computeBaseMetrics,
  zoomAroundScreenPoint,
  type ViewportSize,
} from '../../lib/cameraMath';
import { MAP_LQIP_DATA_URI } from '../../lib/mapPlaceholder';
import { preloadHiResFullMap, type LoadedCropMeta } from '../../lib/preload';
import { CinematicEffects } from './CinematicEffects';
import { HiResCropLayer } from './HiResCropLayer';
import { InteractiveOverlay } from './InteractiveOverlay';
import { SpotlightOverlay } from './SpotlightOverlay';

interface StageProps {
  camera: UseCameraReturn;
  stageViewport: ViewportSize;
  hudVisible: boolean;
  sidebarCollapsed: boolean;
  hoveredSection: Section | null;
  isolateActiveSection: boolean;
  idleHintSectionId: SectionId | null;
  loadedCrops: Partial<Record<SectionId, LoadedCropMeta>>;
  magneticCursorEnabled: boolean;
  /** Shared depth parallax input (Layer 2: artwork mid-plane) */
  depthX: MotionValue<number>;
  depthY: MotionValue<number>;
  parallaxEnabled: boolean;
  /** Micro-intro lift from a subtle 3D rotated angle */
  introActive: boolean;
  /** Show blurred low-res LQIP skeleton until map-full.jpg loads */
  skeletonEnabled: boolean;
  onHoverSection: (section: Section | null, pointer?: { x: number; y: number }) => void;
  onFocusSectionKeyboard: (section: Section | null) => void;
  onSelectSection: (id: SectionId, clickPoint?: { x: number; y: number }) => void;
}

interface ActivePointer {
  id: number;
  x: number;
  y: number;
}

const DRAG_CLICK_THRESHOLD_PX = 6;

/**
 * Full-viewport <Stage> displaying map-full.jpg with object-fit: contain on a
 * maroon-to-dark ground with zero scrolling and zero layout shift.
 */
export function Stage({
  camera,
  stageViewport,
  hudVisible,
  sidebarCollapsed,
  hoveredSection,
  isolateActiveSection,
  idleHintSectionId,
  loadedCrops,
  magneticCursorEnabled,
  depthX,
  depthY,
  parallaxEnabled,
  introActive,
  skeletonEnabled,
  onHoverSection,
  onFocusSectionKeyboard,
  onSelectSection,
}: StageProps) {
  const {
    x,
    y,
    scale,
    rotateX: cameraRotateX,
    rotateY: cameraRotateY,
    stageOpacity,
    activeSection,
    phase,
    lockingSectionId,
    cropRevealed,
    panDirection,
    zoomToScale,
    doubleClickZoomAt,
    setCameraImmediate,
    glideWithInertia,
    settleCamera,
    getLiveCamera,
  } = camera;

  const prefersReducedMotion = useReducedMotion();
  const activeSectionId = activeSection?.id ?? null;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mapImgRef = useRef<HTMLImageElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(FULL_MAP_DISPLAY_2400);
  const [useSrcSet, setUseSrcSet] = useState(true);
  const [hiResFullReady, setHiResFullReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapMissing, setMapMissing] = useState(false);

  // Guard against cached images that complete before React attaches onLoad
  useEffect(() => {
    const img = mapImgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setMapLoaded(true);
    }
  }, [displaySrc]);

  // Upgrade lazily from 2400w display artwork to full 5560w master on zoom (>= 1.6x)
  const isDeepZoom = camera.camera.scale >= 1.6;
  useEffect(() => {
    if (!isDeepZoom || hiResFullReady) return;
    preloadHiResFullMap(() => setHiResFullReady(true));
  }, [hiResFullReady, isDeepZoom]);

  const overviewParallaxActive =
    parallaxEnabled &&
    !prefersReducedMotion &&
    activeSectionId === null &&
    lockingSectionId === null &&
    phase === 'idle' &&
    !introActive;

  // Layer 2 (mid-plane) parallax & gentle 3D tilt (clamped strictly <= 3 degrees)
  const combinedX = useTransform([x, depthX], ([cx, dx]: number[]) =>
    overviewParallaxActive ? cx - dx * 6.5 : cx,
  );
  const combinedY = useTransform([y, depthY], ([cy, dy]: number[]) =>
    overviewParallaxActive ? cy - dy * 4.5 : cy,
  );
  const combinedRotateX = useTransform(
    [cameraRotateX, depthY],
    ([crx, dy]: number[]) => (overviewParallaxActive ? crx - dy * 2.2 : crx),
  );
  const combinedRotateY = useTransform(
    [cameraRotateY, depthX],
    ([cry, dx]: number[]) => (overviewParallaxActive ? cry + dx * 2.6 : cry),
  );

  const { baseWidth, baseHeight } = useMemo(
    () => computeBaseMetrics(stageViewport),
    [stageViewport],
  );

  const pointersRef = useRef<Map<number, ActivePointer>>(new Map());
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    camX: number;
    camY: number;
    scale: number;
    didDrag: boolean;
    samples: Array<{ x: number; y: number; t: number }>;
  } | null>(null);
  const pinchStartRef = useRef<{
    distance: number;
    midX: number;
    midY: number;
    camX: number;
    camY: number;
    scale: number;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  // Wheel / trackpad zoom anchored strictly at the pointer coordinate
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      const intensity = e.ctrlKey ? 0.01 : 0.0018;
      const factor = Math.exp(-e.deltaY * intensity);
      const live = getLiveCamera();
      zoomToScale(live.scale * factor, localX, localY);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [getLiveCamera, zoomToScale]);

  const beginPinchIfTwoPointers = useCallback(() => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length !== 2) {
      pinchStartRef.current = null;
      return;
    }

    const [p1, p2] = pts;
    const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const live = getLiveCamera();

    pinchStartRef.current = {
      distance: Math.max(1, distance),
      midX,
      midY,
      camX: live.x,
      camY: live.y,
      scale: live.scale,
    };
    dragStartRef.current = null;
    suppressNextClickRef.current = true;
    setIsDragging(true);
  }, [getLiveCamera]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    pointersRef.current.set(e.pointerId, {
      id: e.pointerId,
      x: localX,
      y: localY,
    });

    if (pointersRef.current.size === 2) {
      beginPinchIfTwoPointers();
      return;
    }

    if (pointersRef.current.size === 1) {
      const live = getLiveCamera();
      dragStartRef.current = {
        clientX: localX,
        clientY: localY,
        camX: live.x,
        camY: live.y,
        scale: live.scale,
        didDrag: false,
        samples: [{ x: localX, y: localY, t: performance.now() }],
      };
      suppressNextClickRef.current = false;
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    pointersRef.current.set(e.pointerId, {
      id: e.pointerId,
      x: localX,
      y: localY,
    });

    // Two-finger pinch zoom + pan
    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const start = pinchStartRef.current;
      const nextScale = start.scale * (dist / start.distance);

      const zoomed = zoomAroundScreenPoint(
        { x: start.camX, y: start.camY, scale: start.scale },
        nextScale,
        start.midX,
        start.midY,
        stageViewport,
        activeSection,
        hudVisible,
        sidebarCollapsed,
      );

      setCameraImmediate({
        x: zoomed.x + (midX - start.midX),
        y: zoomed.y + (midY - start.midY),
        scale: zoomed.scale,
      });
      return;
    }

    // Single-pointer drag pan when zoomed past overview
    const drag = dragStartRef.current;
    if (!drag) return;

    const dx = localX - drag.clientX;
    const dy = localY - drag.clientY;
    const moved = Math.hypot(dx, dy);

    if (!drag.didDrag && moved > DRAG_CLICK_THRESHOLD_PX) {
      if (drag.scale <= 1.02 && activeSectionId === null) return;
      drag.didDrag = true;
      suppressNextClickRef.current = true;
      setIsDragging(true);
      onHoverSection(null);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    if (drag.didDrag) {
      const now = performance.now();
      drag.samples.push({ x: localX, y: localY, t: now });
      while (drag.samples.length > 2 && now - drag.samples[0].t > 90) {
        drag.samples.shift();
      }

      setCameraImmediate({
        x: drag.camX + dx,
        y: drag.camY + dy,
        scale: drag.scale,
      });
    }
  };

  const handlePointerUpOrCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (pinchStartRef.current && pointersRef.current.size < 2) {
      pinchStartRef.current = null;
      setIsDragging(false);
      settleCamera();
      return;
    }

    if (dragStartRef.current?.didDrag) {
      const samples = dragStartRef.current.samples;
      let vx = 0;
      let vy = 0;
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0.008) {
          vx = (last.x - first.x) / dt;
          vy = (last.y - first.y) / dt;
        }
      }
      setIsDragging(false);
      glideWithInertia(vx, vy);
    }

    dragStartRef.current = null;
  };

  const handleSelectSectionInternal = useCallback(
    (id: SectionId, clickPoint?: { x: number; y: number }) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      onSelectSection(id, clickPoint);
    },
    [onSelectSection],
  );

  const handleDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (activeSectionId === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    doubleClickZoomAt(localX, localY);
  };

  const isPanningAllowed = camera.camera.scale > 1.02;

  const lockingSection = lockingSectionId
    ? SECTION_BY_ID[lockingSectionId]
    : null;
  const emphasizeActive = Boolean(
    activeSectionId !== null && isolateActiveSection && !lockingSection,
  );
  const spotlightSection = lockingSection
    ? lockingSection
    : activeSectionId === null
      ? !isDragging
        ? hoveredSection
        : null
      : isolateActiveSection
        ? activeSection
        : null;
  const blurOutside = Boolean(lockingSection);

  const useCustomCursor =
    magneticCursorEnabled &&
    activeSectionId === null &&
    lockingSectionId === null &&
    !introActive &&
    !isDragging;

  return (
    <main
      id="interactive-map"
      ref={stageRef}
      className={`relative z-10 flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden ${
        useCustomCursor ? 'magnetic-cursor-active' : ''
      }`}
      style={{
        perspective: '1600px',
        cursor: useCustomCursor
          ? undefined
          : isDragging
            ? 'grabbing'
            : isPanningAllowed
              ? 'grab'
              : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onDoubleClick={handleDoubleClick}
    >
      {/* Intro 3D lift wrapper: fades up cleanly from a rotated 3D tilt during the 2s micro-intro */}
      <motion.div
        initial={false}
        animate={
          introActive && !prefersReducedMotion
            ? { opacity: 0.35, scale: 0.93, rotateX: 8, rotateY: -6 }
            : { opacity: 1, scale: 1, rotateX: 0, rotateY: 0 }
        }
        transition={{
          type: 'spring',
          stiffness: 110,
          damping: 22,
          mass: 1.0,
        }}
        className="flex items-center justify-center"
      >
        {/* ONE shared camera wrapper: flat 3D-projected plane inside perspective: 1600px for 100% accurate SVG hit-testing */}
        <motion.div
          data-testid="camera-wrapper"
          className="relative shrink-0"
          style={{
            width: baseWidth,
            height: baseHeight,
            x: combinedX,
            y: combinedY,
            scale,
            rotateX: combinedRotateX,
            rotateY: combinedRotateY,
            opacity: stageOpacity,
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          {/* Page-load skeleton: blurred low-res LQIP that sharpens smoothly into full image */}
          <AnimatePresence>
            {skeletonEnabled && !mapLoaded && !mapMissing && (
              <motion.div
                key="map-lqip-skeleton"
                data-testid="map-skeleton"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                <img
                  src={MAP_LQIP_DATA_URI}
                  alt=""
                  draggable={false}
                  className="block h-full w-full scale-105 select-none object-contain blur-md"
                />
                <div className="absolute inset-0 animate-pulse bg-[#3b0a0a]/20" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Responsive display artwork (1200w / 2400w), unmodified at rest */}
          {!mapMissing && (
            <img
              ref={mapImgRef}
              src={displaySrc}
              srcSet={
                useSrcSet
                  ? `${FULL_MAP_DISPLAY_1200} 1200w, ${FULL_MAP_DISPLAY_2400} 2400w`
                  : undefined
              }
              sizes={useSrcSet ? '100vw' : undefined}
              alt="CVA Muscular System comparative vertebrate concept map"
              draggable={false}
              fetchPriority="high"
              decoding="async"
              onLoad={() => setMapLoaded(true)}
              onError={() => {
                // Graceful fallback to master map-full.jpg if responsive 2400w hasn't been generated
                if (displaySrc !== FULL_MAP_SRC) {
                  setUseSrcSet(false);
                  setDisplaySrc(FULL_MAP_SRC);
                } else {
                  setMapMissing(true);
                }
              }}
              className="block h-full w-full select-none object-contain"
              style={{
                opacity: mapLoaded ? 1 : 0,
                filter: emphasizeActive
                  ? 'grayscale(100%) brightness(0.56) contrast(0.92)'
                  : 'none',
                transition: 'opacity 320ms ease-out, filter 420ms ease-out',
              }}
            />
          )}

          {/* Full 5560x3563 master artwork crossfades in lazily ONLY on deep zoom (>= 2.25x) */}
          {hiResFullReady && isDeepZoom && !mapMissing && (
            <motion.img
              src={FULL_MAP_SRC}
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                filter: emphasizeActive
                  ? 'grayscale(100%) brightness(0.56) contrast(0.92)'
                  : 'none',
                transition: 'filter 420ms ease-out',
              }}
              className="pointer-events-none absolute inset-0 block h-full w-full select-none object-contain"
            />
          )}

          {mapMissing && (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#4a1010]/85 p-8 text-center">
              <p className="font-display text-2xl font-medium tracking-tight text-[#fff1ee] sm:text-3xl">
                CVA — Muscular System Artwork Pending
              </p>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#ffd9d0]">
                Place <code className="font-mono-num rounded bg-[#2a0707] px-1.5 py-0.5 text-[#fff1ee]">map-full.jpg</code> and
                the four section crops into{' '}
                <code className="font-mono-num rounded bg-[#2a0707] px-1.5 py-0.5 text-[#fff1ee]">public/assets/</code>.
              </p>
            </div>
          )}

          {/* Spotlight: hover dim/desaturate, Phase 1 Lock-on, & zoomed active full-color emphasis cutout */}
          <SpotlightOverlay
            section={spotlightSection}
            blurOutside={blurOutside}
            emphasizeActive={emphasizeActive}
            mapSrc={hiResFullReady && isDeepZoom ? FULL_MAP_SRC : displaySrc}
            mapLoaded={mapLoaded}
          />

          {/* Phase 3 pixel-aligned hi-res crop crossfade inside the exact same wrapper */}
          <HiResCropLayer
            activeSectionId={activeSectionId}
            revealed={cropRevealed}
            loadedCrops={loadedCrops}
          />

          {/* Shared-wrapper 2403x1540 SVG hotspot overlay */}
          <InteractiveOverlay
            activeSectionId={activeSectionId}
            hoveredSectionId={hoveredSection?.id ?? null}
            lockingSectionId={lockingSectionId}
            idleHintSectionId={idleHintSectionId}
            emphasizeActive={emphasizeActive}
            isDragging={isDragging}
            onHoverSection={onHoverSection}
            onFocusSectionKeyboard={onFocusSectionKeyboard}
            onSelectSection={handleSelectSectionInternal}
          />
        </motion.div>
      </motion.div>

      {/* Phase 2 depth-of-field radial vignette & faint opacity-only motion-blur streak */}
      <CinematicEffects
        phase={phase}
        isFocused={activeSectionId !== null}
        panDirection={panDirection}
      />
    </main>
  );
}
