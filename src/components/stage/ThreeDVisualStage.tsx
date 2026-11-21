import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Grid2x2,
  Maximize2,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  RotateCcw,
  Scan,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import {
  SECTION_BY_ID,
  SECTIONS,
  type Section,
  type SectionId,
} from '../../data/sections';
import {
  SPECIMENS_BY_SECTION,
  type SpecimenCard,
} from '../../data/specimens';
import {
  getMuscleMetadata,
  MUSCLE_COUNT_BY_SECTION,
  type MuscleMetadata,
} from '../../data/muscleMapping';
import {
  SUGGESTED_VERTEBRATES_BY_CARD,
  VERTEBRATE_BY_ID,
  VERTEBRATES,
  type AnatomicalSubPart,
  type VertebrateId,
} from '../../data/vertebrates';
import type { ViewportSize } from '../../lib/cameraMath';
import { TiltCard } from '../hud/TiltCard';
import {
  MuscleModelScene,
  type CameraAnglePreset,
} from './MuscleModelScene';
import { AnimalSpecimenScene } from './AnimalSpecimenScene';

export interface ThreeDVisualStageProps {
  stageViewport: ViewportSize;
  activeSection: Section | null;
  cardTiltEnabled: boolean;
  onSelectSection: (id: SectionId | null) => void;
  onPrev: () => void;
  onNext: () => void;
  onSwitchToPoster: () => void;
  onHoverSound?: () => void;
}

const CARD_SPRING = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 26,
  mass: 0.9,
};

class WebGLErrorBoundary extends Component<
  { children: ReactNode; onSwitchToPoster: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <div className="hud-glass max-w-md rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold text-[#fff1ee]">
              3D WebGL Renderer Unavailable
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#ffd9d0]">
              Your browser could not initialize a WebGL context for the 3D
              comparative vertebrate models. You can return to the
              high-resolution interactive poster at any time.
            </p>
            <button
              type="button"
              onClick={this.props.onSwitchToPoster}
              className="hud-btn mt-4 rounded-xl bg-[#fff1ee] px-4 py-2 text-xs font-semibold text-[#3b0a0a]"
            >
              Return to Poster Mode
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Interactive Comparative Vertebrate 3D Model Studio:
 * Smoothly transitions from Poster Mode into an interactive 3D exhibit featuring:
 *  - Human (177-muscle clickable anatomical model with X-Ray dissection)
 *  - Shark, Teleost Fish, Frog, Crocodile, and Bird (animated 3D vertebrates with
 *    live bone-tracked CVA anatomical callouts for Axial, Appendicular,
 *    Hypobranchial, and Branchiomeric musculature)
 * Paired side-by-side with the poster's 12 comparative vertebrate specimen plates.
 */
export function ThreeDVisualStage({
  stageViewport,
  activeSection,
  cardTiltEnabled,
  onSelectSection,
  onPrev,
  onNext,
  onSwitchToPoster,
  onHoverSound,
}: ThreeDVisualStageProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const activeId = activeSection?.id ?? null;
  const isDesktop = stageViewport.width >= 1024;

  const [vertebrateId, setVertebrateId] = useState<VertebrateId>('human');
  const [anglePreset, setAnglePreset] = useState<CameraAnglePreset>('anterior');
  const [xrayFocus, setXrayFocus] = useState(true);
  const [animalWireframe, setAnimalWireframe] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [selectedSubPartId, setSelectedSubPartId] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleMetadata | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleMetadata | null>(null);
  const [focusedSpecimen, setFocusedSpecimen] = useState<SpecimenCard | null>(null);

  const specimen = VERTEBRATE_BY_ID[vertebrateId];
  const isHuman = vertebrateId === 'human';

  // Reset per-specimen animation clip & angle cleanly when switching vertebrates
  const handleSelectVertebrate = useCallback(
    (nextId: VertebrateId) => {
      if (nextId === vertebrateId) return;
      onHoverSound?.();
      const target = VERTEBRATE_BY_ID[nextId];
      setVertebrateId(nextId);
      setActiveAnimation(target.defaultAnimation ?? null);
      setAnglePreset('anterior');
      setSelectedMuscle(null);
      setHoveredMuscle(null);
      setSelectedSubPartId(null);
      setAutoOrbit(false);
      setResetTrigger((n) => n + 1);
    },
    [onHoverSound, vertebrateId],
  );

  // Clear individual muscle, sub-part & specimen modal smoothly on section transitions
  useEffect(() => {
    setSelectedMuscle(null);
    setHoveredMuscle(null);
    setSelectedSubPartId(null);
    setFocusedSpecimen(null);
    setAnglePreset('anterior');
  }, [activeId]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
    };
  }, []);

  const handleHoverMuscle = useCallback(
    (muscle: MuscleMetadata | null) => {
      setHoveredMuscle((prev) => {
        if (muscle && prev?.id !== muscle.id) {
          onHoverSound?.();
        }
        return muscle;
      });
    },
    [onHoverSound],
  );

  const handleSelectMuscle = useCallback((muscle: MuscleMetadata | null) => {
    setSelectedMuscle(muscle);
    if (!muscle) setSelectedSubPartId(null);
  }, []);

  const handleSelectSubPart = useCallback(
    (part: AnatomicalSubPart) => {
      onHoverSound?.();
      setSelectedSubPartId((prev) => {
        const nextId = prev === part.id ? null : part.id;
        if (isHuman) {
          if (nextId && part.muscleId) {
            const meta = getMuscleMetadata(part.muscleId) ?? null;
            setSelectedMuscle(meta);
          } else {
            setSelectedMuscle(null);
          }
        }
        return nextId;
      });
    },
    [isHuman, onHoverSound],
  );

  const handleResetView = useCallback(() => {
    setAutoOrbit(false);
    setSelectedMuscle(null);
    setSelectedSubPartId(null);
    setAnglePreset('anterior');
    setResetTrigger((n) => n + 1);
  }, []);

  const activeSpecimens = activeSection
    ? SPECIMENS_BY_SECTION[activeSection.id]
    : [];
  const inspectedMuscle = isHuman ? (selectedMuscle ?? hoveredMuscle) : null;
  const inspectedSection = inspectedMuscle
    ? SECTION_BY_ID[inspectedMuscle.sectionId]
    : null;
  const activeCallout = activeId ? specimen.callouts[activeId] : null;
  const selectedSubPart =
    activeCallout?.parts.find((p) => p.id === selectedSubPartId) ?? null;

  return (
    <motion.main
      id="interactive-map"
      data-testid="three-d-stage"
      initial={
        prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.975, y: 8 }
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.975, y: 6 }
      }
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
    >
      {/* Left Column (Desktop): Collapsible TV-Friendly 3D Section Switcher & Precise Inspector */}
      {leftCollapsed ? (
        <aside
          aria-label="Minimized 3D controls"
          className="z-20 hidden w-[54px] shrink-0 flex-col items-center gap-2 border-r border-[#ffd9d0]/14 bg-[#1c0405]/76 px-1.5 py-3 backdrop-blur-md md:flex"
        >
          <button
            type="button"
            data-testid="3d-left-expand"
            onClick={() => setLeftCollapsed(false)}
            aria-label="Expand 3D anatomical inspector"
            title="Expand left 3D menu"
            className="hud-btn flex h-9 w-9 items-center justify-center rounded-xl border border-[#ffd9d0]/20 bg-[#fff1ee]/8 text-[#ffd9d0] hover:bg-[#fff1ee]/16 hover:text-[#fff1ee]"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>

          <span aria-hidden="true" className="my-0.5 h-px w-6 bg-[#ffd9d0]/16" />

          {SECTIONS.map((sec) => {
            const isActive = activeId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                data-testid={`3d-region-${sec.id}`}
                onClick={() => onSelectSection(isActive ? null : sec.id)}
                title={`${sec.n}. ${sec.name} — ${sec.owner}`}
                aria-pressed={isActive}
                className="hud-btn flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold transition-colors"
                style={{
                  backgroundColor: isActive ? sec.accent : `${sec.accent}24`,
                  borderColor: isActive ? '#fff1ee' : `${sec.accent}88`,
                  color: isActive ? sec.badgeText : '#fff1ee',
                }}
              >
                <span className="font-mono-num">{sec.n}</span>
              </button>
            );
          })}
        </aside>
      ) : (
      <aside
        aria-label="3D comparative anatomy inspector"
        className="z-20 hidden shrink-0 flex-col gap-2 overflow-y-auto border-r border-[#ffd9d0]/14 bg-[#1c0405]/72 p-3 backdrop-blur-md md:flex md:w-[238px]"
      >
        {/* Active Vertebrate Clade Pill + Minimize button */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[#ffd9d0]/18 bg-[#280606]/90 px-2.5 py-1 text-[10px] font-medium text-[#ffd9d0]">
            <Orbit className="h-3 w-3 shrink-0 text-[#ffd9d0]" />
            <span className="truncate">
              <strong className="font-semibold text-[#fff1ee]">
                {specimen.clade}
              </strong>
            </span>
          </div>
          <button
            type="button"
            data-testid="3d-left-collapse"
            onClick={() => setLeftCollapsed(true)}
            aria-label="Minimize 3D left menu"
            title="Minimize left menu for more screen space"
            className="hud-btn flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#ffd9d0] hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Compact CVA Section Switcher */}
        <div className="flex flex-col gap-1.5">
          {SECTIONS.map((sec) => {
            const isActive = activeId === sec.id;
            const callout = specimen.callouts[sec.id];
            return (
              <button
                key={sec.id}
                type="button"
                data-testid={`3d-region-${sec.id}`}
                onClick={() => onSelectSection(isActive ? null : sec.id)}
                onMouseEnter={() => onHoverSound?.()}
                aria-pressed={isActive}
                className="hud-btn group flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-colors"
                style={{
                  backgroundColor: isActive
                    ? 'rgba(54, 10, 12, 0.94)'
                    : 'rgba(34, 6, 7, 0.74)',
                  borderColor: isActive
                    ? sec.accent
                    : 'rgba(255, 217, 208, 0.16)',
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="font-mono-num flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                    style={{
                      backgroundColor: sec.accent,
                      color: sec.badgeText,
                    }}
                  >
                    {sec.n}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="font-display truncate text-xs font-semibold text-[#fff1ee]">
                      {sec.name}
                    </div>
                    <div className="truncate text-[10px] text-[#ffd9d0]/80">
                      {isHuman
                        ? `${sec.owner} · ${MUSCLE_COUNT_BY_SECTION[sec.id]} muscles`
                        : callout.title}
                    </div>
                  </div>
                </div>
                {isActive && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: sec.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Live 3D Anatomical Readout Card (Individual Human Muscle OR Precise Animal Labels) */}
        <AnimatePresence mode="wait">
          {inspectedMuscle && inspectedSection ? (
            <motion.div
              key={`muscle-${inspectedMuscle.id}`}
              data-testid="3d-muscle-inspector"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="hud-glass rounded-xl border p-3"
              style={{ borderColor: `${inspectedSection.accent}88` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: inspectedSection.accent }}
                    />
                    <span className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.14em] text-[#ffd9d0]">
                      {inspectedSection.name} · {inspectedMuscle.region}
                    </span>
                  </div>
                  <h3 className="font-display mt-0.5 text-sm font-semibold text-[#fff1ee]">
                    {inspectedMuscle.name}
                  </h3>
                </div>

                {selectedMuscle && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMuscle(null);
                      setSelectedSubPartId(null);
                    }}
                    aria-label="Clear selected muscle"
                    className="hud-btn flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#ffd9d0] hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <p className="mt-1 text-[10px] font-medium text-[#ffd9d0]">
                {inspectedMuscle.cvaRole}
              </p>

              {selectedMuscle && inspectedMuscle.description && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#fff1ee]/90">
                  {inspectedMuscle.description}
                </p>
              )}

              {selectedMuscle && activeId !== inspectedMuscle.sectionId && (
                <button
                  type="button"
                  onClick={() => onSelectSection(inspectedMuscle.sectionId)}
                  className="hud-btn mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#fff1ee]/12 px-2.5 py-1 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#fff1ee]/20"
                >
                  <Sparkles className="h-3 w-3 text-[#ffd9d0]" />
                  <span>Focus {inspectedSection.name} section</span>
                </button>
              )}
            </motion.div>
          ) : activeCallout && activeSection ? (
            <motion.div
              key={`animal-callout-${specimen.id}-${activeSection.id}`}
              data-testid="3d-animal-callout"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="hud-glass rounded-xl border p-3"
              style={{ borderColor: `${activeSection.accent}88` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: activeSection.accent }}
                  />
                  <span className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.14em] text-[#ffd9d0]">
                    {specimen.label} · {activeSection.name}
                  </span>
                </div>
                {selectedSubPart && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubPartId(null)}
                    aria-label="Show section summary"
                    className="hud-btn flex h-5 w-5 items-center justify-center rounded text-[#ffd9d0] hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {selectedSubPart ? (
                <>
                  <h3 className="font-display mt-1 text-sm font-semibold text-[#fff1ee]">
                    {selectedSubPart.tag}. {selectedSubPart.label}
                  </h3>
                  <p className="mt-0.5 text-[10px] font-medium text-[#ffd9d0]">
                    {selectedSubPart.origin}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#fff1ee]/90">
                    {selectedSubPart.description}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-display mt-1 text-sm font-semibold text-[#fff1ee]">
                    {activeCallout.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#fff1ee]/88">
                    {activeCallout.note}
                  </p>
                </>
              )}

              {/* Clickable Precise Anatomical Parts Index (A, B, C, D) */}
              <div className="mt-2.5 border-t border-[#ffd9d0]/12 pt-2">
                <div className="font-mono-num mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#ffd9d0]/75">
                  Precise {specimen.label} Labels ({activeCallout.parts.length})
                </div>
                <div className="flex flex-col gap-1">
                  {activeCallout.parts.map((part) => {
                    const isSel = selectedSubPartId === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => handleSelectSubPart(part)}
                        className="hud-btn flex items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[11px] transition-colors"
                        style={{
                          backgroundColor: isSel
                            ? `${activeSection.accent}30`
                            : 'rgba(255, 241, 238, 0.04)',
                          borderColor: isSel
                            ? activeSection.accent
                            : 'rgba(255, 217, 208, 0.12)',
                          color: '#fff1ee',
                        }}
                      >
                        <span
                          className="font-mono-num flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                          style={{
                            backgroundColor: isSel
                              ? '#fff1ee'
                              : activeSection.accent,
                            color: isSel
                              ? '#3b0a0a'
                              : activeSection.badgeText,
                          }}
                        >
                          {part.tag}
                        </span>
                        <span className="truncate font-medium">
                          {part.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="overview-tip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-[#ffd9d0]/12 bg-[#240505]/60 p-3 text-[11px] leading-relaxed text-[#ffd9d0]/85"
            >
              Click any of the 4 CVA parts above—or a pin on the 3D{' '}
              <strong className="text-[#fff1ee]">{specimen.label}</strong>—to
              reveal precise anatomical leader labels for this specimen.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unobtrusive License Attribution Footnote */}
        <div className="mt-auto pt-2 text-[10px] text-[#ffd9d0]/55">
          3D Mesh: {specimen.attribution}
        </div>
      </aside>
      )}

      {/* Main Interactive 3D Comparative Vertebrate Canvas Stage (100% Unobstructed Center!) */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Soft studio radial illumination centered behind the 3D specimen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            background: activeSection
              ? `radial-gradient(ellipse 58% 72% at 50% 48%, ${activeSection.accent}24 0%, rgba(74, 15, 18, 0.42) 48%, rgba(28, 4, 5, 0.84) 100%)`
              : 'radial-gradient(ellipse 56% 72% at 50% 48%, rgba(168, 44, 48, 0.28) 0%, rgba(62, 12, 14, 0.48) 50%, rgba(24, 4, 5, 0.86) 100%)',
          }}
        />

        {/* Top-Center Comparative Vertebrate Specimen Switcher */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3">
          <div
            role="group"
            aria-label="Select 3D vertebrate specimen"
            className="hud-glass pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1"
          >
            {VERTEBRATES.map((v) => {
              const active = v.id === vertebrateId;
              return (
                <button
                  key={v.id}
                  type="button"
                  data-testid={`vertebrate-btn-${v.id}`}
                  aria-pressed={active}
                  onClick={() => handleSelectVertebrate(v.id)}
                  title={`${v.label} (${v.clade}) — ${v.subtitle}`}
                  className="hud-btn relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  style={{
                    color: active ? '#3b0a0a' : '#ffd9d0',
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="vertebrate-pill-active"
                      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-[#fff1ee]"
                    />
                  )}
                  <span className="relative z-10">{v.label}</span>
                  {v.animations.length > 0 && (
                    <span
                      className="relative z-10 hidden h-1.5 w-1.5 rounded-full sm:inline-block"
                      style={{
                        backgroundColor: active
                          ? '#8b1a1a'
                          : 'rgba(255, 217, 208, 0.5)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Single Persistent WebGL Canvas switching seamlessly between Human 177-Muscle & Animated Animals */}
        <div
          data-testid="three-d-canvas-wrap"
          className="relative min-h-0 flex-1"
        >
          <WebGLErrorBoundary onSwitchToPoster={onSwitchToPoster}>
            <Canvas
              dpr={[1, 2]}
              camera={{
                position: [2.06, 0.06, 11.67],
                fov: 34,
                near: 0.1,
                far: 80,
              }}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.06,
              }}
              style={{ width: '100%', height: '100%', touchAction: 'none' }}
            >
              <Suspense fallback={null}>
                {isHuman ? (
                  <MuscleModelScene
                    key="human-muscle-scene"
                    activeSectionId={activeId}
                    selectedSubPartId={selectedSubPartId}
                    showLabels={showLabels}
                    anglePreset={anglePreset}
                    xrayFocus={xrayFocus}
                    autoOrbit={autoOrbit}
                    reducedMotion={prefersReducedMotion}
                    resetTrigger={resetTrigger}
                    selectedMuscleId={selectedMuscle?.id ?? null}
                    hoveredMuscleId={hoveredMuscle?.id ?? null}
                    onHoverMuscle={handleHoverMuscle}
                    onSelectMuscle={handleSelectMuscle}
                    onSelectSubPart={handleSelectSubPart}
                    onUserOrbitStart={() => setAutoOrbit(false)}
                  />
                ) : (
                  <AnimalSpecimenScene
                    key={`animal-scene-${specimen.id}`}
                    specimen={specimen}
                    activeSectionId={activeId}
                    selectedSubPartId={selectedSubPartId}
                    showLabels={showLabels}
                    anglePreset={anglePreset}
                    activeAnimation={activeAnimation}
                    isPlaying={isPlaying}
                    wireframeOverlay={animalWireframe}
                    autoOrbit={autoOrbit}
                    reducedMotion={prefersReducedMotion}
                    resetTrigger={resetTrigger}
                    onSelectSection={(id) => onSelectSection(id)}
                    onSelectSubPart={handleSelectSubPart}
                    onUserOrbitStart={() => setAutoOrbit(false)}
                  />
                )}
              </Suspense>
            </Canvas>
          </WebGLErrorBoundary>
        </div>

        {/* Context-Aware Bottom Floating 3D Controls Bar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
          <div className="hud-glass pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full px-2.5 py-1.5">
            <button
              type="button"
              data-testid="3d-full-body-btn"
              onClick={() => {
                setSelectedMuscle(null);
                onSelectSection(null);
              }}
              aria-pressed={activeId === null}
              className="hud-btn rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: activeId === null ? '#fff1ee' : 'transparent',
                color: activeId === null ? '#3b0a0a' : '#ffd9d0',
              }}
            >
              {isHuman ? 'Full Body' : 'All 4 Zones'}
            </button>

            <span aria-hidden="true" className="h-4 w-px bg-[#ffd9d0]/18" />

            {/* Anterior / Posterior / Lateral Anatomical Views */}
            {(
              [
                ['anterior', 'Front'],
                ['posterior', 'Back'],
                ['lateral', 'Side'],
              ] as const
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                data-testid={`3d-angle-${preset}`}
                aria-pressed={anglePreset === preset}
                onClick={() => {
                  setAutoOrbit(false);
                  setAnglePreset(preset);
                  setResetTrigger((n) => n + 1);
                }}
                className="hud-btn rounded-full px-2 py-1 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor:
                    anglePreset === preset
                      ? 'rgba(255, 241, 238, 0.16)'
                      : 'transparent',
                  color: anglePreset === preset ? '#fff1ee' : '#ffd9d0',
                }}
              >
                {label}
              </button>
            ))}

            <span aria-hidden="true" className="h-4 w-px bg-[#ffd9d0]/18" />

            {/* Human: X-Ray toggle | Animals: Play/Pause + Motion Clips + Wireframe */}
            {isHuman ? (
              <button
                type="button"
                data-testid="3d-xray-toggle"
                aria-pressed={xrayFocus}
                onClick={() => setXrayFocus((v) => !v)}
                className="hud-btn inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#fff1ee]/12"
                style={{
                  backgroundColor: xrayFocus
                    ? 'rgba(255, 241, 238, 0.15)'
                    : 'transparent',
                }}
                title="Toggle translucent X-Ray silhouette for non-active muscle groups"
              >
                {xrayFocus ? (
                  <Scan className="h-3 w-3 text-[#ffd9d0]" />
                ) : (
                  <Eye className="h-3 w-3 text-[#ffd9d0]" />
                )}
                <span>{xrayFocus ? 'X-Ray' : 'Solid'}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  data-testid="3d-play-toggle"
                  aria-pressed={isPlaying}
                  onClick={() => setIsPlaying((p) => !p)}
                  className="hud-btn inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#fff1ee]/12"
                  style={{
                    backgroundColor: isPlaying
                      ? 'rgba(255, 241, 238, 0.16)'
                      : 'transparent',
                  }}
                  title={isPlaying ? 'Pause 3D motion' : 'Play 3D motion'}
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3 text-[#ffd9d0]" />
                  ) : (
                    <Play className="h-3 w-3 text-[#ffd9d0]" />
                  )}
                  <span className="hidden sm:inline">
                    {isPlaying ? 'Motion' : 'Paused'}
                  </span>
                </button>

                {specimen.animations.length > 1 && (
                  <div className="flex items-center gap-0.5 rounded-full bg-[#1f0404]/70 p-0.5">
                    {specimen.animations.map((anim) => {
                      const active =
                        (activeAnimation ?? specimen.defaultAnimation) ===
                        anim.clip;
                      return (
                        <button
                          key={anim.clip}
                          type="button"
                          data-testid={`3d-clip-${anim.label.toLowerCase()}`}
                          aria-pressed={active}
                          onClick={() => {
                            setActiveAnimation(anim.clip);
                            setIsPlaying(true);
                          }}
                          className="hud-btn rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: active
                              ? '#fff1ee'
                              : 'transparent',
                            color: active ? '#3b0a0a' : '#ffd9d0',
                          }}
                        >
                          {anim.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  data-testid="3d-wire-toggle"
                  aria-pressed={animalWireframe}
                  onClick={() => setAnimalWireframe((w) => !w)}
                  className="hud-btn hidden items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-[#fff1ee] hover:bg-[#fff1ee]/12 md:inline-flex"
                  style={{
                    backgroundColor: animalWireframe
                      ? 'rgba(255, 241, 238, 0.15)'
                      : 'transparent',
                  }}
                  title="Toggle anatomical mesh wireframe"
                >
                  <Grid2x2 className="h-3 w-3 text-[#ffd9d0]" />
                  <span>Mesh</span>
                </button>
              </>
            )}

            <button
              type="button"
              data-testid="3d-labels-toggle"
              aria-pressed={showLabels}
              onClick={() => setShowLabels((v) => !v)}
              className="hud-btn inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#fff1ee]/12"
              style={{
                backgroundColor: showLabels
                  ? 'rgba(255, 241, 238, 0.15)'
                  : 'transparent',
              }}
              title="Toggle 3D anatomical part labels"
            >
              <Tag className="h-3 w-3 text-[#ffd9d0]" />
              <span className="hidden sm:inline">Labels</span>
            </button>

            <button
              type="button"
              data-testid="3d-orbit-toggle"
              aria-pressed={autoOrbit}
              onClick={() => setAutoOrbit((v) => !v)}
              className="hud-btn inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#fff1ee]/12"
              style={{
                backgroundColor: autoOrbit
                  ? 'rgba(255, 241, 238, 0.15)'
                  : 'transparent',
              }}
              title="Toggle slow turntable rotation"
            >
              <Orbit className="h-3 w-3 text-[#ffd9d0]" />
              <span className="hidden md:inline">Orbit</span>
            </button>

            <button
              type="button"
              onClick={handleResetView}
              className="hud-btn inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-[#ffd9d0] hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
              title="Reset 3D camera"
            >
              <RotateCcw className="h-3 w-3" />
            </button>

            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-[#ffd9d0]/18 sm:block"
            />

            <button
              type="button"
              onClick={onSwitchToPoster}
              className="hud-btn hidden items-center gap-1 rounded-full bg-[#fff1ee]/10 px-2.5 py-1 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#fff1ee]/20 sm:inline-flex"
            >
              <span>Poster</span>
            </button>
          </div>
        </div>

        {/* Mobile attribution badge */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden text-[10px] text-[#ffd9d0]/55">
          3D Mesh: {specimen.attribution}
        </div>
      </div>

      {/* Right Rail (Desktop) / Bottom Strip (Mobile): Poster Specimen Plates linked to 3D Animals */}
      <AnimatePresence>
        {activeSection && (
          <motion.aside
            key={`specimen-rail-${activeSection.id}`}
            data-testid="three-d-specimen-rail"
            aria-label={`Comparative poster illustrations for ${activeSection.name}`}
            initial={{
              opacity: 0,
              x: isDesktop ? 28 : 0,
              y: isDesktop ? 0 : 24,
            }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{
              opacity: 0,
              x: isDesktop ? 28 : 0,
              y: isDesktop ? 0 : 24,
            }}
            transition={CARD_SPRING}
            className="hud-glass z-20 flex shrink-0 flex-col border-t border-[#ffd9d0]/18 p-3.5 lg:w-[356px] lg:border-l lg:border-t-0 lg:p-4"
          >
            {/* Section Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="font-mono-num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{
                    backgroundColor: activeSection.accent,
                    color: activeSection.badgeText,
                  }}
                >
                  {activeSection.n}
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.16em] text-[#ffd9d0]">
                    POSTER SPECIMENS · {specimen.label.toUpperCase()} 3D
                  </div>
                  <h2 className="font-display truncate text-lg font-semibold text-[#fff1ee]">
                    {activeSection.name} · {activeSection.owner}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onPrev}
                  className="hud-btn flex h-7 w-7 items-center justify-center rounded-lg border border-[#ffd9d0]/18 bg-[#fff1ee]/8 text-[#fff1ee] hover:bg-[#fff1ee]/15"
                  aria-label="Previous section"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="hud-btn flex h-7 w-7 items-center justify-center rounded-lg border border-[#ffd9d0]/18 bg-[#fff1ee]/8 text-[#fff1ee] hover:bg-[#fff1ee]/15"
                  aria-label="Next section"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-[#ffd9d0]/90">
              {activeSection.summary}
            </p>

            {/* Staggered Comparative Vertebrate Illustration Cards from the Poster */}
            <motion.div
              key={`cards-${activeSection.id}`}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.07, delayChildren: 0.04 },
                },
              }}
              className="mt-3 flex gap-2.5 overflow-x-auto pb-1 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden"
            >
              {activeSpecimens.map((spec) => {
                const suggestedIds =
                  SUGGESTED_VERTEBRATES_BY_CARD[spec.id] ?? [];

                return (
                  <motion.div
                    key={spec.id}
                    variants={{
                      hidden: { opacity: 0, y: 12, scale: 0.97 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: CARD_SPRING,
                      },
                    }}
                    className="w-[244px] shrink-0 lg:w-full"
                    onMouseEnter={() => onHoverSound?.()}
                  >
                    <TiltCard
                      enabled={cardTiltEnabled}
                      maxTilt={5}
                      className="rounded-xl border border-[#ffd9d0]/18 bg-[#240505]/92 transition-colors hover:border-[#ffd9d0]/40"
                    >
                      <button
                        type="button"
                        data-testid={`specimen-card-${spec.id}`}
                        onClick={() => setFocusedSpecimen(spec)}
                        className="block w-full text-left"
                      >
                        <div className="relative aspect-[16/8.2] w-full overflow-hidden bg-[#fff1ee]">
                          <img
                            src={spec.imageSrc}
                            alt={spec.title}
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            className="h-full w-full object-contain p-1"
                          />
                          <span
                            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#240505]/80 text-[#fff1ee] backdrop-blur-sm"
                            aria-hidden="true"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </span>
                        </div>

                        <div className="px-2.5 pb-1.5 pt-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-display text-sm font-semibold text-[#fff1ee]">
                              {spec.title}
                            </h3>
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: activeSection.accent }}
                            />
                          </div>
                          <p className="text-[10px] font-medium text-[#ffd9d0]">
                            {spec.subtitle}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#fff1ee]/85">
                            {spec.caption}
                          </p>
                        </div>
                      </button>

                      {/* Direct One-Click Jump to Matching Live 3D Vertebrate Specimens */}
                      {suggestedIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 border-t border-[#ffd9d0]/10 px-2.5 py-2">
                          <span className="font-mono-num mr-0.5 text-[9px] uppercase tracking-wider text-[#ffd9d0]/70">
                            3D:
                          </span>
                          {suggestedIds.map((vid) => {
                            const v = VERTEBRATE_BY_ID[vid];
                            const isCurrent = vid === vertebrateId;
                            return (
                              <button
                                key={vid}
                                type="button"
                                onClick={() => handleSelectVertebrate(vid)}
                                className="hud-btn rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors"
                                style={{
                                  backgroundColor: isCurrent
                                    ? activeSection.accent
                                    : 'rgba(255, 241, 238, 0.08)',
                                  borderColor: isCurrent
                                    ? activeSection.accent
                                    : 'rgba(255, 217, 208, 0.2)',
                                  color: isCurrent
                                    ? activeSection.badgeText
                                    : '#fff1ee',
                                }}
                              >
                                {v.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </TiltCard>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Focused Poster Specimen Inspection Modal */}
      <AnimatePresence>
        {focusedSpecimen && (
          <motion.div
            key="specimen-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setFocusedSpecimen(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#180303]/82 p-4 backdrop-blur-md"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={focusedSpecimen.title}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={CARD_SPRING}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl"
            >
              <TiltCard
                enabled={cardTiltEnabled}
                maxTilt={4}
                className="hud-glass overflow-hidden rounded-2xl border border-[#ffd9d0]/24"
              >
                <div className="relative bg-[#fff1ee] p-3">
                  <img
                    src={focusedSpecimen.imageSrc}
                    alt={focusedSpecimen.title}
                    className="mx-auto max-h-[62dvh] w-auto object-contain"
                    draggable={false}
                  />
                  <button
                    type="button"
                    onClick={() => setFocusedSpecimen(null)}
                    aria-label="Close specimen preview"
                    className="hud-pill hud-btn absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[#fff1ee] hover:bg-[#5c1212]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          SECTION_BY_ID[focusedSpecimen.sectionId].accent,
                      }}
                    />
                    <span className="font-mono-num text-[10px] font-semibold uppercase tracking-wider text-[#ffd9d0]">
                      {SECTION_BY_ID[focusedSpecimen.sectionId].name} · Prepared
                      by {SECTION_BY_ID[focusedSpecimen.sectionId].owner}
                    </span>
                  </div>
                  <h3 className="font-display mt-1 text-xl font-semibold text-[#fff1ee]">
                    {focusedSpecimen.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#ffd9d0]">
                    {focusedSpecimen.caption}
                  </p>
                </div>
              </TiltCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

export default ThreeDVisualStage;
