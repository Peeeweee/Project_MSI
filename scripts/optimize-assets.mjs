/**
 * Regenerates responsive display images (2400w, 1200w) and the inline LQIP
 * placeholder from public/assets/map-full.jpg.
 *
 * Usage: npm run optimize-assets (requires Python + Pillow or Sharp)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcPath = path.join(root, 'public', 'assets', 'map-full.jpg');

if (!fs.existsSync(srcPath)) {
  console.error('Missing public/assets/map-full.jpg');
  process.exit(1);
}

const pyScript = `
import base64, io, os
from PIL import Image

src = r"${srcPath.replace(/\\/g, '\\\\')}"
out_dir = os.path.dirname(src)
im = Image.open(src).convert("RGB")
w, h = im.size

for target_w in (2400, 1200):
    new_w = min(w, target_w)
    new_h = max(1, round(h * (new_w / w)))
    resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    out_path = os.path.join(out_dir, f"map-full-{target_w}w.jpg")
    resized.save(out_path, format="JPEG", quality=92, subsampling=0, optimize=True, progressive=True)
    print(f"Generated {os.path.basename(out_path)} ({new_w}x{new_h}, {os.path.getsize(out_path)//1024} KB)")

lqip = im.resize((64, max(1, round(64 * h / w))), Image.Resampling.LANCZOS)
buf = io.BytesIO()
lqip.save(buf, format="JPEG", quality=45, optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode("ascii")
lqip_path = os.path.join(r"${root.replace(/\\/g, '\\\\')}", "src", "lib", "mapPlaceholder.ts")
with open(lqip_path, "w", encoding="utf-8") as f:
    f.write(f"/** Low-res LQIP placeholder (~{len(buf.getvalue())} bytes) for instant blurred page-load skeleton */\\n")
    f.write(f'export const MAP_LQIP_DATA_URI = "data:image/jpeg;base64,{b64}";\\n')
print(f"Updated src/lib/mapPlaceholder.ts ({len(buf.getvalue())} bytes)")
`;

execFileSync('python', ['-c', pyScript], { stdio: 'inherit' });

