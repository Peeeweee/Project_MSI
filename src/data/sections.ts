export type SectionId =
  | 'axial'
  | 'appendicular'
  | 'hypobranchial'
  | 'branchiomeric';

export interface Section {
  id: SectionId;
  n: 1 | 2 | 3 | 4;
  name: string;
  owner: string;
  /** Official Group 2 presenter full name from the updated poster */
  fullName: string;
  crop: string;
  /** Public URL to the hi-res zoomed crop (lazy-loaded on hover/focus/entry) */
  cropSrc: string;
  /** Section accent color — used in HUD elements and hover/lock-on outline glow */
  accent: string;
  /** WCAG AA foreground text color (>= 4.7:1 contrast) on top of `accent` */
  badgeText: '#fff1ee' | '#160303';
  /** Bounding box [x1, y1, x2, y2] in the 2403x1540 coordinate space */
  bbox: readonly [number, number, number, number];
  /** SVG polygon points string in the 2403x1540 coordinate space */
  polygon: string;
  /** Visual centroid [x, y] inside the polygon for keyboard focus badge placement */
  anchor: readonly [number, number];
  summary: string;
}

export const WORLD_WIDTH = 2403;
export const WORLD_HEIGHT = 1540;

/** Responsive display artwork (2400w / 1200w) for crisp fast initial paint */
export const FULL_MAP_DISPLAY_2400 = './assets/map-full-2400w.jpg?v=3';
export const FULL_MAP_DISPLAY_1200 = './assets/map-full-1200w.jpg?v=3';
/** Full 5560x3563 master artwork loaded lazily only on deep zoom */
export const FULL_MAP_SRC = './assets/map-full.jpg?v=3';

export const SECTIONS: readonly Section[] = [
  {
    id: 'axial',
    n: 1,
    name: 'Axial',
    owner: 'Hanami',
    fullName: 'Hanna Mae M. Ceniza',
    crop: 'axial.jpg',
    cropSrc: './assets/axial.jpg?v=3',
    accent: '#2563eb',
    badgeText: '#fff1ee',
    bbox: [0, 802, 1172, 1540],
    polygon: '0,802 1172,802 1172,1540 0,1540',
    anchor: [586, 1170],
    summary:
      'Segmented myomeres, epaxial (dorsal) and hypaxial (ventral body-wall layers including birds), and the axial pectoral sling.',
  },
  {
    id: 'appendicular',
    n: 2,
    name: 'Appendicular',
    owner: 'Jenny',
    fullName: 'Jenny Lou D. Abangan',
    crop: 'appendicular.jpg',
    cropSrc: './assets/appendicular.jpg?v=3',
    accent: '#0d9488',
    badgeText: '#160303',
    bbox: [0, 0, 1040, 802],
    polygon: '0,0 1040,0 1040,802 0,802',
    anchor: [520, 400],
    summary:
      'Pectoral (4-source) & pelvic (3-source) girdle/limb musculature, embryonic development, and tetrapod specializations (saltatorial, flight, cursorial).',
  },
  {
    id: 'hypobranchial',
    n: 3,
    name: 'Hypobranchial',
    owner: 'Reymark',
    fullName: 'Reymark P. Villarosa',
    crop: 'hypobranchial.jpg',
    cropSrc: './assets/hypobranchial.jpg?v=3',
    accent: '#7c3aed',
    badgeText: '#fff1ee',
    bbox: [1040, 0, 2006, 802],
    polygon: '1040,0 2006,0 2006,330 1805,330 1805,802 1040,802',
    anchor: [1450, 365],
    summary:
      'Tongue musculature; somitic throat development, cervical spinal innervation, position & function, and comparative vertebrate pattern.',
  },
  {
    id: 'branchiomeric',
    n: 4,
    name: 'Branchiomeric',
    owner: 'Kurt',
    fullName: 'Kurt Hendrick P. Saromines',
    crop: 'branchiomeric.jpg',
    cropSrc: './assets/branchiomeric.jpg?v=3',
    accent: '#d97706',
    badgeText: '#160303',
    bbox: [1172, 0, 2403, 1540],
    polygon:
      '2006,0 2403,0 2403,1540 1172,1540 1172,802 1805,802 1805,330 2006,330',
    anchor: [1920, 1080],
    summary:
      'Derived from the pharyngeal arches: mandibular, hyoid and branchial arches (cucullaris & facial muscles), plus extrinsic eye muscles (CN III, IV, VI).',
  },
] as const;

export const SECTION_BY_ID: Record<SectionId, Section> = {
  axial: SECTIONS[0],
  appendicular: SECTIONS[1],
  hypobranchial: SECTIONS[2],
  branchiomeric: SECTIONS[3],
};

export function getNextSectionId(id: SectionId): SectionId {
  const idx = SECTIONS.findIndex((s) => s.id === id);
  return SECTIONS[(idx + 1) % SECTIONS.length].id;
}

export function getPrevSectionId(id: SectionId): SectionId {
  const idx = SECTIONS.findIndex((s) => s.id === id);
  return SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length].id;
}

/**
 * Converts an SVG polygon string in 2403x1540 world space into a CSS `polygon(...)`
 * clip-path relative to a section's bounding box [x1, y1, x2, y2].
 */
export function buildBboxClipPath(section: Section): string {
  const [x1, y1, x2, y2] = section.bbox;
  const bw = x2 - x1;
  const bh = y2 - y1;

  const pairs = section.polygon
    .trim()
    .split(/\s+/)
    .map((pt) => {
      const [px, py] = pt.split(',').map(Number);
      const rx = (((px - x1) / bw) * 100).toFixed(3);
      const ry = (((py - y1) / bh) * 100).toFixed(3);
      return `${rx}% ${ry}%`;
    });

  return `polygon(${pairs.join(', ')})`;
}

/**
 * Converts an SVG polygon string in 2403x1540 world space into a CSS `polygon(...)`
 * clip-path relative to the full 2403x1540 artwork (used for the hover spotlight cutout).
 */
export function buildWorldClipPath(section: Section): string {
  const pairs = section.polygon
    .trim()
    .split(/\s+/)
    .map((pt) => {
      const [px, py] = pt.split(',').map(Number);
      const rx = ((px / WORLD_WIDTH) * 100).toFixed(3);
      const ry = ((py / WORLD_HEIGHT) * 100).toFixed(3);
      return `${rx}% ${ry}%`;
    });

  return `polygon(${pairs.join(', ')})`;
}
