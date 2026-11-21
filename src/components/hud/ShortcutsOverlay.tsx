import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { HUD_SPRING, pickTransition } from '../../lib/springs';
import { TiltCard } from './TiltCard';

interface ShortcutsOverlayProps {
  open: boolean;
  cardTiltEnabled?: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['1', '2', '3', '4'], label: 'Jump to Axial, Appendicular, Hypobranchial, or Branchiomeric' },
  { keys: ['←', '→'], label: 'Cycle previous / next presenter section' },
  { keys: ['Esc', '0'], label: 'Return to full edge-to-edge overview' },
  { keys: ['+', '−'], label: 'Zoom in / zoom out smoothly' },
  { keys: ['Scroll'], label: 'Zoom around cursor position' },
  { keys: ['Drag'], label: 'Pan freely while zoomed in' },
  { keys: ['Double-Click'], label: 'Quick zoom into point or reset' },
  { keys: ['V'], label: 'Switch between Poster Mode and 3D Visual Model' },
  { keys: ['F'], label: 'Spotlight isolate active section' },
  { keys: ['H'], label: 'Toggle clean presentation mode (hide HUD)' },
];

export function ShortcutsOverlay({
  open,
  cardTiltEnabled = true,
  onClose,
}: ShortcutsOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#180303]/72 p-4 backdrop-blur-sm"
        >
          <motion.div
            key="shortcuts-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard and navigation shortcuts"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={transition}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <TiltCard
              enabled={cardTiltEnabled}
              maxTilt={5}
              className="hud-glass w-full rounded-2xl p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#fff1ee]">
                    Navigation Controls
                  </h2>
                  <p className="mt-0.5 text-xs text-[#ffd9d0]/70">
                    Built for smooth classroom presentation & inspection
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="hud-btn flex h-8 w-8 items-center justify-center rounded-full text-[#ffd9d0]/80 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]"
                  aria-label="Close shortcuts"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="mt-4 divide-y divide-[#ffd9d0]/10">
                {SHORTCUTS.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-4 py-2.5 text-xs"
                  >
                    <span className="text-[#ffd9d0]/90">{item.label}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {item.keys.map((key) => (
                        <kbd
                          key={key}
                          className="font-mono-num rounded-md border border-[#ffd9d0]/22 bg-[#2a0606]/90 px-1.5 py-0.5 text-[11px] font-medium text-[#fff1ee]"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </TiltCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

