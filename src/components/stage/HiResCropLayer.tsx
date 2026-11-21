import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  buildBboxClipPath,
  SECTIONS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type SectionId,
} from '../../data/sections';
import type { LoadedCropMeta } from '../../lib/preload';
import { REDUCED_TRANSITION } from '../../lib/springs';

interface HiResCropLayerProps {
  activeSectionId: SectionId | null;
  /** True starting at Phase 3 ("Reveal", ~0.9s) so crop crossfades crisply at full zoom */
  revealed: boolean;
  loadedCrops: Partial<Record<SectionId, LoadedCropMeta>>;
}

/**
 * Pixel-aligned hi-res crop crossfade placed directly inside the shared camera
 * wrapper at each section's exact 2403x1540 bbox coordinates, masked strictly
 * to its SVG polygon so there is zero position jump during swap.
 */
export function HiResCropLayer({
  activeSectionId,
  revealed,
  loadedCrops,
}: HiResCropLayerProps) {
  const prefersReducedMotion = useReducedMotion();

  const geometries = useMemo(
    () =>
      SECTIONS.map((section) => {
        const [x1, y1, x2, y2] = section.bbox;
        return {
          section,
          style: {
            left: `${(x1 / WORLD_WIDTH) * 100}%`,
            top: `${(y1 / WORLD_HEIGHT) * 100}%`,
            width: `${((x2 - x1) / WORLD_WIDTH) * 100}%`,
            height: `${((y2 - y1) / WORLD_HEIGHT) * 100}%`,
            clipPath: buildBboxClipPath(section),
          },
        };
      }),
    [],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {geometries.map(({ section, style }) => {
        const meta = loadedCrops[section.id];
        if (!meta || !meta.alignsWithBbox) return null;

        const isVisible = revealed && activeSectionId === section.id;

        return (
          <motion.img
            key={section.id}
            src={meta.src}
            alt=""
            loading="lazy"
            draggable={false}
            decoding="async"
            initial={false}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={
              prefersReducedMotion
                ? REDUCED_TRANSITION
                : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
            }
            className="absolute block select-none object-fill"
            style={style}
          />
        );
      })}
    </div>
  );
}
