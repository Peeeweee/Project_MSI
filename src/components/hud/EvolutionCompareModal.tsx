import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Box,
  Eye,
  EyeOff,
  GitCompareArrows,
  Grid2x2,
  Image as ImageIcon,
  Layers,
  MapPin,
  Pause,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import {
  HOMOLOGY_CHAINS_BY_SECTION,
  type CladeStage,
} from '../../data/evolutionComparison';
import {
  SECTION_BY_ID,
  SECTIONS,
  type SectionId,
} from '../../data/sections';
import {
  VERTEBRATE_BY_ID,
  type AnatomicalSubPart,
  type VertebrateId,
} from '../../data/vertebrates';
import { HUD_SPRING, pickTransition } from '../../lib/springs';
import { Comparison3DCardCanvas } from '../stage/Comparison3DCardCanvas';

interface EvolutionCompareModalProps {
  open: boolean;
  activeSectionId: SectionId | null;
  onClose: () => void;
  onJumpToPosterBbox: (
    sectionId: SectionId,
    bbox: readonly [number, number, number, number],
  ) => void;
  onInspectIn3D: (sectionId: SectionId, vertebrateId: VertebrateId) => void;
}

const PART_TAGS: readonly ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];

/**
 * Interactive 3D & 2D Evolutionary Homology Comparator (#4):
 * - Renders all 4 evolutionary stages as LIVE, orbitable, animated 3D vertebrate
 *   models from GitHub (`shark.glb`, `teleost.glb`, `frog.glb`, `crocodile.glb`,
 *   `parrot.glb`, `dog.glb`, `horse.glb`, `muscles.glb`) side-by-side!
 * - Synchronized Specific-Part Comparison (`Part A`, `Part B`, `Part C`):
 *   clicking any specific part zooms and rotates all 4 3D animal cameras to that
 *   exact homologous part so viewers can directly compare the anatomy across clades.
 */
export function EvolutionCompareModal({
  open,
  activeSectionId,
  onClose,
  onJumpToPosterBbox,
  onInspectIn3D,
}: EvolutionCompareModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);

  const [selectedSectionId, setSelectedSectionId] = useState<SectionId>(
    activeSectionId ?? 'branchiomeric',
  );
  const [chainIndex, setChainIndex] = useState(0);
  const [selectedPartTag, setSelectedPartTag] = useState<
    'A' | 'B' | 'C' | 'D' | null
  >('A');
  const [visualMode, setVisualMode] = useState<'3d' | '2d'>('3d');
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion);
  const [wireframe, setWireframe] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Sync tab with active section whenever modal opens
  useEffect(() => {
    if (open && activeSectionId) {
      setSelectedSectionId(activeSectionId);
      setChainIndex(0);
      setSelectedPartTag('A');
    }
  }, [activeSectionId, open]);

  const section = SECTION_BY_ID[selectedSectionId];
  const chains = HOMOLOGY_CHAINS_BY_SECTION[selectedSectionId];
  const activeChain = chains[chainIndex] ?? chains[0];

  const toggleReveal = (stageId: string) => {
    setRevealedIds((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const handleSelectTag = (tag: 'A' | 'B' | 'C' | 'D') => {
    setSelectedPartTag((prev) => (prev === tag ? null : tag));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="evolution-compare-backdrop"
          data-testid="evolution-compare-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#120202]/82 p-2 backdrop-blur-md sm:p-4"
        >
          <motion.div
            key="evolution-compare-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="3D Evolutionary Homology Comparison"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={transition}
            onClick={(e) => e.stopPropagation()}
            className="hud-glass flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[#ffd9d0]/22 shadow-2xl"
          >
            {/* Top accent bar */}
            <div
              className="h-1 w-full shrink-0 transition-colors duration-300"
              style={{ backgroundColor: section.accent }}
            />

            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ffd9d0]/12 px-3.5 py-2.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm"
                  style={{
                    backgroundColor: `${section.accent}26`,
                    color: '#fff1ee',
                    border: `1px solid ${section.accent}66`,
                  }}
                >
                  <GitCompareArrows className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-semibold tracking-tight text-[#fff1ee] sm:text-lg">
                      3D Evolutionary Homology Comparator
                    </h2>
                    <span className="hidden rounded-full border border-[#ffd9d0]/20 bg-[#2a0606]/90 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#ffd9d0]/85 uppercase md:inline-block">
                      Live 3D Models · Specific Part Comparison
                    </span>
                  </div>
                  <p className="text-[11px] text-[#ffd9d0]/70">
                    Rotate all 4 3D animals & click any specific part (A, B, C) to compare homologous structures side-by-side
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* 3D Live Models <-> 2D SVG Plates switcher */}
                <div
                  className="flex items-center rounded-full border border-[#ffd9d0]/18 bg-[#1f0404]/90 p-0.5"
                  role="group"
                  aria-label="Comparison visual mode"
                >
                  <button
                    type="button"
                    data-testid="compare-mode-3d"
                    aria-pressed={visualMode === '3d'}
                    onClick={() => setVisualMode('3d')}
                    className={`hud-btn flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      visualMode === '3d'
                        ? 'bg-[#fff1ee] text-[#240505]'
                        : 'text-[#ffd9d0]/80 hover:text-[#fff1ee]'
                    }`}
                  >
                    <Box className="h-3 w-3" />
                    <span>3D Live</span>
                  </button>
                  <button
                    type="button"
                    data-testid="compare-mode-2d"
                    aria-pressed={visualMode === '2d'}
                    onClick={() => setVisualMode('2d')}
                    className={`hud-btn flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      visualMode === '2d'
                        ? 'bg-[#fff1ee] text-[#240505]'
                        : 'text-[#ffd9d0]/80 hover:text-[#fff1ee]'
                    }`}
                  >
                    <ImageIcon className="h-3 w-3" />
                    <span>2D Plates</span>
                  </button>
                </div>

                {visualMode === '3d' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsPlaying((p) => !p)}
                      aria-pressed={isPlaying}
                      className="hud-btn flex items-center gap-1 rounded-full border border-[#ffd9d0]/20 bg-[#2a0606]/80 px-2.5 py-1 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#fff1ee]/12"
                      title={isPlaying ? 'Pause all 3D animations' : 'Play all 3D animations'}
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

                    <button
                      type="button"
                      onClick={() => setWireframe((w) => !w)}
                      aria-pressed={wireframe}
                      className={`hud-btn hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:flex ${
                        wireframe
                          ? 'border-[#fff1ee]/50 bg-[#fff1ee]/18 text-[#fff1ee]'
                          : 'border-[#ffd9d0]/20 bg-[#2a0606]/80 text-[#ffd9d0]/85 hover:text-[#fff1ee]'
                      }`}
                      title="Toggle 3D anatomical mesh wireframe across all 4 models"
                    >
                      <Grid2x2 className="h-3 w-3" />
                      <span>Mesh</span>
                    </button>
                  </>
                )}

                {/* Interactive Flashcard / Quiz Mode toggle */}
                <button
                  type="button"
                  data-testid="toggle-quiz-mode"
                  onClick={() => {
                    setQuizMode((q) => !q);
                    setRevealedIds({});
                  }}
                  aria-pressed={quizMode}
                  className={`hud-btn flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    quizMode
                      ? 'border-amber-400/70 bg-amber-500/20 text-[#fff1ee] shadow-sm'
                      : 'border-[#ffd9d0]/20 bg-[#2a0606]/75 text-[#ffd9d0]/85 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]'
                  }`}
                  title="Hide muscle names to quiz yourself or the class"
                >
                  {quizMode ? (
                    <EyeOff className="h-3 w-3 text-amber-300" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  <span>{quizMode ? 'Quiz: ON' : 'Quiz'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="hud-btn flex h-7 w-7 items-center justify-center rounded-full text-[#ffd9d0]/80 hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
                  aria-label="Close homology comparison"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Section Selector Tabs + Synchronized Part Comparator Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ffd9d0]/10 bg-[#1e0404]/70 px-3.5 py-2 sm:px-5">
              <div
                className="touch-scroll-x flex items-center gap-1 overflow-x-auto"
                role="tablist"
                aria-label="CVA Muscular System Sections"
              >
                {SECTIONS.map((s) => {
                  const isActive = s.id === selectedSectionId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      data-testid={`compare-tab-${s.id}`}
                      onClick={() => {
                        setSelectedSectionId(s.id);
                        setChainIndex(0);
                        setSelectedPartTag('A');
                      }}
                      className={`hud-btn flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#fff1ee]/16 text-[#fff1ee] shadow-sm'
                          : 'text-[#ffd9d0]/75 hover:bg-[#fff1ee]/8 hover:text-[#fff1ee]'
                      }`}
                      style={
                        isActive
                          ? {
                              boxShadow: `inset 0 0 0 1.5px ${s.accent}`,
                            }
                          : undefined
                      }
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
                      <span>{s.name}</span>
                    </button>
                  );
                })}

                {/* Sub-chain switcher if section has 2 homology pathways */}
                {chains.length > 1 && (
                  <div className="ml-1 flex shrink-0 items-center gap-0.5 rounded-full border border-[#ffd9d0]/16 bg-[#240505]/90 p-0.5">
                    {chains.map((ch, idx) => {
                      const active = idx === chainIndex;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setChainIndex(idx)}
                          className={`hud-btn rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-all ${
                            active
                              ? 'text-[#160303] shadow-sm'
                              : 'text-[#ffd9d0]/80 hover:text-[#fff1ee]'
                          }`}
                          style={
                            active
                              ? {
                                  backgroundColor: section.accent,
                                  color: section.badgeText,
                                }
                              : undefined
                          }
                        >
                          Pathway {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Synchronized Specific-Part Focus Selector (Locks all 4 3D cameras onto Part A, B, or C!) */}
              <div
                className="flex items-center gap-1 rounded-full border border-[#ffd9d0]/18 bg-[#240505]/90 px-1.5 py-0.5"
                role="group"
                aria-label="Synchronized specific part comparison"
              >
                <Layers className="mr-0.5 h-3 w-3 text-[#ffd9d0]/70" />
                <span className="hidden text-[10px] font-semibold tracking-wider text-[#ffd9d0]/75 uppercase sm:inline">
                  Focus Part:
                </span>
                <button
                  type="button"
                  data-testid="compare-part-all"
                  onClick={() => setSelectedPartTag(null)}
                  className={`hud-btn rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    selectedPartTag === null
                      ? 'bg-[#fff1ee] text-[#240505]'
                      : 'text-[#ffd9d0]/80 hover:text-[#fff1ee]'
                  }`}
                >
                  All
                </button>
                {PART_TAGS.map((tag) => {
                  const active = selectedPartTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      data-testid={`compare-part-${tag}`}
                      onClick={() => handleSelectTag(tag)}
                      className="hud-btn rounded-full px-2 py-0.5 text-[10.5px] font-bold transition-all"
                      style={
                        active
                          ? {
                              backgroundColor: section.accent,
                              color: section.badgeText,
                            }
                          : { color: '#ffd9d0' }
                      }
                    >
                      Part {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="touch-scroll-y min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5 sm:px-5">
              {/* Compact Active Chain Banner */}
              <div className="rounded-2xl border border-[#ffd9d0]/15 bg-[#260505]/75 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-wide uppercase"
                        style={{
                          backgroundColor: `${section.accent}28`,
                          color: '#fff1ee',
                          border: `1px solid ${section.accent}66`,
                        }}
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {activeChain.badge}
                      </span>
                      <h3 className="font-display text-sm font-semibold text-[#fff1ee] sm:text-base">
                        {activeChain.title}
                      </h3>
                      <span className="hidden text-[11px] text-[#ffd9d0]/70 xl:inline">
                        — Origin: <strong className="text-[#fff1ee]">{activeChain.embryonicOrigin}</strong> · Nerve: <strong className="text-[#fff1ee]">{activeChain.innervation}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="compare-jump-poster"
                    onClick={() => {
                      onJumpToPosterBbox(
                        selectedSectionId,
                        activeChain.posterBbox,
                      );
                      onClose();
                    }}
                    className="hud-btn flex shrink-0 items-center gap-1 rounded-full border border-[#ffd9d0]/25 bg-[#3b0a0a]/90 px-2.5 py-1 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#521010]"
                  >
                    <MapPin className="h-3 w-3" style={{ color: section.accent }} />
                    <span>Zoom Poster</span>
                  </button>
                </div>
              </div>

              {/* 4-Stage Interactive 3D Evolutionary Clade Progression Cards */}
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {activeChain.stages.map((stage: CladeStage, idx: number) => {
                  const isHiddenByQuiz = quizMode && !revealedIds[stage.id];
                  const vertebrate = VERTEBRATE_BY_ID[stage.vertebrateId];
                  const callout = vertebrate.callouts[selectedSectionId];
                  const parts = callout.parts;
                  const activePart =
                    (selectedPartTag
                      ? parts.find((p) => p.tag === selectedPartTag)
                      : null) ?? parts[0];

                  return (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.22 }}
                      className="relative flex flex-col justify-between rounded-2xl border border-[#ffd9d0]/18 bg-[#220404]/90 p-2.5 shadow-lg"
                    >
                      <div>
                        {/* Stage step header */}
                        <div className="mb-1.5 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="font-mono-num inline-flex h-4.5 shrink-0 items-center rounded px-1.5 text-[9.5px] font-bold"
                              style={{
                                backgroundColor: section.accent,
                                color: section.badgeText,
                              }}
                            >
                              STAGE {idx + 1}
                            </span>
                            <span className="truncate text-[11px] font-semibold text-[#fff1ee]">
                              {stage.clade}
                            </span>
                          </div>
                          {idx < activeChain.stages.length - 1 && (
                            <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-[#ffd9d0]/45 lg:block" />
                          )}
                        </div>

                        {/* LIVE 3D Realistic Vertebrate Viewport (or 2D Bioicons SVG fallback) */}
                        {visualMode === '3d' ? (
                          <Comparison3DCardCanvas
                            vertebrateId={stage.vertebrateId}
                            sectionId={selectedSectionId}
                            selectedTag={selectedPartTag}
                            isPlaying={isPlaying}
                            wireframe={wireframe}
                            onSelectTag={handleSelectTag}
                          />
                        ) : (
                          <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-[#ffd9d0]/15 bg-[#fff5f2]/95 p-2 shadow-inner">
                            <img
                              src={stage.iconSrc}
                              alt={stage.specimenTag}
                              draggable={false}
                              loading="lazy"
                              className="max-h-full max-w-full select-none object-contain"
                            />
                          </div>
                        )}

                        {/* Interactive Specific Anatomical Parts Selector (A, B, C, D) for this animal */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[9.5px] font-semibold tracking-wider text-[#ffd9d0]/65 uppercase">
                            <span>Specific {vertebrate.label} Parts</span>
                            <span>Tap to compare</span>
                          </div>

                          <div className="mt-1 flex flex-col gap-1">
                            {parts.map((part: AnatomicalSubPart) => {
                              const isSel = selectedPartTag === part.tag;
                              return (
                                <button
                                  key={part.id}
                                  type="button"
                                  data-testid={`card-part-${stage.vertebrateId}-${part.tag}`}
                                  onClick={() => handleSelectTag(part.tag)}
                                  className="hud-btn flex items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[11px] transition-all"
                                  style={{
                                    backgroundColor: isSel
                                      ? `${section.accent}32`
                                      : 'rgba(255, 241, 238, 0.04)',
                                    borderColor: isSel
                                      ? section.accent
                                      : 'rgba(255, 217, 208, 0.13)',
                                    color: '#fff1ee',
                                  }}
                                >
                                  <span
                                    className="font-mono-num flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                                    style={{
                                      backgroundColor: isSel
                                        ? '#fff1ee'
                                        : section.accent,
                                      color: isSel
                                        ? '#240505'
                                        : section.badgeText,
                                    }}
                                  >
                                    {part.tag}
                                  </span>
                                  <span className="truncate font-semibold">
                                    {isHiddenByQuiz ? '•••• (Quiz Hidden)' : part.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Detailed Readout of Selected Specific Part (or Quiz Flashcard Reveal) */}
                        {isHiddenByQuiz ? (
                          <button
                            type="button"
                            onClick={() => toggleReveal(stage.id)}
                            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-400/55 bg-amber-500/12 px-2 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/22"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Tap to Reveal {vertebrate.label} Muscles</span>
                          </button>
                        ) : activePart ? (
                          <div
                            onClick={() => {
                              if (quizMode) toggleReveal(stage.id);
                            }}
                            className="mt-2 rounded-xl border border-[#ffd9d0]/16 bg-[#150202]/90 p-2"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-mono-num flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                                style={{
                                  backgroundColor: section.accent,
                                  color: section.badgeText,
                                }}
                              >
                                {activePart.tag}
                              </span>
                              <span className="truncate text-[11px] font-bold text-[#fff1ee]">
                                {activePart.label}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] font-semibold text-[#ffd9d0]/80">
                              {activePart.origin}
                            </div>
                            <p className="mt-1 text-[10.5px] leading-snug text-[#ffd9d0]/85">
                              {activePart.description}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {/* Jump directly to Full-Screen 3D Vertebrate Studio */}
                      <button
                        type="button"
                        onClick={() => {
                          onInspectIn3D(selectedSectionId, stage.vertebrateId);
                          onClose();
                        }}
                        className="hud-btn mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/18 bg-[#380909]/85 px-2.5 py-1.5 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#4d0d0d]"
                      >
                        <Box
                          className="h-3.5 w-3.5"
                          style={{ color: section.accent }}
                        />
                        <span>Open {vertebrate.label} in Full 3D Studio</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer Attribution & Quick Hint */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ffd9d0]/10 bg-[#1a0303]/85 px-4 py-2 text-[11px] text-[#ffd9d0]/65 sm:px-5">
              <span>
                3D Models: Polyfork 3D (CC BY 4.0), BodyParts3D / OrganUI (CC BY-SA 2.1 JP) & Three.js (MIT)
              </span>
              <span>
                Click <strong className="text-[#fff1ee]">Part A, B, or C</strong> to synchronize & zoom all 4 3D animals to that exact homologous part
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
