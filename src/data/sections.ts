export type SectionId =
  | 'axial'
  | 'appendicular'
  | 'hypobranchial'
  | 'branchiomeric';

export interface SubZoneCard {
  readonly id: string;
  readonly label: string;
  readonly bbox: readonly [number, number, number, number];
}

export interface SectionSubZone {
  readonly id: string;
  /** Hierarchical sub-part number (e.g. "2.1".."2.10") */
  readonly code: string;
  readonly label: string;
  readonly detail: string;
  /** Target [x1, y1, x2, y2] in 2403x1540 poster space */
  readonly bbox: readonly [number, number, number, number];
  /** Optional individual animal specimen cards inside this sub-part for 1-click 920% deep zoom */
  readonly cards?: readonly SubZoneCard[];
}

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
  /** Level-2 interactive sub-parts (enabled exclusively for Jenny's Appendicular section) */
  subZones: readonly SectionSubZone[];
}

export const WORLD_WIDTH = 2403;
export const WORLD_HEIGHT = 1540;

/** Responsive display artwork (2400w / 1200w) for crisp fast initial paint */
export const FULL_MAP_DISPLAY_2400 = './assets/map-full-2400w.jpg?v=12';
export const FULL_MAP_DISPLAY_1200 = './assets/map-full-1200w.jpg?v=12';
/** Full 5560x3563 master artwork loaded lazily on zoom */
export const FULL_MAP_SRC = './assets/map-full.jpg?v=12';

export const SECTIONS: readonly Section[] = [
  {
    id: 'axial',
    n: 1,
    name: 'Axial',
    owner: 'Hanami',
    fullName: 'Hanna Mae M. Ceniza',
    crop: 'axial.jpg',
    cropSrc: './assets/axial.jpg?v=12',
    accent: '#2563eb',
    badgeText: '#fff1ee',
    bbox: [0, 802, 1172, 1540],
    polygon: '0,802 1172,802 1172,1540 0,1540',
    anchor: [586, 1170],
    summary:
      'Segmented myomeres, epaxial (dorsal) and hypaxial (ventral body-wall layers including birds), and the axial pectoral sling.',
    subZones: [],
  },
  {
    id: 'appendicular',
    n: 2,
    name: 'Appendicular',
    owner: 'Jenny',
    fullName: 'Jenny Lou D. Abangan',
    crop: 'appendicular.jpg',
    cropSrc: './assets/appendicular.jpg?v=12',
    accent: '#0d9488',
    badgeText: '#160303',
    bbox: [0, 0, 1040, 802],
    polygon: '0,0 1040,0 1040,802 0,802',
    anchor: [520, 400],
    summary:
      'Pectoral (4-source) & pelvic (3-source) girdle/limb musculature, embryonic development, and tetrapod specializations (saltatorial, flight, cursorial).',
    subZones: [
      {
        id: 'append-fins',
        code: '2.1',
        label: 'Paired Fins: Teleosts & Sharks',
        detail: '2 Diagrams · Teleost Abductor/Adductor vs. Shark Propterygium & Pectoral Fin',
        bbox: [6, 6, 394, 166],
        cards: [
          { id: 'teleosts', label: 'Teleosts', bbox: [6, 6, 192, 166] },
          { id: 'sharks', label: 'Sharks', bbox: [195, 6, 394, 166] },
        ],
      },
      {
        id: 'append-dev',
        code: '2.2',
        label: 'Embryonic Fin/Limb Development',
        detail: '3 Comparative Stages · Amniotes, Teleosts (Derived) & Chondrichthyans (Primitive)',
        bbox: [398, 4, 1010, 174],
        cards: [
          { id: 'amniotes', label: 'Amniotes', bbox: [398, 4, 595, 174] },
          { id: 'teleosts', label: 'Teleosts', bbox: [600, 4, 798, 174] },
          { id: 'chondrichthyans', label: 'Chondrichthyans', bbox: [802, 4, 1010, 174] },
        ],
      },
      {
        id: 'append-fore-1',
        code: '2.3',
        label: 'Forelimb I: Amphibians & Reptiles',
        detail: '2 Diagrams · Salamander (Necturus) & Reptile Superficial/Deep Forelimb',
        bbox: [10, 268, 315, 369],
        cards: [
          { id: 'amphibians', label: 'Amphibians', bbox: [10, 268, 158, 369] },
          { id: 'reptiles', label: 'Reptiles', bbox: [160, 268, 315, 369] },
        ],
      },
      {
        id: 'append-fore-2',
        code: '2.4',
        label: 'Forelimb II: Avians & Mammals',
        detail: '2 Diagrams · Pigeon Wing (Dorsal/Ventral) & Domestic Cat Forelimb',
        bbox: [3, 376, 315, 483],
        cards: [
          { id: 'avians', label: 'Avians', bbox: [3, 376, 160, 483] },
          { id: 'mammals', label: 'Mammals', bbox: [165, 376, 315, 483] },
        ],
      },
      {
        id: 'append-pelv-sources',
        code: '2.5',
        label: 'Pelvic Fin: Chondrichthyans',
        detail: '1 Diagram · Shark Pelvic Fin: Epaxialis, Adductor Superficialis & Puboischiac Bar',
        bbox: [526, 368, 656, 563],
      },
      {
        id: 'append-hind',
        code: '2.6',
        label: 'Hindlimb Clades',
        detail: '3 Clades · Amphibians, Avians & Mammals Pelvic Hindlimb Musculature',
        bbox: [4, 498, 468, 624],
        cards: [
          { id: 'amphibians', label: 'Amphibians (Frog)', bbox: [4, 498, 152, 624] },
          { id: 'avians', label: 'Avians (Bird)', bbox: [153, 498, 301, 624] },
          { id: 'mammals', label: 'Mammals (Cat)', bbox: [302, 498, 468, 624] },
        ],
      },
      {
        id: 'append-spec',
        code: '2.7',
        label: 'Tetrapod Specializations',
        detail: '3 Adaptations · Amphibians (Saltatorial), Avians (Flight) & Ungulates (Cursorial)',
        bbox: [18, 636, 530, 801],
        cards: [
          { id: 'amphibians', label: 'Amphibians (Saltatorial)', bbox: [18, 636, 194, 801] },
          { id: 'avians', label: 'Avians (Flight)', bbox: [204, 636, 366, 801] },
          { id: 'ungulates', label: 'Ungulates (Horse)', bbox: [376, 636, 530, 801] },
        ],
      },
    ],
  },
  {
    id: 'hypobranchial',
    n: 3,
    name: 'Hypobranchial',
    owner: 'Reymark',
    fullName: 'Reymark P. Villarosa',
    crop: 'hypobranchial.jpg',
    cropSrc: './assets/hypobranchial.jpg?v=12',
    accent: '#7c3aed',
    badgeText: '#fff1ee',
    bbox: [1040, 0, 2006, 802],
    polygon: '1040,0 2006,0 2006,330 1805,330 1805,802 1040,802',
    anchor: [1450, 365],
    summary:
      'Tongue musculature; somitic throat development, cervical spinal innervation, position & function, and comparative vertebrate pattern.',
    subZones: [],
  },
  {
    id: 'branchiomeric',
    n: 4,
    name: 'Branchiomeric',
    owner: 'Kurt',
    fullName: 'Kurt Hendrick P. Saromines',
    crop: 'branchiomeric.jpg',
    cropSrc: './assets/branchiomeric.jpg?v=12',
    accent: '#d97706',
    badgeText: '#160303',
    bbox: [1172, 0, 2403, 1540],
    polygon:
      '2006,0 2403,0 2403,1540 1172,1540 1172,802 1805,802 1805,330 2006,330',
    anchor: [1920, 1080],
    summary:
      'Derived from the pharyngeal arches: mandibular, hyoid and branchial arches (cucullaris & facial muscles), plus extrinsic eye muscles (CN III, IV, VI).',
    subZones: [],
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
