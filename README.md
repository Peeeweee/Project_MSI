# CVA — Muscular System Interactive Dashboard

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
- **`←` / `→`**: 3D carousel pan-through to Previous / Next section
- **`Esc` / `0`**: Reverse zoom out to full overview
- **`+` / `−` / Scroll**: Smooth cursor-anchored zoom
- **`Drag` / Pinch**: Free pan & touch zoom when zoomed in
- **`V`**: Toggle smoothly between **Poster Mode** and **Realistic 3D Model Mode** (177 clickable muscles)
- **`F`**: Toggle spotlight isolation on the active section
- **`H`**: Toggle clean presentation mode (hide HUD)
- **`?`**: Open navigation shortcuts overlay

## 3D Model Attribution

All 3D models in `public/models/` are sourced from open-source GitHub repositories:

- **Human (`muscles.glb`)**: 177 named skeletal muscles from [organui/muscles-3d](https://github.com/organui/muscles-3d) (MIT code), adapted from **BodyParts3D** © The Database Center for Life Science (DBCLS), licensed under **CC BY-SA 2.1 Japan** (see `public/models/ATTRIBUTION.md`).
- **Shark, Teleost Fish, Frog, & Crocodile (`shark.glb`, `teleost.glb`, `frog.glb`, `crocodile.glb`)**: Rigged & animated vertebrate models indexed via [lucas-martinic/polyfork-catalog](https://github.com/lucas-martinic/polyfork-catalog) (**Polyfork 3D**, CC BY 4.0).
- **Bird & Ungulate (`parrot.glb`, `horse.glb`)**: Animated avian flight & cursorial ungulate gallop models from [mrdoob/three.js](https://github.com/mrdoob/three.js) examples (**MIT**).

