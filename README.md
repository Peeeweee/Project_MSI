# Project MSI — CVA Muscular System Interactive Dashboard

- **Live Interactive App**: **[Project MSI](https://peeeweee.github.io/Project_MSI/)**
- **Original Poster HD Viewer (5560×3563)**: **[Original Poster Viewer](https://peeeweee.github.io/Project_MSI/poster-original.html)**
- **Direct Original PNG**: **[CVA-Muscular-System-Original.png](https://peeeweee.github.io/Project_MSI/assets/CVA-Muscular-System-Original.png)**
- **Direct Original PDF**: **[CVA-Muscular-System-Original.pdf](https://peeeweee.github.io/Project_MSI/assets/CVA-Muscular-System-Original.pdf)**

An interactive comparative vertebrate anatomy concept-map & realistic 3D muscular explorer built with **Vite + React + TypeScript + Tailwind CSS + Framer Motion + Three.js (`@react-three/fiber` / `@react-three/drei`)**.

## CVA LE Parts

| # | Section | Presenter | HUD Accent | Deep Link |
| :-: | :--- | :--- | :--- | :--- |
| 1 | **Axial** | Hanami | `#2563eb` | `/#axial` |
| 2 | **Appendicular** | Jenny | `#0d9488` | `/#appendicular` |
| 3 | **Hypobranchial** | Reymark | `#7c3aed` | `/#hypobranchial` |
| 4 | **Branchiomeric** | Kurt | `#d97706` | `/#branchiomeric` |

## Assets

Place your clean artwork and hi-res section crops inside `public/assets/`:

```text
public/assets/
├── map-full.jpg         # Clean full artwork (5560x3563, no divider lines)
├── axial.jpg            # Hi-res zoomed crop — Hanami
├── appendicular.jpg     # Hi-res zoomed crop — Jenny
├── hypobranchial.jpg    # Hi-res zoomed crop — Reymark
└── branchiomeric.jpg    # Hi-res zoomed crop — Kurt
```

## Development & Static Deployment

```bash
npm install
npm run optimize-assets # Regenerates 2400w/1200w responsive variants + LQIP from map-full.jpg
npm run dev             # Start local dev server
npm run typecheck       # Strict TypeScript verification
npm run build           # Static production bundle -> dist/
```

Pre-configured for zero-config static deployment to **Vercel** (`vercel.json`) and **Netlify** (`netlify.toml`).

## Keyboard & Presentation Controls

- **`1`–`4`**: Lock on and fly into Axial, Appendicular, Hypobranchial, or Branchiomeric
- **`↑` / `↓` / `←` / `→` (or `W` / `A` / `S` / `D`)**: Smooth directional panning inside any zoomed section (plus on-screen bottom-right D-pad & quick sub-zone jump pills)
- **`Click`**: Zoom directly into the clicked diagram inside an active section (or reset when deep-zoomed)
- **`[` / `]`**: 3D carousel pan-through to Previous / Next section
- **`Esc` / `0`**: Reverse zoom out to full overview
- **`+` / `−` / Scroll**: Smooth cursor-anchored zoom
- **`Drag` / Pinch**: Free pan & touch zoom when zoomed in
- **`V`**: Toggle smoothly between **Poster Mode** and **Realistic 3D Model Mode** (8 interactive 3D vertebrates)
- **`C`**: Open **Evolutionary Homology Comparison** (Fish → Amphibian → Reptile/Bird → Mammal) + interactive **Quiz Mode**
- **`Q`**: Open **Mobile Classroom Companion QR Code** from the top bar
- **`F`**: Toggle active-section color emphasis (decolorize non-active regions)
- **`H`**: Toggle clean presentation mode (hide HUD)
- **`?`**: Open navigation shortcuts overlay

## 3D Model & Vector Asset Attribution

All 3D models and scientific vector illustrations are sourced from open-source GitHub repositories:

- **Human (`muscles.glb`)**: 177 named skeletal muscles from [organui/muscles-3d](https://github.com/organui/muscles-3d) (MIT code), adapted from **BodyParts3D** © The Database Center for Life Science (DBCLS), licensed under **CC BY-SA 2.1 Japan** (see `public/models/ATTRIBUTION.md`).
- **Shark, Teleost Fish, Frog, Crocodile, Dog & Horse (`shark.glb`, `teleost.glb`, `frog.glb`, `crocodile.glb`, `dog.glb`, `horse.glb`)**: Rigged & animated vertebrate models indexed via [lucas-martinic/polyfork-catalog](https://github.com/lucas-martinic/polyfork-catalog) (**Polyfork 3D**, CC BY 4.0).
- **Bird (`parrot.glb`)**: Animated avian flight model from [mrdoob/three.js](https://github.com/mrdoob/three.js) examples (**MIT**).
- **Anatomical Muscle Emblem & Vertebrate Clade Plates (`public/favicon.svg`, `public/assets/clades/*.svg`)**: Sourced from [duerrsimon/bioicons](https://github.com/duerrsimon/bioicons) (**Servier Medical Art** CC BY 3.0, **DBCLS** CC BY 4.0, and **EwaOz** CC0).
- **ECC-High QR Matrices (`src/data/qrMatrices.ts`, `public/assets/qr-project-msi.svg`)**: Generated with [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator) (**MIT**).

