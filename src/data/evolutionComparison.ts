import type { SectionId } from './sections';
import type { VertebrateId } from './vertebrates';

export interface CladeStage {
  readonly id: string;
  readonly clade: string;
  readonly specimenTag: string;
  /** Downloaded Bioicons (DBCLS / EwaOz) SVG silhouette in public/assets/clades/ */
  readonly iconSrc: string;
  readonly muscles: string;
  readonly adaptation: string;
  readonly vertebrateId: VertebrateId;
}

export interface HomologyChain {
  readonly id: string;
  readonly sectionId: SectionId;
  readonly badge: string;
  readonly title: string;
  readonly embryonicOrigin: string;
  readonly innervation: string;
  readonly summary: string;
  /** Target poster sub-zone bbox [x1, y1, x2, y2] in 2403x1540 poster space */
  readonly posterBbox: readonly [number, number, number, number];
  readonly stages: readonly CladeStage[];
}

export const HOMOLOGY_CHAINS_BY_SECTION: Readonly<
  Record<SectionId, readonly HomologyChain[]>
> = {
  axial: [
    {
      id: 'axial-epaxial-chain',
      sectionId: 'axial',
      badge: 'Somites · Dorsal Rami',
      title: 'Segmented Myomeres → Deep Epaxial Columns',
      embryonicOrigin: 'Somites (Trunk Paraxial Mesoderm · Myotomes)',
      innervation: 'Dorsal Rami of Spinal Nerves',
      summary:
        'Traces how simple W-shaped fish myomeres evolve into three specialized dorsal epaxial columns supporting the tetrapod spine on land.',
      posterBbox: [15, 815, 1172, 1345],
      stages: [
        {
          id: 'ax-ep-shark',
          clade: 'Chondrichthyes',
          specimenTag: 'Dogfish Shark',
          iconSrc: './assets/clades/shark.svg',
          muscles: 'W-Shaped Myomeres · Myosepta · Horizontal Septum (HSS)',
          adaptation:
            'Horizontal septum divides trunk blocks into dorsal epaxial and ventral hypaxial myomeres for lateral undulation.',
          vertebrateId: 'shark',
        },
        {
          id: 'ax-ep-teleost',
          clade: 'Osteichthyes',
          specimenTag: 'Teleost Fish',
          iconSrc: './assets/clades/teleost.svg',
          muscles: 'Interlocking Cone Myomeres · Epaxial Myomeres',
          adaptation:
            'Folded cone-in-cone myomeres transmit powerful axial bending forces toward the caudal tail fin.',
          vertebrateId: 'teleost',
        },
        {
          id: 'ax-ep-amph',
          clade: 'Amphibia',
          specimenTag: 'Salamander & Frog',
          iconSrc: './assets/clades/amphibian.svg',
          muscles: 'Dorsalis Trunci (Urodeles) → Reduced Epaxials (Anurans)',
          adaptation:
            'Salamanders retain segmental dorsalis trunci for walking waves; frogs fuse vertebrae and shift power to hindlimbs.',
          vertebrateId: 'frog',
        },
        {
          id: 'ax-ep-amniote',
          clade: 'Reptilia & Mammalia',
          specimenTag: 'Reptiles & Mammals',
          iconSrc: './assets/clades/reptile.svg',
          muscles: 'Transversospinalis · Longissimus Dorsi · Iliocostalis',
          adaptation:
            'Tripartite epaxial columns stabilize, extend, and laterally flex the regionalized amniote vertebral column.',
          vertebrateId: 'crocodile',
        },
      ],
    },
    {
      id: 'axial-hypaxial-sling-chain',
      sectionId: 'axial',
      badge: 'Somites · Ventral Rami',
      title: 'Hypaxial Body-Wall Layers & Axial Pectoral Sling',
      embryonicOrigin: 'Ventral Myotome Buds (Hypomere)',
      innervation: 'Ventral Rami of Spinal Nerves',
      summary:
        'Ventral trunk musculature splits into layered abdominal/intercostal sheets for breathing and forms a muscular sling suspending the forelimbs.',
      posterBbox: [8, 1210, 1075, 1538],
      stages: [
        {
          id: 'ax-hyp-fish',
          clade: 'Fishes',
          specimenTag: 'Teleost & Dogfish',
          iconSrc: './assets/clades/teleost.svg',
          muscles: 'Ventral Hypaxial Myomeres',
          adaptation:
            'Continuous segmented body-wall muscle below the horizontal septum enclosing the coelom.',
          vertebrateId: 'teleost',
        },
        {
          id: 'ax-hyp-tet',
          clade: 'Amphibians & Reptiles',
          specimenTag: 'Salamander & Reptile',
          iconSrc: './assets/clades/reptile.svg',
          muscles:
            'External/Internal Oblique & Intercostals · Transversus & Rectus Abdominis · Subvertebrals',
          adaptation:
            'Splits into 3 oblique/transverse body-wall sheets plus rectus abdominis for costal ventilation and trunk support.',
          vertebrateId: 'crocodile',
        },
        {
          id: 'ax-hyp-bird',
          clade: 'Aves (Birds)',
          specimenTag: 'Avian Thorax',
          iconSrc: './assets/clades/avian.svg',
          muscles:
            'External/Internal Intercostals · Transversus Thoracis & Abdominis · Sternalis',
          adaptation:
            'Drives bellows-like movement of the keeled sternum and ribcage to ventilate avian air sacs.',
          vertebrateId: 'parrot',
        },
        {
          id: 'ax-hyp-sling',
          clade: 'Tetrapod Axial Sling',
          specimenTag: 'Reptiles & Mammals',
          iconSrc: './assets/clades/mammal.svg',
          muscles: 'Levator Scapulae · Serratus Ventralis · Rhomboideus',
          adaptation:
            'Forms the Axial Pectoral Sling (bridge to appendicular) suspending the ribcage like a hammock between the scapulae.',
          vertebrateId: 'horse',
        },
      ],
    },
  ],
  appendicular: [
    {
      id: 'appendicular-limb-chain',
      sectionId: 'appendicular',
      badge: 'Pectoral 4-Source · Pelvic 3-Source',
      title: 'Paired Fin Buds → Tetrapod Locomotor Specializations',
      embryonicOrigin:
        'Pectoral (Branchiomeric + Axial + Dorsal/Ventral Limb) · Pelvic (Axial + Dorsal/Ventral Limb)',
      innervation: 'Brachial & Lumbosacral Plexuses (Spinal Nerves)',
      summary:
        'Opposing dorsal abductor and ventral adductor fin muscles reorganize into multi-source tetrapod limbs specialized for jumping, flight, and running.',
      posterBbox: [0, 0, 1038, 802],
      stages: [
        {
          id: 'app-fish',
          clade: 'Chondrichthyans & Teleosts',
          specimenTag: 'Sharks & Bony Fishes',
          iconSrc: './assets/clades/shark.svg',
          muscles: 'Dorsal Abductors (Extensors) · Ventral Adductors (Flexors)',
          adaptation:
            'Primitive shark myotome extensions vs. derived teleost migratory mesenchyme form opposing fin elevator and depressor sheets.',
          vertebrateId: 'shark',
        },
        {
          id: 'app-amph',
          clade: 'Amphibia (Saltatorial)',
          specimenTag: 'Anuran Frog',
          iconSrc: './assets/clades/amphibian.svg',
          muscles:
            'Deltoid, Triceps & Pectoralis · Puboischiofemoralis, Iliofemoralis & Hamstrings',
          adaptation:
            'Adapted for saltatorial (jumping) locomotion: explosive bilateral hindlimb extension paired with shock-absorbing forelimbs.',
          vertebrateId: 'frog',
        },
        {
          id: 'app-bird',
          clade: 'Aves (Flight)',
          specimenTag: 'Avian Wing',
          iconSrc: './assets/clades/avian.svg',
          muscles: 'Massive Pectoralis (Downstroke) · Supracoracoideus (Upstroke)',
          adaptation:
            'Adapted for flight: ventral thoracic muscles anchor to the sternal keel to power high-frequency wingbeats.',
          vertebrateId: 'parrot',
        },
        {
          id: 'app-mammal',
          clade: 'Mammalia (Cursorial)',
          specimenTag: 'Canine & Ungulate Horse',
          iconSrc: './assets/clades/mammal.svg',
          muscles:
            'Latissimus Dorsi, Deltoid, Triceps, Biceps · Quadriceps, Sartorius, Gluteals & Hamstrings',
          adaptation:
            'Adapted for cursorial (running) locomotion: limbs rotate beneath the body with high proximal muscle mass and elastic distal tendons.',
          vertebrateId: 'horse',
        },
      ],
    },
  ],
  hypobranchial: [
    {
      id: 'hypobranchial-tongue-chain',
      sectionId: 'hypobranchial',
      badge: 'Anterior Somites · Cervical Spinal Nerves',
      title: 'Ventral Throat Myotomes → Vertebrate Tongue Complex',
      embryonicOrigin: 'Occipital & Anterior Cervical Somites (Ventral Throat Migration)',
      innervation: 'Cervical Spinal Nerves (Hypoglossal / Cervical Plexus)',
      summary:
        'Somitic myotomes migrate ventrally beneath the gill arches to power buccal expansion in fishes and form the mobile muscular tongue of tetrapods.',
      posterBbox: [1040, 0, 2005, 560],
      stages: [
        {
          id: 'hypo-fish',
          clade: 'Fish (Teleost)',
          specimenTag: 'Teleost Buccal Floor',
          iconSrc: './assets/clades/teleost.svg',
          muscles: 'Coracomandibularis · Sternohyoideus · Geniohyoideus',
          adaptation:
            'Pulls the hyoid arch and lower jaw posteroventrally to expand the oral cavity during suction feeding and gill ventilation.',
          vertebrateId: 'teleost',
        },
        {
          id: 'hypo-frog',
          clade: 'Amphibian (Frog)',
          specimenTag: 'Anuran Protractile Tongue',
          iconSrc: './assets/clades/amphibian.svg',
          muscles:
            'Genioglossus & Hyoglossus (Tongue) · Petrohyoideus · Subhyoideus · Omohyoideus',
          adaptation:
            'Hypobranchial fibers invade the mouth floor to create the first true muscular vertebrate tongue for ballistic prey capture.',
          vertebrateId: 'frog',
        },
        {
          id: 'hypo-bird',
          clade: 'Reptile & Bird',
          specimenTag: 'Lizard & Pigeon Hyoid',
          iconSrc: './assets/clades/avian.svg',
          muscles:
            'Ceratohyoideus · Branchiomandibularis · Entoglossal & Sublingual Straps',
          adaptation:
            'Wraps the elongated hyoid horns (ceratobranchials) to project and retract the amniote tongue.',
          vertebrateId: 'parrot',
        },
        {
          id: 'hypo-mammal',
          clade: 'Mammal (Rat / Canine / Human)',
          specimenTag: 'Mammalian Tongue & Infrahyoids',
          iconSrc: './assets/clades/mammal.svg',
          muscles:
            'Genioglossus, Hyoglossus & Styloglossus · Geniohyoideus, Sternohyoideus, Thyrohyoid & Omohyoideus',
          adaptation:
            'Elaborates into intrinsic/extrinsic tongue muscles for mastication and speech plus infrahyoid straps stabilizing the larynx.',
          vertebrateId: 'dog',
        },
      ],
    },
  ],
  branchiomeric: [
    {
      id: 'branchiomeric-mandibular-chain',
      sectionId: 'branchiomeric',
      badge: '1st Pharyngeal Arch · CN V (Trigeminal)',
      title: 'Mandibular Arch: Adductor Mandibulae → Mammalian Jaw Complex',
      embryonicOrigin: 'Somitomeres (Cranial Paraxial Mesoderm) · 1st Pharyngeal Arch',
      innervation: 'Cranial Nerve V (Trigeminal Nerve)',
      summary:
        'First-arch gill musculature transforms from a single shark jaw adductor into the specialized mammalian masseter, temporalis, pterygoids, and mylohyoid.',
      posterBbox: [1640, 560, 2403, 1150],
      stages: [
        {
          id: 'br-mand-shark',
          clade: 'Sharks',
          specimenTag: 'Chondrichthyan Jaw',
          iconSrc: './assets/clades/shark.svg',
          muscles:
            'Adductor Mandibulae · Preorbitalis · Levator Palatoquadrati · Intermandibularis',
          adaptation:
            'Adductor mandibulae closes the cartilaginous jaws while levator palatoquadrati suspends the upper jaw from the chondrocranium.',
          vertebrateId: 'shark',
        },
        {
          id: 'br-mand-fish',
          clade: 'Bony Fishes',
          specimenTag: 'Teleost Jaw',
          iconSrc: './assets/clades/teleost.svg',
          muscles: 'Adductor Mandibulae (Divided into Several Distinct Heads)',
          adaptation:
            'Differentiates into multiple mechanical bundles controlling rapid jaw protrusion and bite force.',
          vertebrateId: 'teleost',
        },
        {
          id: 'br-mand-tet',
          clade: 'Tetrapods (Amphibians & Reptiles)',
          specimenTag: 'Crocodile & Frog',
          iconSrc: './assets/clades/reptile.svg',
          muscles:
            'Multiple Heads of Adductor Mandibulae · Intermandibularis (Palatoquadrate Fused ×)',
          adaptation:
            'Palatoquadrate fuses directly to the braincase (eliminating levator palatoquadrati) while multiple adductor heads power terrestrial bite.',
          vertebrateId: 'crocodile',
        },
        {
          id: 'br-mand-mam',
          clade: 'Mammals',
          specimenTag: 'Canine & Human',
          iconSrc: './assets/clades/mammal.svg',
          muscles:
            'Masseter, Temporalis & Pterygoids · Mylohyoid & Anterior Belly of Digastric',
          adaptation:
            'Adductor mandibulae splits into temporalis, masseter, and pterygoids for multi-directional chewing; intermandibularis forms mylohyoid.',
          vertebrateId: 'dog',
        },
      ],
    },
    {
      id: 'branchiomeric-hyoid-branchial-chain',
      sectionId: 'branchiomeric',
      badge: '2nd–7th Arches & Preotic · CN III, IV, VI, VII, IX, X, XI',
      title: 'Gill Constrictors → Trapezius, Larynx & Facial Expression',
      embryonicOrigin: 'Pharyngeal Arches 2–7 & Preotic Cranial Paraxial Mesoderm',
      innervation: 'CN VII (Hyoid), CN IX–XI (Branchial) & CN III, IV, VI (Extrinsic Eye)',
      summary:
        'Posterior gill-arch constrictors repurpose on land into the cucullaris (trapezius/sternocleidomastoid), laryngeal vocal muscles, and mammalian facial muscles.',
      posterBbox: [1172, 1040, 2403, 1540],
      stages: [
        {
          id: 'br-hy-shark',
          clade: 'Sharks & Fishes',
          specimenTag: 'Branchial Gill Arches',
          iconSrc: './assets/clades/shark.svg',
          muscles:
            'Levator Hyomandibulae · Superficial/Dorsal Gill Constrictors · Interhyoideus · Cucullaris',
          adaptation:
            'Rhythmically compresses the pharyngeal gill chambers and operculum to pump water across the respiratory lamellae.',
          vertebrateId: 'shark',
        },
        {
          id: 'br-hy-tet',
          clade: 'Tetrapods (Amphibians & Reptiles)',
          specimenTag: 'Frog & Reptile Throat',
          iconSrc: './assets/clades/amphibian.svg',
          muscles:
            'Depressor Mandibulae (2nd Arch) · Interhyoideus · Laryngeal Muscles (from Gill Constrictors)',
          adaptation:
            'With gill loss on land, 2nd-arch muscles open the jaw (depressor mandibulae) and posterior arch constrictors remodel into laryngeal vocal muscles.',
          vertebrateId: 'frog',
        },
        {
          id: 'br-hy-eye',
          clade: 'All Vertebrates (Preotic Eye)',
          specimenTag: 'Conserved 6 Ocular Muscles',
          iconSrc: './assets/clades/avian.svg',
          muscles:
            'CN III (Sup/Inf/Med Rectus, Inf Oblique) · CN IV (Sup Oblique) · CN VI (Lat Rectus)',
          adaptation:
            'Derived from preotic cranial paraxial mesoderm—the 6 extrinsic eye muscles remain evolutionarily conserved across all jawed vertebrates.',
          vertebrateId: 'parrot',
        },
        {
          id: 'br-hy-mam',
          clade: 'Amniotes & Mammals',
          specimenTag: 'Human & Canine',
          iconSrc: './assets/clades/mammal.svg',
          muscles:
            'Trapezius & Sternocleidomastoid (from Cucullaris) · Facial Expression Muscles & Platysma (CN VII)',
          adaptation:
            'Cucullaris splits into trapezius and sternocleidomastoid rotating the head/shoulder, while 2nd-arch hyoid sheets migrate over the face.',
          vertebrateId: 'human',
        },
      ],
    },
  ],
};
