import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import type {
  EffectsConfig,
  EffectsPreset,
} from '../../hooks/useEffectsSettings';
import { HUD_SPRING, pickTransition } from '../../lib/springs';
import { TiltCard } from './TiltCard';

interface EffectsPopoverProps {
  open: boolean;
  config: EffectsConfig;
  activePreset: EffectsPreset | 'custom';
  onClose: () => void;
  onSelectPreset: (preset: EffectsPreset) => void;
  onToggleEffect: (key: keyof EffectsConfig) => void;
  onReplayIntro: () => void;
}

const EFFECT_ITEMS: Array<{
  key: keyof EffectsConfig;
  label: string;
  desc: string;
}> = [
  {
    key: 'ambient',
    label: 'Ambient fibers',
    desc: 'Maroon/blush particles & muscle-fiber lines',
  },
  {
    key: 'parallax',
    label: 'Depth parallax',
    desc: '3-layer mouse & mobile tilt depth',
  },
  {
    key: 'cardTilt',
    label: '3D card tilt',
    desc: 'Specular cursor highlight on HUD cards',
  },
  {
    key: 'ownerBadge',
    label: 'Owner badge card',
    desc: 'Animated presenter card on hover',
  },
  {
    key: 'intro',
    label: 'Micro-intro',
    desc: '2s title reveal & animated counters',
  },
  {
    key: 'skeleton',
    label: 'Load skeleton',
    desc: 'Blurred LQIP artwork sharpen',
  },
  {
    key: 'sound',
    label: 'Sound effects',
    desc: 'Soft transition whoosh & hover tick',
  },
];

export function EffectsPopover({
  open,
  config,
  activePreset,
  onClose,
  onSelectPreset,
  onToggleEffect,
  onReplayIntro,
}: EffectsPopoverProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        panelRef.current &&
        target &&
        !panelRef.current.contains(target) &&
        !target.closest('[data-testid="effects-trigger"]')
      ) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          key="effects-popover"
          data-testid="effects-popover"
          role="dialog"
          aria-label="Visual effects settings"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={transition}
          className="fixed right-3 top-[52px] z-50 w-[290px] sm:right-5"
        >
          <TiltCard
            enabled={config.cardTilt}
            maxTilt={4.5}
            className="hud-glass rounded-2xl border border-[#ffd9d0]/20 p-3.5 shadow-2xl"
          >
            {/* Header + Preset selector (Full / Lite / Off) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#fff1ee]">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#ffd9d0]" />
                <span>Effects</span>
                {activePreset === 'custom' && (
                  <span className="rounded bg-[#fff1ee]/12 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#ffd9d0]">
                    Custom
                  </span>
                )}
              </div>

              <button
                type="button"
                data-testid="replay-intro-btn"
                onClick={() => {
                  onClose();
                  onReplayIntro();
                }}
                className="hud-btn inline-flex items-center gap-1 rounded-lg bg-[#fff1ee]/8 px-2 py-1 text-[10px] font-semibold text-[#ffd9d0] hover:bg-[#fff1ee]/16 hover:text-[#fff1ee]"
                title="Replay 2-second micro-intro"
              >
                <Play className="h-2.5 w-2.5" />
                <span>Replay intro</span>
              </button>
            </div>

            {/* Segmented Preset Bar: Full / Lite / Off */}
            <div
              role="radiogroup"
              aria-label="Effects quality preset"
              className="mt-2.5 grid grid-cols-3 gap-1 rounded-xl bg-[#240505]/80 p-1"
            >
              {(['full', 'lite', 'off'] as const).map((preset) => {
                const selected = activePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`effects-preset-${preset}`}
                    onClick={() => onSelectPreset(preset)}
                    className="hud-btn relative rounded-lg py-1.5 text-xs font-semibold capitalize"
                    style={{
                      color: selected ? '#3b0a0a' : 'rgba(255, 217, 208, 0.8)',
                    }}
                  >
                    {selected && (
                      <motion.span
                        layoutId="effects-preset-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="absolute inset-0 rounded-lg bg-[#fff1ee]"
                      />
                    )}
                    <span className="relative z-10">{preset}</span>
                  </button>
                );
              })}
            </div>

            {/* Individual Toggles */}
            <ul className="mt-3 divide-y divide-[#ffd9d0]/10">
              {EFFECT_ITEMS.map((item) => {
                const on = config[item.key];
                return (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#fff1ee]">
                        {item.key === 'sound' &&
                          (on ? (
                            <Volume2 className="h-3 w-3 text-[#ffd9d0]" />
                          ) : (
                            <VolumeX className="h-3 w-3 text-[#ffd9d0]/55" />
                          ))}
                        <span>{item.label}</span>
                      </div>
                      <div className="truncate text-[10px] text-[#ffd9d0]/90">
                        {item.desc}
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      data-testid={`effect-toggle-${item.key}`}
                      onClick={() => onToggleEffect(item.key)}
                      className="relative flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors"
                      style={{
                        backgroundColor: on
                          ? '#8b1a1a'
                          : 'rgba(255, 241, 238, 0.08)',
                        borderColor: on
                          ? 'rgba(255, 217, 208, 0.45)'
                          : 'rgba(255, 217, 208, 0.16)',
                      }}
                    >
                      <motion.span
                        layout
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                        className="block h-3.5 w-3.5 rounded-full shadow-sm"
                        style={{
                          marginLeft: on ? 'auto' : 0,
                          backgroundColor: on ? '#fff1ee' : 'rgba(255, 217, 208, 0.5)',
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </TiltCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

