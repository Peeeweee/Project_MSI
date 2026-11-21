import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  buildWorldClipPath,
  FULL_MAP_DISPLAY_2400,
  type Section,
} from '../../data/sections';
import { pickTransition } from '../../lib/springs';

interface SpotlightOverlayProps {
  /** Highlighted section (hovered on overview, locked-on in Phase 1, or isolated) */
  section: Section | null;
  /** Phase 1 "Lock on" adds a 6px backdrop blur to the dimmed non-target regions */
  blurOutside?: boolean;
  /** Zoomed section emphasis: base poster is grayscale/decolorized while active polygon renders vivid full color */
  emphasizeActive?: boolean;
  /** Active display image src (2400w or fallback master) */
  mapSrc?: string;
  /** Only render cutout image once the base artwork has loaded */
  mapLoaded: boolean;
}

const SPOTLIGHT_SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 0.85,
};

/**
 * Spotlight effect for hover/focus and Phase 1 ("Lock on"):
 * Unmounts cleanly via AnimatePresence when inactive so ZERO backdrop-filter
 * layers sit inside the transforming camera wrapper during Phase 2 Fly-In.
 */
export function SpotlightOverlay({
  section,
  blurOutside = false,
  emphasizeActive = false,
  mapSrc = FULL_MAP_DISPLAY_2400,
  mapLoaded,
}: SpotlightOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(SPOTLIGHT_SPRING, prefersReducedMotion);

  const active = Boolean(section && mapLoaded);
  const clipPath = section ? buildWorldClipPath(section) : undefined;
  const backdropValue = blurOutside
    ? 'blur(6px) saturate(0.5)'
    : emphasizeActive
      ? undefined
      : 'saturate(0.35)';

  return (
    <AnimatePresence>
      {active && section && clipPath && (
        <motion.div
          key="spotlight-layer"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {/* Dim veil over non-target regions (base poster is already grayscale(100%) in emphasizeActive mode) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: blurOutside
                ? 'rgba(18, 3, 3, 0.5)'
                : emphasizeActive
                  ? 'rgba(18, 3, 3, 0.24)'
                  : 'rgba(20, 4, 4, 0.44)',
              backdropFilter: backdropValue,
              WebkitBackdropFilter: backdropValue,
            }}
          />

          {/* Crisp, 100% full-vivid-color polygon cutout keeping the target section sharp & emphasized */}
          <img
            src={mapSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 block h-full w-full select-none object-contain"
            style={{ clipPath }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
