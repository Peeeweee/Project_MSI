import { useCallback, useEffect, useRef, useState } from 'react';
import {
  animate,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'framer-motion';
import {
  SECTION_BY_ID,
  SECTIONS,
  type Section,
  type SectionId,
  type SectionSubZone,
} from '../data/sections';
import {
  clampCamera,
  clampCameraToSection,
  computeBboxCamera,
  computeSectionCamera,
  MAX_SCALE,
  OVERVIEW_CAMERA,
  zoomAroundScreenPoint,
  type CameraState,
  type ViewportSize,
} from '../lib/cameraMath';
import {
  GESTURE_SPRING,
  REDUCED_TRANSITION,
} from '../lib/springs';

export type TransitionPhase =
  | 'idle'
  | 'lock-on'
  | 'fly-in'
  | 'reveal'
  | 'pan-through'
  | 'zoom-out';

export interface UseCameraOptions {
  viewport: ViewportSize;
  hudVisible: boolean;
  sidebarCollapsed?: boolean;
}

export interface UseCameraReturn {
  /** Reversed 0.9s timeline back to overview + clears URL hash */
  goOverview: () => void;
  /** Enters section (1.4s 3-phase timeline from overview, or 3D pan-through from another section) */
  goSection: (id: SectionId) => void;
  /** Pan-through to next section (1 -> 2 -> 3 -> 4 -> 1) */
  next: () => void;
  /** Pan-through to previous section */
  prev: () => void;
  /** Re-centers active section to its default bbox framing */
  resetSectionView: () => void;
  /** True if the user has zoomed or panned away from the active section's default frame */
  isCustomView: boolean;
  /** Active section object, or null when on overview */
  activeSection: Section | null;
  /** Active Level-2 sub-part id inside the active section, or null when at full section fit */
  activeSubZoneId: string | null;
  /** Active Level-2 sub-part object inside the active section, or null */
  activeSubZone: SectionSubZone | null;
  /** Zooms smoothly into a specific Level-2 sub-part inside the active section (or toggles back out if already active) */
  goSubZone: (subZoneId: string | null) => void;
  /** Cycles to the next Level-2 sub-part inside the active section */
  nextSubZone: () => void;
  /** Cycles to the previous Level-2 sub-part inside the active section */
  prevSubZone: () => void;
  /** True while any camera choreography or zoom spring is active */
  isTransitioning: boolean;
  /** Current choreography phase for synchronized effects & HUD orchestration */
  phase: TransitionPhase;
  /** Section currently locked on during Phase 1 (0.0-0.5s) */
  lockingSectionId: SectionId | null;
  /** True once Phase 3 Reveal opens (pixel-aligned hi-res crop crossfade) */
  cropRevealed: boolean;
  /** True when the left HUD sidebar & summary card should be mounted/visible */
  sidebarVisible: boolean;
  /** Direction of section-to-section carousel pan (+1 forward, -1 backward) */
  panDirection: 1 | -1;
  /** Reactive camera target snapshot (for HUD readouts & spring mini-map) */
  camera: CameraState;
  /** GPU motion values for the single transformed camera wrapper */
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  /** Opacity motion value used for quick crossfade under prefers-reduced-motion */
  stageOpacity: MotionValue<number>;
  /** Gesture & fine-zoom controls (clamped to crop edges when inside a section) */
  zoomToScale: (
    desiredScale: number,
    localX?: number,
    localY?: number,
  ) => void;
  zoomByFactor: (factor: number, localX?: number, localY?: number) => void;
  doubleClickZoomAt: (localX: number, localY: number) => void;
  /** Smooth directional pan via arrow keys or on-screen D-pad (auto-zooms gently if at section fit) */
  panBy: (dx: number, dy: number) => void;
  /** Smoothly zooms to fit a specific sub-zone bbox inside the active section */
  focusBbox: (bbox: readonly [number, number, number, number]) => void;
  setCameraImmediate: (next: CameraState) => void;
  glideWithInertia: (vx: number, vy: number) => void;
  settleCamera: (next?: CameraState) => void;
  getLiveCamera: () => CameraState;
}

const FLY_IN_SPRING = {
  type: 'spring' as const,
  stiffness: 130,
  damping: 24,
  mass: 1.05,
};

const ROTATE_SETTLE_SPRING = {
  type: 'spring' as const,
  stiffness: 140,
  damping: 15,
  mass: 0.95,
};

const PAN_THROUGH_SPRING = {
  type: 'spring' as const,
  stiffness: 150,
  damping: 25,
  mass: 1.0,
};

const ZOOM_OUT_SPRING = {
  type: 'spring' as const,
  stiffness: 205,
  damping: 28,
  mass: 0.9,
};

function parseHashToSectionId(hash: string): SectionId | null {
  const cleaned = hash.replace(/^#/, '').trim().toLowerCase();
  if (cleaned in SECTION_BY_ID) {
    return cleaned as SectionId;
  }
  return null;
}

function pushHashState(id: SectionId | null) {
  if (typeof window === 'undefined') return;
  const currentId = parseHashToSectionId(window.location.hash);
  if (currentId === id) return;

  if (id) {
    window.history.pushState({ section: id }, '', `#${id}`);
  } else if (window.location.hash) {
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.pushState({ section: null }, '', cleanUrl);
  }
}

function getSectionDirection(fromId: SectionId, toId: SectionId): 1 | -1 {
  const fromIdx = SECTIONS.findIndex((s) => s.id === fromId);
  const toIdx = SECTIONS.findIndex((s) => s.id === toId);
  if (fromIdx === toIdx) return 1;
  const forwardDist = (toIdx - fromIdx + SECTIONS.length) % SECTIONS.length;
  return forwardDist <= SECTIONS.length / 2 ? 1 : -1;
}

export function useCamera({
  viewport,
  hudVisible,
  sidebarCollapsed = true,
}: UseCameraOptions): UseCameraReturn {
  const prefersReducedMotion = useReducedMotion();

  const initialSectionId =
    typeof window !== 'undefined'
      ? parseHashToSectionId(window.location.hash)
      : null;

  const initialCamera = initialSectionId
    ? computeSectionCamera(
        SECTION_BY_ID[initialSectionId],
        viewport,
        hudVisible,
        sidebarCollapsed,
      )
    : OVERVIEW_CAMERA;

  const [activeSectionId, setActiveSectionId] = useState<SectionId | null>(
    initialSectionId,
  );
  const [activeSubZoneId, setActiveSubZoneId] = useState<string | null>(null);
  const [camera, setCamera] = useState<CameraState>(initialCamera);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [lockingSectionId, setLockingSectionId] = useState<SectionId | null>(null);
  const [cropRevealed, setCropRevealed] = useState<boolean>(
    Boolean(initialSectionId),
  );
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(
    Boolean(initialSectionId),
  );
  const [panDirection, setPanDirection] = useState<1 | -1>(1);

  const x = useMotionValue(initialCamera.x);
  const y = useMotionValue(initialCamera.y);
  const scale = useMotionValue(initialCamera.scale);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const stageOpacity = useMotionValue(1);

  const targetRef = useRef<CameraState>(initialCamera);
  const activeIdRef = useRef<SectionId | null>(initialSectionId);
  const viewportRef = useRef<ViewportSize>(viewport);
  const hudVisibleRef = useRef<boolean>(hudVisible);
  const sidebarCollapsedRef = useRef<boolean>(sidebarCollapsed);
  const controlsRef = useRef<AnimationPlaybackControls[]>([]);
  const timersRef = useRef<number[]>([]);
  const tokenRef = useRef(0);

  activeIdRef.current = activeSectionId;
  viewportRef.current = viewport;
  hudVisibleRef.current = hudVisible;
  sidebarCollapsedRef.current = sidebarCollapsed;

  const clearChoreography = useCallback(() => {
    for (const ctrl of controlsRef.current) {
      ctrl.stop();
    }
    controlsRef.current = [];
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const getLiveCamera = useCallback((): CameraState => {
    return {
      x: x.get(),
      y: y.get(),
      scale: scale.get(),
    };
  }, [scale, x, y]);

  const clampForContext = useCallback((next: CameraState): CameraState => {
    const currentId = activeIdRef.current;
    if (currentId) {
      return clampCameraToSection(
        next,
        SECTION_BY_ID[currentId],
        viewportRef.current,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );
    }
    return clampCamera(next, viewportRef.current, 0);
  }, []);

  const setCameraImmediate = useCallback(
    (next: CameraState) => {
      tokenRef.current += 1;
      clearChoreography();
      setIsTransitioning(false);
      setPhase('idle');
      setLockingSectionId(null);

      const clamped = clampForContext(next);
      targetRef.current = clamped;
      x.set(clamped.x);
      y.set(clamped.y);
      scale.set(clamped.scale);
      rotateX.set(0);
      rotateY.set(0);
      stageOpacity.set(1);
    },
    [clampForContext, clearChoreography, rotateX, rotateY, scale, stageOpacity, x, y],
  );

  /**
   * Quick crossfade helper used under prefers-reduced-motion to replace the
   * flying camera with a crisp 240ms opacity dissolve (zero camera travel).
   */
  const runReducedMotionCrossfade = useCallback(
    (
      token: number,
      target: CameraState,
      nextId: SectionId | null,
      showCropAndSidebar: boolean,
    ) => {
      setIsTransitioning(true);
      setLockingSectionId(null);
      setPhase('idle');

      controlsRef.current = [
        animate(stageOpacity, 0.14, { duration: 0.11, ease: 'easeOut' }),
      ];

      schedule(() => {
        if (tokenRef.current !== token) return;
        activeIdRef.current = nextId;
        setActiveSectionId(nextId);
        setCamera(target);
        setCropRevealed(showCropAndSidebar);
        setSidebarVisible(showCropAndSidebar);

        // Instant jump while dimmed — zero flying motion across the screen
        x.jump(target.x);
        y.jump(target.y);
        scale.jump(target.scale);
        rotateX.jump(0);
        rotateY.jump(0);

        controlsRef.current = [
          animate(stageOpacity, 1, { duration: 0.13, ease: 'easeOut' }),
        ];
      }, 115);

      schedule(() => {
        if (tokenRef.current === token) {
          setIsTransitioning(false);
        }
      }, 250);
    },
    [rotateX, rotateY, scale, schedule, stageOpacity, x, y],
  );

  /**
   * 1.4s Signature Enter Choreography (Overview -> Section)
   */
  const runEnterTimeline = useCallback(
    (id: SectionId, syncHistory: boolean) => {
      const section = SECTION_BY_ID[id];
      const token = ++tokenRef.current;
      clearChoreography();

      if (syncHistory) {
        pushHashState(id);
      }

      const target = computeSectionCamera(
        section,
        viewportRef.current,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );
      targetRef.current = target;

      if (prefersReducedMotion) {
        runReducedMotionCrossfade(token, target, id, true);
        return;
      }

      // PHASE 1 (0.0s - 0.3s): "Lock on"
      setIsTransitioning(true);
      setPhase('lock-on');
      setLockingSectionId(id);
      setCropRevealed(false);
      setSidebarVisible(false);

      controlsRef.current = [
        animate(rotateY, -4, { duration: 0.28, ease: [0.22, 1, 0.36, 1] }),
        animate(rotateX, 1.4, { duration: 0.28, ease: [0.22, 1, 0.36, 1] }),
        animate(scale, Math.max(scale.get(), 1.035), {
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1],
        }),
      ];

      // PHASE 2 (0.3s - 1.0s): "Fly in"
      // Clear lock-on backdrop-filter right as fly-in starts so Phase 2 stays 100% compositor-only
      schedule(() => {
        if (tokenRef.current !== token) return;
        activeIdRef.current = id;
        setActiveSectionId(id);
        setCamera(target);
        setLockingSectionId(null);
        setPhase('fly-in');

        controlsRef.current = [
          animate(x, target.x, FLY_IN_SPRING),
          animate(y, target.y, FLY_IN_SPRING),
          animate(scale, target.scale, FLY_IN_SPRING),
          animate(rotateY, 0, ROTATE_SETTLE_SPRING),
          animate(rotateX, 0, ROTATE_SETTLE_SPRING),
        ];
      }, 300);

      // PHASE 3 (0.9s - 1.4s): "Reveal"
      schedule(() => {
        if (tokenRef.current !== token) return;
        setPhase('reveal');
        setCropRevealed(true);
        setSidebarVisible(true);
      }, 900);

      schedule(() => {
        if (tokenRef.current !== token) return;
        setPhase('idle');
        setIsTransitioning(false);
      }, 1400);
    },
    [
      clearChoreography,
      prefersReducedMotion,
      rotateX,
      rotateY,
      runReducedMotionCrossfade,
      scale,
      schedule,
      x,
      y,
    ],
  );

  /**
   * Section-to-Section Pan-Through (3D carousel pull-back & slide, never overview)
   */
  const runPanThroughTimeline = useCallback(
    (
      fromId: SectionId,
      toId: SectionId,
      explicitDir: 1 | -1 | undefined,
      syncHistory: boolean,
    ) => {
      const targetSection = SECTION_BY_ID[toId];
      const token = ++tokenRef.current;
      clearChoreography();

      if (syncHistory) {
        pushHashState(toId);
      }

      const dir = explicitDir ?? getSectionDirection(fromId, toId);
      setPanDirection(dir);

      const target = computeSectionCamera(
        targetSection,
        viewportRef.current,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );
      targetRef.current = target;

      if (prefersReducedMotion) {
        runReducedMotionCrossfade(token, target, toId, true);
        return;
      }

      const live = getLiveCamera();
      const pullbackScale = Math.max(
        1.18,
        Math.min(live.scale, target.scale) * 0.82,
      );
      const midX = live.x + (target.x - live.x) * 0.34;
      const midY = live.y + (target.y - live.y) * 0.34;

      setIsTransitioning(true);
      setPhase('pan-through');
      setLockingSectionId(null);
      setCropRevealed(false);
      setSidebarVisible(true);

      controlsRef.current = [
        animate(scale, pullbackScale, {
          duration: 0.24,
          ease: [0.32, 0, 0.24, 1],
        }),
        animate(x, midX, { duration: 0.24, ease: [0.32, 0, 0.24, 1] }),
        animate(y, midY, { duration: 0.24, ease: [0.32, 0, 0.24, 1] }),
        animate(rotateY, -dir * 7.2, {
          duration: 0.24,
          ease: [0.32, 0, 0.24, 1],
        }),
        animate(rotateX, 1.4, { duration: 0.24, ease: [0.32, 0, 0.24, 1] }),
      ];

      schedule(() => {
        if (tokenRef.current !== token) return;
        activeIdRef.current = toId;
        setActiveSectionId(toId);
        setCamera(target);

        controlsRef.current = [
          animate(x, target.x, PAN_THROUGH_SPRING),
          animate(y, target.y, PAN_THROUGH_SPRING),
          animate(scale, target.scale, PAN_THROUGH_SPRING),
          animate(rotateY, 0, {
            type: 'spring',
            stiffness: 115,
            damping: 13,
            mass: 0.95,
            velocity: dir * 52,
          }),
          animate(rotateX, 0, ROTATE_SETTLE_SPRING),
        ];
      }, 240);

      schedule(() => {
        if (tokenRef.current !== token) return;
        setCropRevealed(true);
        setPhase('reveal');
      }, 700);

      schedule(() => {
        if (tokenRef.current !== token) return;
        setPhase('idle');
        setIsTransitioning(false);
      }, 1050);
    },
    [
      clearChoreography,
      getLiveCamera,
      prefersReducedMotion,
      rotateX,
      rotateY,
      runReducedMotionCrossfade,
      scale,
      schedule,
      x,
      y,
    ],
  );

  /**
   * Faster 0.9s Reversed Zoom-Out Timeline (Section -> Overview)
   */
  const runZoomOutTimeline = useCallback(
    (syncHistory: boolean) => {
      const token = ++tokenRef.current;
      clearChoreography();

      if (syncHistory) {
        pushHashState(null);
      }

      targetRef.current = OVERVIEW_CAMERA;

      if (prefersReducedMotion) {
        runReducedMotionCrossfade(token, OVERVIEW_CAMERA, null, false);
        return;
      }

      setIsTransitioning(true);
      setPhase('zoom-out');
      setLockingSectionId(null);
      setCropRevealed(false);
      setSidebarVisible(false);

      controlsRef.current = [
        animate(rotateY, 3.2, { duration: 0.16, ease: [0.32, 0, 0.24, 1] }),
        animate(rotateX, -1.0, { duration: 0.16, ease: [0.32, 0, 0.24, 1] }),
      ];

      schedule(() => {
        if (tokenRef.current !== token) return;
        activeIdRef.current = null;
        setActiveSectionId(null);
        setCamera(OVERVIEW_CAMERA);

        controlsRef.current = [
          animate(x, 0, ZOOM_OUT_SPRING),
          animate(y, 0, ZOOM_OUT_SPRING),
          animate(scale, 1, ZOOM_OUT_SPRING),
          animate(rotateY, 0, ROTATE_SETTLE_SPRING),
          animate(rotateX, 0, ROTATE_SETTLE_SPRING),
        ];
      }, 150);

      schedule(() => {
        if (tokenRef.current !== token) return;
        setPhase('idle');
        setIsTransitioning(false);
      }, 900);
    },
    [
      clearChoreography,
      prefersReducedMotion,
      rotateX,
      rotateY,
      runReducedMotionCrossfade,
      scale,
      schedule,
      x,
      y,
    ],
  );

  const animateGestureTo = useCallback(
    (
      nextState: CameraState,
      velocity?: { vx: number; vy: number },
    ) => {
      const clamped = clampForContext(nextState);
      targetRef.current = clamped;
      setCamera(clamped);
      clearChoreography();

      if (prefersReducedMotion) {
        controlsRef.current = [
          animate(x, clamped.x, REDUCED_TRANSITION),
          animate(y, clamped.y, REDUCED_TRANSITION),
          animate(scale, clamped.scale, REDUCED_TRANSITION),
        ];
        rotateX.set(0);
        rotateY.set(0);
        return;
      }

      const xTransition = velocity
        ? { type: 'spring' as const, stiffness: 155, damping: 24, mass: 0.9, velocity: velocity.vx }
        : GESTURE_SPRING;
      const yTransition = velocity
        ? { type: 'spring' as const, stiffness: 155, damping: 24, mass: 0.9, velocity: velocity.vy }
        : GESTURE_SPRING;

      controlsRef.current = [
        animate(x, clamped.x, xTransition),
        animate(y, clamped.y, yTransition),
        animate(scale, clamped.scale, GESTURE_SPRING),
        animate(rotateX, 0, GESTURE_SPRING),
        animate(rotateY, 0, GESTURE_SPRING),
      ];
    },
    [clampForContext, clearChoreography, prefersReducedMotion, rotateX, rotateY, scale, x, y],
  );

  const resetSectionView = useCallback(() => {
    const currentId = activeIdRef.current;
    setActiveSubZoneId(null);
    if (!currentId) {
      runZoomOutTimeline(true);
      return;
    }
    const target = computeSectionCamera(
      SECTION_BY_ID[currentId],
      viewportRef.current,
      hudVisibleRef.current,
      sidebarCollapsedRef.current,
    );
    animateGestureTo(target);
  }, [animateGestureTo, runZoomOutTimeline]);

  const goSection = useCallback(
    (id: SectionId) => {
      const current = activeIdRef.current;
      setActiveSubZoneId(null);
      if (current && current !== id) {
        runPanThroughTimeline(current, id, undefined, true);
        return;
      }
      if (current === id) {
        resetSectionView();
        return;
      }
      runEnterTimeline(id, true);
    },
    [resetSectionView, runEnterTimeline, runPanThroughTimeline],
  );

  const goOverview = useCallback(() => {
    setActiveSubZoneId(null);
    if (activeIdRef.current === null && targetRef.current.scale <= 1.02) {
      return;
    }
    runZoomOutTimeline(true);
  }, [runZoomOutTimeline]);

  const cycleBy = useCallback(
    (delta: 1 | -1) => {
      const currentId = activeIdRef.current;
      setActiveSubZoneId(null);
      if (!currentId) {
        const first = delta === 1 ? SECTIONS[0] : SECTIONS[SECTIONS.length - 1];
        runEnterTimeline(first.id, true);
        return;
      }

      const idx = SECTIONS.findIndex((s) => s.id === currentId);
      const nextIdx = (idx + delta + SECTIONS.length) % SECTIONS.length;
      runPanThroughTimeline(currentId, SECTIONS[nextIdx].id, delta, true);
    },
    [runEnterTimeline, runPanThroughTimeline],
  );

  const next = useCallback(() => cycleBy(1), [cycleBy]);
  const prev = useCallback(() => cycleBy(-1), [cycleBy]);

  /**
   * Inertial glide after releasing a drag gesture inside a zoomed section,
   * softly cushioned and clamped strictly to the active crop edges.
   */
  const glideWithInertia = useCallback(
    (vx: number, vy: number) => {
      const live = getLiveCamera();
      if (!activeIdRef.current && live.scale <= 1.03) {
        runZoomOutTimeline(true);
        return;
      }

      const speed = Math.hypot(vx, vy);
      if (prefersReducedMotion || speed < 90) {
        animateGestureTo(live);
        return;
      }

      // Project smooth momentum distance and clamp strictly to crop edges
      const projected = {
        x: live.x + vx * 0.18,
        y: live.y + vy * 0.18,
        scale: live.scale,
      };
      animateGestureTo(projected, { vx: vx * 0.65, vy: vy * 0.65 });
    },
    [animateGestureTo, getLiveCamera, prefersReducedMotion, runZoomOutTimeline],
  );

  const settleCamera = useCallback(
    (nextState?: CameraState) => {
      const live = nextState ?? getLiveCamera();
      if (!activeIdRef.current && live.scale <= 1.03) {
        runZoomOutTimeline(true);
        return;
      }
      animateGestureTo(live);
    },
    [animateGestureTo, getLiveCamera, runZoomOutTimeline],
  );

  const zoomToScale = useCallback(
    (desiredScale: number, localX?: number, localY?: number) => {
      const vp = viewportRef.current;
      const currentSection = activeIdRef.current
        ? SECTION_BY_ID[activeIdRef.current]
        : null;
      const cx = localX ?? vp.width / 2;
      const cy = localY ?? vp.height / 2;

      const nextState = zoomAroundScreenPoint(
        targetRef.current,
        desiredScale,
        cx,
        cy,
        vp,
        currentSection,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );

      if (!currentSection && nextState.scale <= 1.02) {
        runZoomOutTimeline(true);
        return;
      }

      animateGestureTo(nextState);
    },
    [animateGestureTo, runZoomOutTimeline],
  );

  const zoomByFactor = useCallback(
    (factor: number, localX?: number, localY?: number) => {
      zoomToScale(targetRef.current.scale * factor, localX, localY);
    },
    [zoomToScale],
  );

  /**
   * Smooth directional pan for keyboard arrow keys (↑ ↓ ← →) and on-screen D-pad.
   * Note: passing positive dy moves the viewport UP over the poster (revealing top
   * details); negative dy moves the viewport DOWN (revealing lower details).
   * If the section is still at full-fit scale with no pan slack, gently zooms in
   * to a readable close-up while moving in the requested direction.
   */
  const panBy = useCallback(
    (dx: number, dy: number) => {
      const currentId = activeIdRef.current;
      const live = targetRef.current;

      if (!currentId) {
        if (live.scale <= 1.02) return;
        animateGestureTo({
          x: live.x + dx,
          y: live.y + dy,
          scale: live.scale,
        });
        return;
      }

      const section = SECTION_BY_ID[currentId];
      const fitCam = computeSectionCamera(
        section,
        viewportRef.current,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );

      // If still near section fit (e.g. tall Branchiomeric at ~1.08x), auto-zoom cleanly so arrow panning glides smoothly
      const needsBoost = live.scale < Math.max(fitCam.scale * 1.25, 1.95);
      const nextScale = needsBoost
        ? Math.min(MAX_SCALE, Math.max(fitCam.scale * 1.45, 2.1))
        : live.scale;

      let baseX = live.x;
      let baseY = live.y;
      if (needsBoost) {
        const vp = viewportRef.current;
        const zoomed = zoomAroundScreenPoint(
          live,
          nextScale,
          vp.width / 2,
          vp.height / 2,
          vp,
          section,
          hudVisibleRef.current,
          sidebarCollapsedRef.current,
        );
        baseX = zoomed.x;
        baseY = zoomed.y;
      }

      animateGestureTo({
        x: baseX + dx,
        y: baseY + dy,
        scale: nextScale,
      });
    },
    [animateGestureTo],
  );

  /**
   * Smoothly focuses a specific sub-zone bbox (e.g. Branchiomeric Extrinsic Eye,
   * Mandibular Arch, or Hyoid & Branchial) inside the active section.
   */
  const focusBbox = useCallback(
    (bbox: readonly [number, number, number, number]) => {
      const currentId = activeIdRef.current;
      if (currentId) {
        const match = SECTION_BY_ID[currentId].subZones.find(
          (z) =>
            (z.bbox[0] === bbox[0] &&
              z.bbox[1] === bbox[1] &&
              z.bbox[2] === bbox[2] &&
              z.bbox[3] === bbox[3]) ||
            z.cards?.some(
              (c) =>
                c.bbox[0] === bbox[0] &&
                c.bbox[1] === bbox[1] &&
                c.bbox[2] === bbox[2] &&
                c.bbox[3] === bbox[3],
            ),
        );
        if (match) {
          setActiveSubZoneId(match.id);
        }
      }
      const nextState = computeBboxCamera(
        bbox,
        viewportRef.current,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );
      animateGestureTo(nextState);
    },
    [animateGestureTo],
  );

  const goSubZone = useCallback(
    (subZoneId: string | null) => {
      const currentId = activeIdRef.current;
      if (!currentId || !subZoneId) {
        resetSectionView();
        return;
      }
      const section = SECTION_BY_ID[currentId];
      const zone = section.subZones.find((z) => z.id === subZoneId);
      if (!zone) {
        resetSectionView();
        return;
      }
      setActiveSubZoneId(zone.id);
      const nextState = computeBboxCamera(
        zone.bbox,
        viewportRef.current,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );
      animateGestureTo(nextState);
    },
    [animateGestureTo, resetSectionView],
  );

  const cycleSubZone = useCallback(
    (delta: 1 | -1) => {
      const currentId = activeIdRef.current;
      if (!currentId) return;
      const zones = SECTION_BY_ID[currentId].subZones;
      if (zones.length === 0) return;

      const curIdx = activeSubZoneId
        ? zones.findIndex((z) => z.id === activeSubZoneId)
        : -1;
      const nextIdx =
        curIdx === -1
          ? delta === 1
            ? 0
            : zones.length - 1
          : (curIdx + delta + zones.length) % zones.length;
      const targetZone = zones[nextIdx];
      if (targetZone) {
        goSubZone(targetZone.id);
      }
    },
    [activeSubZoneId, goSubZone],
  );

  const nextSubZone = useCallback(() => cycleSubZone(1), [cycleSubZone]);
  const prevSubZone = useCallback(() => cycleSubZone(-1), [cycleSubZone]);

  /**
   * Click or double-click inside a zoomed section zooms smoothly into the clicked point
   * (or resets to the section's default fit if already deeply zoomed).
   */
  const doubleClickZoomAt = useCallback(
    (localX: number, localY: number) => {
      const currentId = activeIdRef.current;
      if (!currentId) return;

      const fitCam = computeSectionCamera(
        SECTION_BY_ID[currentId],
        viewportRef.current,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );
      const live = getLiveCamera();

      if (live.scale >= Math.min(MAX_SCALE - 0.35, Math.max(fitCam.scale * 1.95, 3.2))) {
        resetSectionView();
      } else {
        const targetScale = Math.min(MAX_SCALE, Math.max(live.scale * 1.65, 2.35));
        zoomToScale(targetScale, localX, localY);
      }
    },
    [getLiveCamera, resetSectionView, zoomToScale],
  );

  // Sync camera with browser Back/Forward & manual hash edits (#axial, etc.)
  useEffect(() => {
    const syncFromHash = () => {
      const hashId = parseHashToSectionId(window.location.hash);
      const current = activeIdRef.current;
      if (hashId === current) return;

      if (hashId) {
        if (current) {
          runPanThroughTimeline(current, hashId, undefined, false);
        } else {
          runEnterTimeline(hashId, false);
        }
      } else {
        runZoomOutTimeline(false);
      }
    };

    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('popstate', syncFromHash);
    };
  }, [runEnterTimeline, runPanThroughTimeline, runZoomOutTimeline]);

  // Keep camera aligned across viewport resizes (zero layout shift)
  useEffect(() => {
    if (activeIdRef.current) {
      const section = SECTION_BY_ID[activeIdRef.current];
      const nextState = computeSectionCamera(
        section,
        viewport,
        hudVisibleRef.current,
        sidebarCollapsedRef.current,
      );
      setCameraImmediate(nextState);
      setCamera(nextState);
    } else {
      const clamped = clampCamera(targetRef.current, viewport, 0);
      setCameraImmediate(clamped);
      setCamera(clamped);
    }
  }, [viewport, setCameraImmediate]);

  // Smoothly re-center & scale active section whenever the left rail collapses or expands
  const prevCollapsedRef = useRef(sidebarCollapsed);
  useEffect(() => {
    if (prevCollapsedRef.current === sidebarCollapsed) return;
    prevCollapsedRef.current = sidebarCollapsed;
    if (activeIdRef.current) {
      const section = SECTION_BY_ID[activeIdRef.current];
      const nextState = computeSectionCamera(
        section,
        viewportRef.current,
        hudVisibleRef.current,
        sidebarCollapsed,
      );
      animateGestureTo(nextState);
    }
  }, [animateGestureTo, sidebarCollapsed]);

  useEffect(() => clearChoreography, [clearChoreography]);

  const activeSection = activeSectionId ? SECTION_BY_ID[activeSectionId] : null;
  const activeSubZone =
    activeSection && activeSubZoneId
      ? activeSection.subZones.find((z) => z.id === activeSubZoneId) ?? null
      : null;

  // Determine whether the user has zoomed or panned away from the section's default frame
  const isCustomView = (() => {
    if (!activeSection) return camera.scale > 1.03;
    if (activeSubZoneId !== null) return true;
    const fitCam = computeSectionCamera(
      activeSection,
      viewport,
      hudVisible,
      sidebarCollapsed,
    );
    return (
      Math.abs(camera.scale - fitCam.scale) > 0.04 ||
      Math.abs(camera.x - fitCam.x) > 8 ||
      Math.abs(camera.y - fitCam.y) > 8
    );
  })();

  return {
    goOverview,
    goSection,
    next,
    prev,
    resetSectionView,
    isCustomView,
    activeSection,
    activeSubZoneId,
    activeSubZone,
    goSubZone,
    nextSubZone,
    prevSubZone,
    isTransitioning,
    phase,
    lockingSectionId,
    cropRevealed,
    sidebarVisible,
    panDirection,
    camera,
    x,
    y,
    scale,
    rotateX,
    rotateY,
    stageOpacity,
    zoomToScale,
    zoomByFactor,
    doubleClickZoomAt,
    panBy,
    focusBbox,
    setCameraImmediate,
    glideWithInertia,
    settleCamera,
    getLiveCamera,
  };
}
