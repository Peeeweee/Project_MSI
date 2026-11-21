import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  SECTIONS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Section,
  type SectionId,
} from '../../data/sections';
import { HOVER_SPRING, pickTransition } from '../../lib/springs';

interface InteractiveOverlayProps {
  activeSectionId: SectionId | null;
  hoveredSectionId: SectionId | null;
  lockingSectionId: SectionId | null;
  idleHintSectionId: SectionId | null;
  emphasizeActive?: boolean;
  isDragging: boolean;
  onHoverSection: (section: Section | null, pointer?: { x: number; y: number }) => void;
  onFocusSectionKeyboard: (section: Section | null) => void;
  onSelectSection: (id: SectionId, clickPoint?: { x: number; y: number }) => void;
}

/**
 * Exact 2403x1540 SVG hotspot overlay aligned 1:1 with map-full.jpg.
 *
 * Performance & Accessibility:
 * - Only mounts the blurred SVG filter polygon while a section is actively
 *   hovered/focused/locked/hinted so camera zoom stays 100% compositor-only.
 * - Full keyboard navigation with crisp high-contrast visible focus rings.
 */
export function InteractiveOverlay({
  activeSectionId,
  hoveredSectionId,
  lockingSectionId,
  idleHintSectionId,
  emphasizeActive = false,
  isDragging,
  onHoverSection,
  onFocusSectionKeyboard,
  onSelectSection,
}: InteractiveOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const hoverTransition = pickTransition(HOVER_SPRING, prefersReducedMotion);
  const [focusedId, setFocusedId] = useState<SectionId | null>(null);

  const handleKeyDown = (e: KeyboardEvent<SVGPolygonElement>, id: SectionId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectSection(id);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full overflow-visible"
      role="group"
      aria-label="Interactive muscular system sections"
    >
      <defs>
        <filter
          id="section-edge-glow"
          x="-12%"
          y="-12%"
          width="124%"
          height="124%"
        >
          <feGaussianBlur stdDeviation="8" result="blurred" />
        </filter>
      </defs>

      {SECTIONS.map((section) => {
        const isCurrentActive = activeSectionId === section.id;
        const isLocking = lockingSectionId === section.id;
        const isKeyboardFocused = focusedId === section.id && !isCurrentActive;
        const isHovered =
          !isDragging &&
          hoveredSectionId === section.id &&
          !isCurrentActive &&
          lockingSectionId === null;
        const isIdleHint =
          activeSectionId === null &&
          hoveredSectionId === null &&
          lockingSectionId === null &&
          idleHintSectionId === section.id;

        const showGlow = isHovered || isIdleHint || isLocking || isKeyboardFocused;

        return (
          <g key={section.id} data-section-group={section.id}>
            {/* Mount blurred filter duplicate ONLY when active so zero filter textures sit during zoom */}
            {showGlow && (
              <>
                <motion.polygon
                  points={section.polygon}
                  fill="none"
                  stroke={section.accent}
                  strokeWidth={isLocking ? 18 : 11}
                  strokeLinejoin="round"
                  filter="url(#section-edge-glow)"
                  pointerEvents="none"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isLocking
                      ? [0.35, 0.95, 0.55]
                      : isHovered || isKeyboardFocused
                        ? 0.58
                        : 0.45,
                  }}
                  transition={
                    isLocking
                      ? { duration: 0.42, times: [0, 0.45, 1], ease: 'easeOut' }
                      : hoverTransition
                  }
                />

                <motion.polygon
                  points={section.polygon}
                  fill="none"
                  stroke={section.accent}
                  strokeWidth={isLocking ? 4.5 : 3.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="18 10"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                  className="edge-glow-dash"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isLocking
                      ? [0.6, 1, 0.85]
                      : isHovered || isKeyboardFocused
                        ? 0.94
                        : 0.85,
                  }}
                  transition={
                    isLocking
                      ? { duration: 0.42, times: [0, 0.45, 1], ease: 'easeOut' }
                      : hoverTransition
                  }
                />

                <motion.polygon
                  points={section.polygon}
                  fill="none"
                  stroke="#fff1ee"
                  strokeWidth={isKeyboardFocused ? 3 : 1.1}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isKeyboardFocused
                      ? 0.95
                      : isHovered
                        ? 0.45
                        : isIdleHint
                          ? 0.55
                          : 0,
                  }}
                  transition={hoverTransition}
                />
              </>
            )}

            {/* Crisp active-section emphasis frame when non-current parts are decolorized */}
            {isCurrentActive && emphasizeActive && (
              <>
                <motion.polygon
                  points={section.polygon}
                  fill="none"
                  stroke={section.accent}
                  strokeWidth={3.2}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.92 }}
                  transition={hoverTransition}
                />
                <motion.polygon
                  points={section.polygon}
                  fill="none"
                  stroke="#fff1ee"
                  strokeWidth={1.1}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.52 }}
                  transition={hoverTransition}
                />
              </>
            )}

            {/* Phase 1 one-shot target pulse flash along the locked polygon edge */}
            {isLocking && !prefersReducedMotion && (
              <motion.polygon
                key={`pulse-${section.id}`}
                points={section.polygon}
                fill="none"
                stroke="#fff1ee"
                strokeWidth={5}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
                initial={{ opacity: 0.95 }}
                animate={{ opacity: [0.95, 0.25, 0] }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              />
            )}

            {/* Invisible interactive hit target (tap, click, and keyboard focusable) */}
            <polygon
              data-testid={`hotspot-${section.id}`}
              points={section.polygon}
              fill="transparent"
              stroke="transparent"
              strokeWidth={0}
              pointerEvents="auto"
              tabIndex={0}
              role="button"
              aria-label={`Zoom into ${section.name} musculature, prepared by ${section.owner}`}
              aria-pressed={isCurrentActive}
              className="section-polygon cursor-pointer"
              onMouseEnter={(e: MouseEvent<SVGPolygonElement>) =>
                onHoverSection(section, { x: e.clientX, y: e.clientY })
              }
              onMouseMove={(e: MouseEvent<SVGPolygonElement>) =>
                onHoverSection(section, { x: e.clientX, y: e.clientY })
              }
              onMouseLeave={() => onHoverSection(null)}
              onFocus={() => {
                setFocusedId(section.id);
                onFocusSectionKeyboard(section);
              }}
              onBlur={() => {
                setFocusedId((prev) => (prev === section.id ? null : prev));
                onFocusSectionKeyboard(null);
              }}
              onClick={(e: MouseEvent<SVGPolygonElement>) => {
                if (isCurrentActive) return;
                onSelectSection(section.id, { x: e.clientX, y: e.clientY });
              }}
              onKeyDown={(e) => handleKeyDown(e, section.id)}
            />
          </g>
        );
      })}
    </svg>
  );
}
