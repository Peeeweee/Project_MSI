import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { Section } from '../../data/sections';
import { HOVER_SPRING, pickTransition } from '../../lib/springs';
import { TiltCard } from './TiltCard';

interface OwnerBadgeProps {
  section: Section;
  enabled: boolean;
  cardTiltEnabled: boolean;
  onHoverSound?: () => void;
}

/**
 * Interactive section "owner" badge. On hover/focus reveals a compact animated
 * 3D glass card displaying the presenter's name and the part they prepared.
 */
export function OwnerBadge({
  section,
  enabled,
  cardTiltEnabled,
  onHoverSound,
}: OwnerBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HOVER_SPRING, prefersReducedMotion);
  const [open, setOpen] = useState(false);

  const initial = section.owner.charAt(0).toUpperCase();

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => {
        if (!enabled) return;
        setOpen(true);
        onHoverSound?.();
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        data-testid="owner-badge"
        onFocus={() => enabled && setOpen(true)}
        onBlur={() => setOpen(false)}
        className="hud-btn inline-flex items-center gap-1.5 rounded-full border border-[#ffd9d0]/18 bg-[#fff1ee]/6 px-2 py-0.5 text-xs font-medium text-[#ffd9d0] hover:border-[#ffd9d0]/38 hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
      >
        <span
          className="font-mono-num flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
          style={{
            backgroundColor: section.accent,
            color: section.badgeText,
          }}
        >
          {initial}
        </span>
        <span>Prepared by {section.owner}</span>
      </button>

      <AnimatePresence>
        {enabled && open && (
          <motion.div
            key={`owner-card-${section.id}`}
            data-testid="owner-hover-card"
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.94 }}
            transition={transition}
            className="pointer-events-auto absolute left-0 top-full z-50 mt-2 w-[256px]"
          >
            <TiltCard
              enabled={cardTiltEnabled}
              maxTilt={7}
              className="hud-glass rounded-xl border border-[#ffd9d0]/22 p-3 shadow-2xl"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold"
                  style={{
                    backgroundColor: section.accent,
                    color: section.badgeText,
                    boxShadow: `0 0 16px ${section.accent}66`,
                  }}
                >
                  {initial}
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#ffd9d0]">
                    <Sparkles className="h-2.5 w-2.5" style={{ color: section.accent }} />
                    <span>Group 2 · Part 0{section.n}</span>
                  </div>
                  <div className="font-display truncate text-sm font-semibold text-[#fff1ee]">
                    {section.fullName}
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded-lg bg-[#240505]/90 px-2.5 py-1.5 text-[11px] leading-snug text-[#ffd9d0]">
                Prepared <span className="font-semibold text-[#fff1ee]">{section.name} Musculature</span> —{' '}
                {section.summary}
              </div>
            </TiltCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

