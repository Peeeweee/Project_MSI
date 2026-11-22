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
  /** Hierarchical sub-part number (e.g. "1.1", "2.4", "4.8") */
  readonly code: string;
  readonly label: string;
  readonly detail: string;
  /** Target [x1, y1, x2, y2] in 2403x1540 poster space */
  readonly bbox: readonly [number, number, number, number];
  /** Optional individual animal specimen cards inside this sub-part for 1-click 750% deep zoom */
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
  /** Complete Level-2 interactive sub-parts covering 100% of every diagram in the section */
  subZones: readonly SectionSubZone[];
}

export const WORLD_WIDTH = 2403;
export const WORLD_HEIGHT = 1540;

/** Responsive display artwork (2400w / 1200w) for crisp fast initial paint */
export const FULL_MAP_DISPLAY_2400 = './assets/map-full-2400w.jpg?v=4';
export const FULL_MAP_DISPLAY_1200 = './assets/map-full-1200w.jpg?v=4';
/** Full 5560x3563 master artwork loaded lazily on zoom */
export const FULL_MAP_SRC = './assets/map-full.jpg?v=4';

export const SECTIONS: readonly Section[] = [
  {
    id: 'axial',
    n: 1,
    name: 'Axial',
    owner: 'Hanami',
    fullName: 'Hanna Mae M. Ceniza',
    crop: 'axial.jpg',
    cropSrc: './assets/axial.jpg?v=4',
    accent: '#2563eb',
    badgeText: '#fff1ee',
    bbox: [0, 802, 1172, 1540],
    polygon: '0,802 1172,802 1172,1540 0,1540',
    anchor: [586, 1170],
    summary:
      'Segmented myomeres, epaxial (dorsal) and hypaxial (ventral body-wall layers including birds), and the axial pectoral sling.',
    subZones: [
      {
        id: 'axial-core',
        code: '1.1',
        label: 'Axial Core & Somites',
        detail: 'Horizontal Skeletogenous Septum (HSS) & Trunk Paraxial Somites',
        bbox: [80, 804, 675, 922],
      },
      {
        id: 'axial-myo',
        code: '1.2',
        label: 'Segmented Myomeres',
        detail: 'Lampreys (M1–M10), Dogfish (W-shaped) & Teleosts (Cone Myomeres)',
        bbox: [6, 926, 475, 1145],
      },
      {
        id: 'axial-epax-fish',
        code: '1.3',
        label: 'Epaxial: Fishes & Salamanders',
        detail: 'Dorsal Epaxial Myomeres & Necturus Dorsalis Trunci',
        bbox: [480, 926, 745, 1285],
      },
      {
        id: 'axial-epax-tet',
        code: '1.4',
        label: 'Epaxial: Reptiles, Frogs & Birds',
        detail: 'Transversospinalis, Longissimus, Iliocostalis & Fused Avian/Anuran Spine',
        bbox: [750, 926, 1168, 1285],
      },
      {
        id: 'axial-hypax',
        code: '1.5',
        label: 'Hypaxial & Body-Wall Layers',
        detail: 'Fishes, Salamanders, Reptiles/Mammals & Avian Intercostals/Obliques',
        bbox: [6, 1150, 545, 1536],
      },
      {
        id: 'axial-sling',
        code: '1.6',
        label: 'Axial Pectoral Sling',
        detail: 'Bridge to Appendicular: Levator Scapulae, Serratus Ventralis & Rhomboideus',
        bbox: [550, 1290, 1085, 1536],
      },
    ],
  },
  {
    id: 'appendicular',
    n: 2,
    name: 'Appendicular',
    owner: 'Jenny',
    fullName: 'Jenny Lou D. Abangan',
    crop: 'appendicular.jpg',
    cropSrc: './assets/appendicular.jpg?v=4',
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
        detail: 'Abductor & Adductor Superficialis/Profundus, Arrectors & Propterygium',
        bbox: [4, 4, 435, 195],
        cards: [
          { id: 'fins-teleosts', label: 'Teleosts', bbox: [4, 18, 200, 175] },
          { id: 'fins-sharks', label: 'Sharks', bbox: [198, 18, 435, 192] },
        ],
      },
      {
        id: 'append-dev',
        code: '2.2',
        label: 'Embryonic Fin/Limb Development',
        detail: 'Amniotes & Teleosts (Derived Migratory) vs. Chondrichthyans (Primitive)',
        bbox: [440, 4, 965, 202],
        cards: [
          { id: 'dev-amniotes', label: 'Amniotes', bbox: [440, 18, 612, 198] },
          { id: 'dev-teleosts', label: 'Teleosts', bbox: [610, 18, 785, 198] },
          { id: 'dev-sharks', label: 'Chondrichthyans', bbox: [783, 18, 965, 198] },
        ],
      },
      {
        id: 'append-core',
        code: '2.3',
        label: 'Appendicular Core & Somites',
        detail: 'Pectoral/Pelvic Hubs, Trunk Paraxial Somites & Postcranial Musculature',
        bbox: [648, 210, 1030, 795],
      },
      {
        id: 'append-pect',
        code: '2.4',
        label: 'Forelimb (4-Source Tetrapods)',
        detail: 'Amphibians, Reptiles, Avians & Mammals Pectoral Girdle & Forelimb',
        bbox: [4, 210, 350, 492],
        cards: [
          { id: 'fore-amphibians', label: 'Amphibians', bbox: [10, 270, 160, 368] },
          { id: 'fore-reptiles', label: 'Reptiles', bbox: [162, 265, 320, 372] },
          { id: 'fore-avians', label: 'Avians', bbox: [4, 378, 165, 488] },
          { id: 'fore-mammals', label: 'Mammals', bbox: [170, 385, 320, 485] },
        ],
      },
      {
        id: 'append-pelv-sources',
        code: '2.5',
        label: 'Pelvic (3-Source & Shark Fin)',
        detail: 'Axial, Dorsal & Ventral Pelvic Sources + Chondrichthyan Pelvic Fin',
        bbox: [355, 210, 643, 565],
      },
      {
        id: 'append-hind',
        code: '2.6',
        label: 'Hindlimb Clades',
        detail: 'Amphibians, Avians & Mammals Pelvic Hindlimb Musculature',
        bbox: [4, 496, 465, 622],
        cards: [
          { id: 'hind-amphibians', label: 'Amphibians', bbox: [4, 512, 152, 620] },
          { id: 'hind-avians', label: 'Avians', bbox: [154, 512, 300, 620] },
          { id: 'hind-mammals', label: 'Mammals', bbox: [302, 505, 465, 620] },
        ],
      },
      {
        id: 'append-spec',
        code: '2.7',
        label: 'Tetrapod Specializations',
        detail: 'Amphibians (Saltatorial), Avians (Flight) & Ungulates (Cursorial)',
        bbox: [4, 626, 643, 800],
        cards: [
          { id: 'spec-amphibians', label: 'Amphibians', bbox: [18, 655, 196, 798] },
          { id: 'spec-avians', label: 'Avians', bbox: [212, 655, 368, 798] },
          { id: 'spec-ungulates', label: 'Ungulates', bbox: [388, 646, 522, 796] },
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
    cropSrc: './assets/hypobranchial.jpg?v=4',
    accent: '#7c3aed',
    badgeText: '#fff1ee',
    bbox: [1040, 0, 2006, 802],
    polygon: '1040,0 2006,0 2006,330 1805,330 1805,802 1040,802',
    anchor: [1450, 365],
    summary:
      'Tongue musculature; somitic throat development, cervical spinal innervation, position & function, and comparative vertebrate pattern.',
    subZones: [
      {
        id: 'hypo-comp-1',
        code: '3.1',
        label: 'Pattern: Fish, Frog & Lizard',
        detail: 'Teleost Coracomandibularis, Frog Tongue & Lizard Hyoid Apparatus',
        bbox: [1044, 4, 1515, 212],
      },
      {
        id: 'hypo-comp-2',
        code: '3.2',
        label: 'Pattern: Bird & Mammal Tongue',
        detail: 'Pigeon Entoglossal Straps & Rat Stylohyoideus, Digastricus & Genioglossus',
        bbox: [1520, 4, 1998, 212],
      },
      {
        id: 'hypo-inn',
        code: '3.3',
        label: 'Innervation, Dev & Function',
        detail: 'Cervical Spinal Nerves, Ventral Throat Myotomes & Gill-Arch Position',
        bbox: [1100, 216, 1998, 435],
      },
      {
        id: 'hypo-cranial',
        code: '3.4',
        label: 'Somites & Cranial Head',
        detail: 'Trunk Paraxial Somites & Cranial Musculature Anatomical Head',
        bbox: [1485, 440, 1798, 798],
      },
      {
        id: 'hypo-title',
        code: '3.5',
        label: 'Central Title & Group 2',
        detail: 'Muscular System Fusiform Emblem & Group 2 Presenters',
        bbox: [1044, 440, 1480, 798],
      },
    ],
  },
  {
    id: 'branchiomeric',
    n: 4,
    name: 'Branchiomeric',
    owner: 'Kurt',
    fullName: 'Kurt Hendrick P. Saromines',
    crop: 'branchiomeric.jpg',
    cropSrc: './assets/branchiomeric.jpg?v=4',
    accent: '#d97706',
    badgeText: '#160303',
    bbox: [1172, 0, 2403, 1540],
    polygon:
      '2006,0 2403,0 2403,1540 1172,1540 1172,802 1805,802 1805,330 2006,330',
    anchor: [1920, 1080],
    summary:
      'Derived from the pharyngeal arches: mandibular, hyoid and branchial arches (cucullaris & facial muscles), plus extrinsic eye muscles (CN III, IV, VI).',
    subZones: [
      {
        id: 'branch-eye',
        code: '4.1',
        label: 'Extrinsic Eye Muscles',
        detail: 'Preotic Cranial Paraxial Mesoderm: 6 Ocular Rectus & Oblique Muscles',
        bbox: [1985, 8, 2398, 392],
      },
      {
        id: 'branch-cn',
        code: '4.2',
        label: 'Ocular Nerves (CN III, IV, VI)',
        detail: 'Oculomotor (CN III), Trochlear (CN IV) & Abducens (CN VI) Innervation',
        bbox: [1812, 396, 2398, 592],
      },
      {
        id: 'branch-adductor',
        code: '4.3',
        label: 'Mandibular: Adductor Mandibulae',
        detail: 'Sharks, Fishes, Tetrapods & Mammalian Temporalis, Masseter & Pterygoid',
        bbox: [1812, 596, 2398, 905],
      },
      {
        id: 'branch-intermand',
        code: '4.4',
        label: 'Mandibular: Intermandibularis & Jaw',
        detail: 'Intermandibularis (Mylohyoid/Digastric) & Levator Palatoquadrati',
        bbox: [1780, 910, 2398, 1285],
      },
      {
        id: 'branch-somitomeres',
        code: '4.5',
        label: 'Somitomeres & Gill Constrictors',
        detail: 'Cranial Paraxial Mesoderm & Tetrapod/Shark/Fish Branchial Constrictors',
        bbox: [1245, 880, 1775, 1285],
      },
      {
        id: 'branch-cucullaris',
        code: '4.6',
        label: 'Cucullaris (Fishes vs. Amniotes)',
        detail: 'Fish Cucullaris vs. Amniote Mastoid & Trapezius Muscle Complex',
        bbox: [1175, 1085, 1345, 1536],
      },
      {
        id: 'branch-facial',
        code: '4.7',
        label: 'Interhyoideus & Facial Muscles',
        detail: 'Branchial Arches, Interhyoideus & Mammalian Facial Expression Muscles',
        bbox: [1350, 1290, 1840, 1536],
      },
      {
        id: 'branch-hyoid',
        code: '4.8',
        label: 'Hyoid Arch Constrictors',
        detail: 'Levator Hyomandibulae, Levator Operculi, Depressor Mandibulae & Stapedius',
        bbox: [1845, 1290, 2398, 1536],
      },
    ],
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
