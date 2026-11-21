import type { SectionId } from './sections';

export interface SpecimenCard {
  id: string;
  sectionId: SectionId;
  title: string;
  subtitle: string;
  imageSrc: string;
  /** Exact [x1, y1, x2, y2] in 2403x1540 updated poster space */
  bbox: readonly [number, number, number, number];
  caption: string;
}

export const SPECIMENS_BY_SECTION: Record<SectionId, readonly SpecimenCard[]> = {
  axial: [
    {
      id: 'axial-myomeres',
      sectionId: 'axial',
      title: 'Segmented Myomeres',
      subtitle: 'Lampreys · Dogfish · Teleosts',
      imageSrc: './assets/specimens/axial-myomeres.jpg?v=3',
      bbox: [252, 938, 808, 1120],
      caption:
        'Serially homologous trunk and tail myomeres separated by myosepta; W-shaped and interlocking cone myomeres drive lateral undulation.',
    },
    {
      id: 'axial-epaxial',
      sectionId: 'axial',
      title: 'Epaxial Musculature (Dorsal)',
      subtitle: 'Fishes · Salamanders · Reptiles · Frogs & Birds',
      imageSrc: './assets/specimens/axial-epaxial.jpg?v=3',
      bbox: [490, 1135, 1170, 1312],
      caption:
        'Dorsal rami extend the vertebral column—from epaxial myomeres in fishes to complex transversospinalis/longissimus/iliocostalis in amniotes, and reduced dorsal mass in frogs & birds.',
    },
    {
      id: 'axial-hypaxial',
      sectionId: 'axial',
      title: 'Hypaxial Body-Wall & Ventral Layers',
      subtitle: 'Fishes · Salamanders · Reptiles · Birds',
      imageSrc: './assets/specimens/axial-hypaxial.jpg?v=3',
      bbox: [10, 1345, 628, 1534],
      caption:
        'Ventral rami support viscera and breathing: external/internal obliques, intercostals, transversus thoracis & abdominis, rectus abdominis, and the avian sternalis muscle.',
    },
    {
      id: 'axial-sling',
      sectionId: 'axial',
      title: 'Axial Pectoral Sling',
      subtitle: 'Bridge to Appendicular Musculature',
      imageSrc: './assets/specimens/axial-sling.jpg?v=3',
      bbox: [635, 1295, 1045, 1536],
      caption:
        'Levator scapulae, thoraciscapularis, serratus ventralis, and rhomboideus suspend the pectoral girdle dynamically against the trunk.',
    },
  ],

  appendicular: [
    {
      id: 'append-fins',
      sectionId: 'appendicular',
      title: 'Teleosts & Sharks Fin Muscles',
      subtitle: 'Abductor & Adductor Fin Groups',
      imageSrc: './assets/specimens/append-fins.jpg?v=3',
      bbox: [6, 6, 395, 178],
      caption:
        'Paired fin musculature splits into dorsal abductor (levator/arrector) and ventral adductor (depressor) masses controlling roll, pitch, and steering.',
    },
    {
      id: 'append-dev',
      sectionId: 'appendicular',
      title: 'Embryonic Development Mechanisms',
      subtitle: 'Amniotes · Teleosts · Chondrichthyans',
      imageSrc: './assets/specimens/append-dev.jpg?v=3',
      bbox: [398, 6, 1020, 178],
      caption:
        'Primitive direct myotome extensions in chondrichthyans evolve into derived migrating mesenchymal precursor cells in teleosts and amniotes.',
    },
    {
      id: 'append-tetrapods',
      sectionId: 'appendicular',
      title: 'Pectoral (4-Source) & Pelvic (3-Source) Limbs',
      subtitle: 'Tetrapods & Chondrichthyans Girdle Derivations',
      imageSrc: './assets/specimens/append-tetrapods.jpg?v=3',
      bbox: [6, 184, 658, 608],
      caption:
        'Forelimbs combine 4 sources (branchiomeric, axial, dorsal, ventral), while hindlimbs derive from 3 sources (axial psoas minor, dorsal quadriceps/iliofemoralis, ventral caudofemoralis/hamstrings).',
    },
    {
      id: 'append-specializations',
      sectionId: 'appendicular',
      title: 'Specializations Among Tetrapods',
      subtitle: 'Amphibians (Saltatorial) · Avians (Flight) · Ungulates (Cursorial)',
      imageSrc: './assets/specimens/append-specializations.jpg?v=3',
      bbox: [6, 634, 545, 798],
      caption:
        'Appendicular musculature specializes dramatically across clades: enlarged hindlimbs for saltatorial leaping in frogs, massive keel flight muscles in birds, and proximal limb levers for cursorial running in ungulates.',
    },
  ],

  hypobranchial: [
    {
      id: 'hypo-pattern',
      sectionId: 'hypobranchial',
      title: 'Comparative Vertebrate Pattern',
      subtitle: 'Fish · Amphibian · Reptile · Bird · Mammal',
      imageSrc: './assets/specimens/hypo-pattern.jpg?v=3',
      bbox: [1045, 8, 1875, 185],
      caption:
        'Progressive elaboration from simple floor-of-mouth hyobranchial straps in fishes into agile, protrusible tongue musculature across tetrapods.',
    },
    {
      id: 'hypo-innervation',
      sectionId: 'hypobranchial',
      title: 'Innervation, Position & Function',
      subtitle: 'Cervical Spinal Nerves · Ventral Throat',
      imageSrc: './assets/specimens/hypo-innervation.jpg?v=3',
      bbox: [1240, 175, 1998, 305],
      caption:
        'Retains spinal nerve innervation from the cervical region while running ventrally between the gill-arch elements toward the pectoral girdle.',
    },
    {
      id: 'hypo-core',
      sectionId: 'hypobranchial',
      title: 'Somitic Origin & Migration',
      subtitle: 'Trunk Paraxial Mesoderm -> Throat',
      imageSrc: './assets/specimens/hypo-core.jpg?v=3',
      bbox: [1070, 280, 1785, 560],
      caption:
        'Postcranial somitic myotomes migrate ventrally and rostrally beneath the pharynx to form the hypobranchial and tongue complex.',
    },
  ],

  branchiomeric: [
    {
      id: 'branch-eye',
      sectionId: 'branchiomeric',
      title: 'Extrinsic Eye Muscles',
      subtitle: 'CN III (Oculomotor) · CN IV · CN VI',
      imageSrc: './assets/specimens/branch-eye.jpg?v=3',
      bbox: [1820, 10, 2398, 600],
      caption:
        'Derived from preotic cranial paraxial mesoderm—six evolutionarily conserved ocular muscles shared across jawed vertebrates.',
    },
    {
      id: 'branch-mandibular',
      sectionId: 'branchiomeric',
      title: 'Mandibular Arch Musculature',
      subtitle: 'Adductor Mandibulae & Intermandibularis',
      imageSrc: './assets/specimens/branch-mandibular.jpg?v=3',
      bbox: [1805, 705, 2398, 1102],
      caption:
        'First pharyngeal arch derivatives powering jaw closure (adductor mandibulae, masseter, temporalis) and floor-of-mouth support.',
    },
    {
      id: 'branch-hyoid',
      sectionId: 'branchiomeric',
      title: 'Hyoid & Branchial Arches',
      subtitle: 'Cucullaris · Interhyoideus · Facial Muscles',
      imageSrc: './assets/specimens/branch-hyoid.jpg?v=3',
      bbox: [1175, 1110, 2398, 1535],
      caption:
        'Posterior pharyngeal arches form gill constrictors in fishes, cucullaris/trapezius in amniotes, and mammalian muscles of facial expression.',
    },
  ],
};
