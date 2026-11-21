import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Section } from '../../data/sections';
import { HUD_SPRING, pickTransition } from '../../lib/springs';

interface CropLightboxProps {
  section: Section | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Fallback clean viewer used only if a section's hi-res crop has a custom aspect
 * ratio that differs from its exact map bbox.
 */
export function CropLightbox({ section, open, onClose }: CropLightboxProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);

  return (
    <AnimatePresence>
      {open && section && (
        <motion.div
          key="crop-lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#180303]/85 p-4 backdrop-blur-md"
        >
          <motion.div
            key="crop-lightbox-frame"
            role="dialog"
            aria-modal="true"
            aria-label={`Hi-res crop: ${section.name} musculature`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={transition}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92dvh] max-w-[94dvw] flex-col items-center"
          >
            <img
              src={section.cropSrc}
              alt={`${section.name} musculature hi-res crop`}
              className="max-h-[84dvh] max-w-[92dvw] object-contain"
              draggable={false}
            />

            <div className="hud-pill mt-3 flex items-center gap-3 rounded-full px-4 py-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: section.accent }}
              />
              <span className="text-xs font-semibold text-[#fff1ee]">
                Part {section.n} · {section.name} — {section.owner}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="hud-btn ml-1 flex h-6 w-6 items-center justify-center rounded-full text-[#ffd9d0] hover:bg-[#fff1ee]/15 hover:text-[#fff1ee]"
                aria-label="Close hi-res crop"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

