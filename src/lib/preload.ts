import {
  FULL_MAP_SRC,
  getNextSectionId,
  SECTION_BY_ID,
  type SectionId,
} from '../data/sections';

export interface LoadedCropMeta {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  /** True when the crop's aspect ratio matches its bbox closely enough for 1:1 in-place overlay */
  alignsWithBbox: boolean;
}

const cropCache = new Map<SectionId, LoadedCropMeta>();
const cropAttempted = new Set<SectionId>();
let hiResFullMapPromise: Promise<boolean> | null = null;
let hiResFullMapReady = false;

/**
 * Lazily loads and decodes a single section's hi-res crop on demand (with
 * deduplication so hovering/focusing never re-fetches or stalls initial load).
 */
export function preloadSectionCrop(
  id: SectionId,
  onLoaded?: (id: SectionId, meta: LoadedCropMeta) => void,
): void {
  const cached = cropCache.get(id);
  if (cached) {
    onLoaded?.(id, cached);
    return;
  }
  if (cropAttempted.has(id)) return;
  cropAttempted.add(id);

  const section = SECTION_BY_ID[id];
  const img = new Image();
  img.decoding = 'async';
  img.src = section.cropSrc;

  const finalize = () => {
    if (img.naturalWidth === 0 || img.naturalHeight === 0) return;
    const [x1, y1, x2, y2] = section.bbox;
    const bboxRatio = (x2 - x1) / (y2 - y1);
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const relDiff = Math.abs(imgRatio - bboxRatio) / bboxRatio;

    const meta: LoadedCropMeta = {
      src: section.cropSrc,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      alignsWithBbox: relDiff < 0.08,
    };

    cropCache.set(id, meta);
    onLoaded?.(id, meta);
  };

  if (typeof img.decode === 'function') {
    img.decode().then(finalize).catch(() => {
      // Optional crop file not yet supplied; map-full remains sharp.
    });
  } else {
    img.onload = finalize;
  }
}

/**
 * Predictive hover/entry preloader: lazily loads the target section's crop AND
 * preloads the next section's crop so clicking Next feels instantaneous.
 */
export function preloadSectionAndNext(
  id: SectionId,
  onLoaded?: (id: SectionId, meta: LoadedCropMeta) => void,
): void {
  preloadSectionCrop(id, onLoaded);
  preloadSectionCrop(getNextSectionId(id), onLoaded);
}

/**
 * Lazily loads the full 5560x3563 master map-full.jpg ONLY when deep zoom
 * (> 2.2x) is reached, keeping initial display fast with the 2400w variant.
 */
export function preloadHiResFullMap(onReady?: () => void): void {
  if (hiResFullMapReady) {
    onReady?.();
    return;
  }
  if (hiResFullMapPromise) {
    hiResFullMapPromise.then((ok) => {
      if (ok) onReady?.();
    });
    return;
  }

  hiResFullMapPromise = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = FULL_MAP_SRC;

    const done = () => {
      if (img.naturalWidth > 0) {
        hiResFullMapReady = true;
        onReady?.();
        resolve(true);
      } else {
        resolve(false);
      }
    };

    if (typeof img.decode === 'function') {
      img.decode().then(done).catch(() => resolve(false));
    } else {
      img.onload = done;
      img.onerror = () => resolve(false);
    }
  });
}
