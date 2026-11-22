import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  SECTION_BY_ID,
  SECTIONS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Section,
  type SectionId,
  type SectionSubZone,
} from '../../data/sections';
import { HOVER_SPRING, pickTransition } from '../../lib/springs';

interface InteractiveOverlayProps {
  activeSectionId: SectionId | null;
  activeSubZoneId: string | null;
  hoveredSectionId: SectionId | null;
  hoveredSubZoneId: string | null;
  lockingSectionId: SectionId | null;
  idleHintSectionId: SectionId | null;
  emphasizeActive?: boolean;
  isDragging: boolean;
  onHoverSection: (section: Section | null, pointer?: { x: number; y: number }) => void;
  onHoverSubZone: (subZone: SectionSubZone | null, pointer?: { x: number; y: number }) => void;
  onFocusSectionKeyboard: (section: Section | null) => void;
  onSelectSection: (id: SectionId, clickPoint?: { x: number; y: number }) => void;
  onSelectSubZone: (subZoneId: string | null) => void;
}

/**
 * Exact 2403x1540 SVG 2-level hotspot overlay aligned 1:1 with map-full.jpg.
 *
 * - Level 0 (Overview): 4 main section polygons (1 Axial, 2 Appendicular, 3 Hypobranchial, 4 Branchiomeric).
 * - Level 1 (Section View) & Level 2 (Sub-Part Deep Zoom): 26 precision sub-part hotspots (1.1..4.8)
 *   covering 100% of every section so users can hover and click any specific diagram cluster to zoom in,
 *   and click again (or press Esc) to zoom smoothly back out.
 */
export function InteractiveOverlay({
  activeSectionId,
  activeSubZoneId,
  hoveredSectionId,
  hoveredSubZoneId,
  lockingSectionId,
  idleHintSectionId,
  emphasizeActive = false,
  isDragging,
  onHoverSection,
  onHoverSubZone,
  onFocusSectionKeyboard,
  onSelectSection,
  onSelectSubZone,
}: InteractiveOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const hoverTransition = pickTransition(HOVER_SPRING, prefersReducedMotion);
  const [focusedId, setFocusedId] = useState<SectionId | null>(null);
  const [focusedSubId, setFocusedSubId] = useState<string | null>(null);

  const handleKeyDown = (e: KeyboardEvent<SVGPolygonElement>, id: SectionId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectSection(id);
    }
  };

  const handleSubKeyDown = (
    e: KeyboardEvent<SVGRectElement>,
    subZoneId: string,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectSubZone(activeSubZoneId === subZoneId ? null : subZoneId);
    }
  };

  const activeSection = activeSectionId ? SECTION_BY_ID[activeSectionId] : null;
  const activeSubZone =
    activeSection?.subZones?.find((z) => z.id === activeSubZoneId) ?? null;

  return (
    <svg
      viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full overflow-visible"
      role="group"
      aria-label="Interactive muscular system sections and sub-parts"
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
            {isCurrentActive && emphasizeActive && !activeSubZone && (
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

            {/* Invisible interactive hit target for Level-0 / non-active sections */}
            <polygon
              data-testid={`hotspot-${section.id}`}
              points={section.polygon}
              fill="transparent"
              stroke="transparent"
              strokeWidth={0}
              pointerEvents={isCurrentActive ? 'none' : 'auto'}
              tabIndex={isCurrentActive ? -1 : 0}
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
                e.stopPropagation();
                onSelectSection(section.id, { x: e.clientX, y: e.clientY });
              }}
              onKeyDown={(e) => handleKeyDown(e, section.id)}
            />
          </g>
        );
      })}

      {/* Level-2 Sub-Part Spotlight Veil when zoomed into a specific sub-part */}
      {activeSection && activeSubZone && (
        <path
          data-testid="subzone-spotlight-veil"
          d={`M0,0 H${WORLD_WIDTH} V${WORLD_HEIGHT} H0 Z M${activeSubZone.bbox[0]},${activeSubZone.bbox[1]} V${activeSubZone.bbox[3]} H${activeSubZone.bbox[2]} V${activeSubZone.bbox[1]} Z`}
          fillRule="evenodd"
          fill="rgba(16, 2, 2, 0.44)"
          pointerEvents="none"
        />
      )}

      {/* Level-2 Interactive Sub-Part Hotspots inside the active section */}
      {activeSection &&
        lockingSectionId === null &&
        (activeSection.subZones ?? []).map((subZone) => {
          const [x1, y1, x2, y2] = subZone.bbox;
          const w = Math.max(10, x2 - x1);
          const h = Math.max(10, y2 - y1);
          const isSubActive = activeSubZoneId === subZone.id;
          const isSubHovered =
            !isDragging &&
            (hoveredSubZoneId === subZone.id || focusedSubId === subZone.id);
          const isAnySubActive = activeSubZoneId !== null;

          return (
            <g
              key={subZone.id}
              data-subzone-group={subZone.id}
            >
              {/* Soft hover tint or active spotlight border */}
              {(isSubHovered || isSubActive || !isAnySubActive) && (
                <>
                  {/* Hover fill tint */}
                  <rect
                    x={x1}
                    y={y1}
                    width={w}
                    height={h}
                    rx={12}
                    fill={
                      isSubHovered && !isSubActive
                        ? `${activeSection.accent}18`
                        : 'transparent'
                    }
                    stroke={activeSection.accent}
                    strokeWidth={
                      isSubActive ? 2.8 : isSubHovered ? 2.8 : 1.35
                    }
                    strokeDasharray={
                      isSubActive ? undefined : isSubHovered ? '14 8' : '8 7'
                    }
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                    className={
                      isSubHovered && !isSubActive ? 'edge-glow-dash' : undefined
                    }
                    style={{
                      opacity: isSubActive
                        ? 0.96
                        : isSubHovered
                          ? 0.94
                          : isAnySubActive
                            ? 0.18
                            : 0.36,
                      transition: 'opacity 160ms ease-out',
                    }}
                  />

                  {/* Crisp inner highlight line on active or hovered sub-part */}
                  {(isSubHovered || isSubActive) && (
                    <rect
                      x={x1}
                      y={y1}
                      width={w}
                      height={h}
                      rx={12}
                      fill="none"
                      stroke="#fff1ee"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                      style={{
                        opacity: isSubActive ? 0.55 : 0.42,
                      }}
                    />
                  )}
                </>
              )}

              {/* Compact Top-Left Corner Code Badge (e.g. 2.1, 2.4) in Level-1 Section View or when hovering another sub-part */}
              {!isSubActive && (!isAnySubActive || isSubHovered) && (
                <g
                  transform={`translate(${x1 + 8}, ${y1 + 8})`}
                  pointerEvents="none"
                  style={{
                    opacity: isSubHovered ? 1 : 0.82,
                    transition: 'opacity 150ms ease-out',
                  }}
                >
                  <rect
                    x={0}
                    y={0}
                    width={isSubHovered ? Math.min(w - 16, Math.max(40, subZone.code.length * 9 + 18)) : 38}
                    height={21}
                    rx={6}
                    fill={
                      isSubHovered
                        ? activeSection.accent
                        : 'rgba(26, 4, 4, 0.88)'
                    }
                    stroke={
                      isSubHovered
                        ? '#fff1ee'
                        : activeSection.accent
                    }
                    strokeWidth={1.1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={19}
                    y={14.5}
                    textAnchor="middle"
                    fill={
                      isSubHovered
                        ? activeSection.badgeText
                        : '#fff1ee'
                    }
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {subZone.code}
                  </text>
                </g>
              )}

              {/* Interactive Sub-Part Hit Target */}
              <rect
                data-testid={`subzone-hotspot-${subZone.id}`}
                x={x1}
                y={y1}
                width={w}
                height={h}
                rx={12}
                fill="transparent"
                stroke="transparent"
                strokeWidth={0}
                pointerEvents="auto"
                tabIndex={0}
                role="button"
                aria-label={`${
                  isSubActive ? 'Zoom out from' : 'Zoom into'
                } sub-part ${subZone.code}: ${subZone.label} (${subZone.detail})`}
                aria-pressed={isSubActive}
                className={
                  isSubActive ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }
                onMouseEnter={(e: MouseEvent<SVGRectElement>) =>
                  onHoverSubZone(subZone, { x: e.clientX, y: e.clientY })
                }
                onMouseMove={(e: MouseEvent<SVGRectElement>) =>
                  onHoverSubZone(subZone, { x: e.clientX, y: e.clientY })
                }
                onMouseLeave={() => onHoverSubZone(null)}
                onFocus={() => {
                  setFocusedSubId(subZone.id);
                  onHoverSubZone(subZone);
                }}
                onBlur={() => {
                  setFocusedSubId((prev) =>
                    prev === subZone.id ? null : prev,
                  );
                  onHoverSubZone(null);
                }}
                onClick={(e: MouseEvent<SVGRectElement>) => {
                  e.stopPropagation();
                  onSelectSubZone(isSubActive ? null : subZone.id);
                }}
                onKeyDown={(e) => handleSubKeyDown(e, subZone.id)}
              />
            </g>
          );
        })}
    </svg>
  );
}
