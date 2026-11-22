import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Box,
  Eye,
  EyeOff,
  GitCompareArrows,
  MapPin,
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
import { VERTEBRATE_BY_ID, type VertebrateId } from '../../data/vertebrates';
import { HUD_SPRING, pickTransition } from '../../lib/springs';

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

/**
 * Interactive CVA Evolutionary Homology Comparison modal (#4):
 * - Compares embryonic precursors, cranial/spinal innervation, and muscle
 *   transformations across Fishes -> Amphibians -> Reptiles/Birds -> Mammals.
 * - Uses authentic DBCLS / Bioicons vertebrate SVG illustrations from GitHub.
 * - Includes an interactive Flashcard / Quiz toggle to hide & reveal derivatives.
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
  const [quizMode, setQuizMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Sync tab with active section whenever modal opens
  useEffect(() => {
    if (open && activeSectionId) {
      setSelectedSectionId(activeSectionId);
      setChainIndex(0);
    }
  }, [activeSectionId, open]);

  const section = SECTION_BY_ID[selectedSectionId];
  const chains = HOMOLOGY_CHAINS_BY_SECTION[selectedSectionId];
  const activeChain = chains[chainIndex] ?? chains[0];

  const toggleReveal = (stageId: string) => {
    setRevealedIds((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#140202]/78 p-3 backdrop-blur-md sm:p-5"
        >
          <motion.div
            key="evolution-compare-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Evolutionary Homology Comparison"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={transition}
            onClick={(e) => e.stopPropagation()}
            className="hud-glass flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#ffd9d0]/22 shadow-2xl"
          >
            {/* Top accent bar */}
            <div
              className="h-1 w-full shrink-0 transition-colors duration-300"
              style={{ backgroundColor: section.accent }}
            />

            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ffd9d0]/12 px-4 py-3.5 sm:px-6">
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
                    <h2 className="font-display text-base font-semibold tracking-tight text-[#fff1ee] sm:text-lg">
                      Evolutionary Homology Comparison
                    </h2>
                    <span className="hidden rounded-full border border-[#ffd9d0]/20 bg-[#2a0606]/90 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#ffd9d0]/85 uppercase sm:inline-block">
                      Fish → Amphibian → Reptile/Bird → Mammal
                    </span>
                  </div>
                  <p className="text-[11px] text-[#ffd9d0]/70">
                    Compare how homologous vertebrate muscles evolve across clades
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Interactive Flashcard / Quiz Mode toggle */}
                <button
                  type="button"
                  data-testid="toggle-quiz-mode"
                  onClick={() => {
                    setQuizMode((q) => !q);
                    setRevealedIds({});
                  }}
                  aria-pressed={quizMode}
                  className={`hud-btn flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                    quizMode
                      ? 'border-amber-400/70 bg-amber-500/20 text-[#fff1ee] shadow-sm'
                      : 'border-[#ffd9d0]/20 bg-[#2a0606]/75 text-[#ffd9d0]/85 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]'
                  }`}
                  title="Hide muscle names to quiz yourself or the class"
                >
                  {quizMode ? (
                    <EyeOff className="h-3.5 w-3.5 text-amber-300" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  <span>{quizMode ? 'Quiz Mode: ON' : 'Quiz Mode'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="hud-btn flex h-8 w-8 items-center justify-center rounded-full text-[#ffd9d0]/80 hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
                  aria-label="Close homology comparison"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Section Selector Tabs (1 Axial | 2 Appendicular | 3 Hypobranchial | 4 Branchiomeric) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ffd9d0]/10 bg-[#1e0404]/65 px-4 py-2.5 sm:px-6">
              <div
                className="flex flex-wrap items-center gap-1.5"
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
                      }}
                      className={`hud-btn flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
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
                      <span className="hidden text-[10px] opacity-70 sm:inline">
                        · {s.owner}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-chain switcher if section has 2 homology pathways */}
              {chains.length > 1 && (
                <div className="flex items-center gap-1 rounded-full border border-[#ffd9d0]/16 bg-[#240505]/90 p-0.5">
                  {chains.map((ch, idx) => {
                    const active = idx === chainIndex;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setChainIndex(idx)}
                        className={`hud-btn rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
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

            {/* Scrollable Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
              {/* Compact Active Chain Banner */}
              <div className="rounded-2xl border border-[#ffd9d0]/15 bg-[#260505]/75 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                        style={{
                          backgroundColor: `${section.accent}28`,
                          color: '#fff1ee',
                          border: `1px solid ${section.accent}66`,
                        }}
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {activeChain.badge}
                      </span>
                      <h3 className="font-display text-base font-semibold text-[#fff1ee] sm:text-lg">
                        {activeChain.title}
                      </h3>
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-[#ffd9d0]/82">
                      {activeChain.summary}
                    </p>
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
                    className="hud-btn flex shrink-0 items-center gap-1.5 rounded-full border border-[#ffd9d0]/25 bg-[#3b0a0a]/90 px-3 py-1.5 text-xs font-semibold text-[#fff1ee] hover:bg-[#521010]"
                  >
                    <MapPin className="h-3.5 w-3.5" style={{ color: section.accent }} />
                    <span>Zoom Poster Diagram</span>
                  </button>
                </div>

                {/* Compact Embryonic Precursor & Cranial/Spinal Nerve Row */}
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#ffd9d0]/12 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#1a0303]/75 px-2.5 py-1">
                    <span className="text-[9.5px] font-semibold tracking-wider text-[#ffd9d0]/60 uppercase">
                      Origin:
                    </span>
                    <span className="font-medium text-[#fff1ee]">
                      {activeChain.embryonicOrigin}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#1a0303]/75 px-2.5 py-1">
                    <span className="text-[9.5px] font-semibold tracking-wider text-[#ffd9d0]/60 uppercase">
                      Innervation:
                    </span>
                    <span className="font-medium text-[#fff1ee]">
                      {activeChain.innervation}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Stage Evolutionary Clade Progression Cards */}
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {activeChain.stages.map((stage: CladeStage, idx: number) => {
                  const isHiddenByQuiz = quizMode && !revealedIds[stage.id];
                  const vertebrate = VERTEBRATE_BY_ID[stage.vertebrateId];

                  return (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.24 }}
                      className="relative flex flex-col justify-between rounded-2xl border border-[#ffd9d0]/16 bg-[#240505]/85 p-3 shadow-lg"
                    >
                      <div>
                        {/* Stage step header */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-mono-num inline-flex h-4.5 items-center rounded px-1.5 text-[9.5px] font-bold"
                            style={{
                              backgroundColor: section.accent,
                              color: section.badgeText,
                            }}
                          >
                            STAGE {idx + 1}
                          </span>
                          {idx < activeChain.stages.length - 1 && (
                            <ArrowRight className="hidden h-3.5 w-3.5 text-[#ffd9d0]/45 lg:block" />
                          )}
                        </div>

                        {/* Bioicons / DBCLS Vertebrate SVG Illustration Plate */}
                        <div className="mt-2 flex h-16 w-full items-center justify-center overflow-hidden rounded-xl border border-[#ffd9d0]/15 bg-[#fff5f2]/95 p-1.5 shadow-inner">
                          <img
                            src={stage.iconSrc}
                            alt={stage.specimenTag}
                            draggable={false}
                            loading="lazy"
                            className="max-h-full max-w-full select-none object-contain"
                          />
                        </div>

                        {/* Clade & Specimen Title */}
                        <div className="mt-2">
                          <div className="text-[10px] font-semibold tracking-wider text-[#ffd9d0]/65 uppercase">
                            {stage.specimenTag}
                          </div>
                          <h4 className="font-display text-sm font-semibold text-[#fff1ee]">
                            {stage.clade}
                          </h4>
                        </div>

                        {/* Homologous Muscle Derivatives (or Interactive Flashcard Cover in Quiz Mode) */}
                        <div className="mt-1.5">
                          <div className="text-[9.5px] font-semibold tracking-wider text-[#ffd9d0]/60 uppercase">
                            Homologous Muscles
                          </div>
                          {isHiddenByQuiz ? (
                            <button
                              type="button"
                              onClick={() => toggleReveal(stage.id)}
                              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-400/55 bg-amber-500/12 px-2 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/22"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Tap to Reveal Muscles</span>
                            </button>
                          ) : (
                            <div
                              onClick={() => {
                                if (quizMode) toggleReveal(stage.id);
                              }}
                              className={`mt-1 rounded-xl border border-[#ffd9d0]/14 bg-[#170202]/80 px-2.5 py-1.5 text-[11.5px] font-semibold leading-snug text-[#fff1ee] ${
                                quizMode ? 'cursor-pointer ring-1 ring-amber-400/40' : ''
                              }`}
                            >
                              {stage.muscles}
                            </div>
                          )}
                        </div>

                        {/* Functional / Evolutionary Adaptation */}
                        <p className="mt-1.5 text-[11px] leading-snug text-[#ffd9d0]/80">
                          {stage.adaptation}
                        </p>
                      </div>

                      {/* Jump directly to 3D Vertebrate Model */}
                      <button
                        type="button"
                        onClick={() => {
                          onInspectIn3D(selectedSectionId, stage.vertebrateId);
                          onClose();
                        }}
                        className="hud-btn mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/18 bg-[#380909]/85 px-2.5 py-1.5 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#4d0d0d]"
                      >
                        <Box
                          className="h-3.5 w-3.5"
                          style={{ color: section.accent }}
                        />
                        <span>Inspect {vertebrate.label} in 3D</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer Attribution & Quick Hint */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ffd9d0]/10 bg-[#1a0303]/85 px-4 py-2.5 text-[11px] text-[#ffd9d0]/65 sm:px-6">
              <span>
                Vertebrate SVG Plates: Bioicons / DBCLS (CC BY 4.0) & EwaOz (CC0)
              </span>
              <span>
                Tip: Toggle <strong className="text-[#fff1ee]">Quiz Mode</strong> above to test muscle homologies during class review
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
