import { useCallback, useEffect, useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import {
  FULL_MAP_DISPLAY_2400,
  FULL_MAP_SRC,
  SECTION_BY_ID,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type SectionId,
} from '../../data/sections';
import { computeBaseMetrics, type ViewportSize } from '../../lib/cameraMath';

interface TrueResCanvasProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  stageViewport: ViewportSize;
  activeSectionId: SectionId | null;
  activeSubZoneId: string | null;
  emphasizeActive: boolean;
  active: boolean;
  onReadyChange?: (ready: boolean) => void;
}

const ORIGINAL_LOSSLESS_PNG = './assets/CVA-Muscular-System-Original.png';
const SUBPART_CACHE_VER = '?v=14';

// Shared in-memory cache of decoded Image elements so images never reload across re-renders
const imageCache = new Map<string, HTMLImageElement>();
const loadingSet = new Set<string>();
const listenersMap = new Map<string, Set<() => void>>();

function loadImageCached(
  src: string,
  onReady: () => void,
): HTMLImageElement | null {
  const existing = imageCache.get(src);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    return existing;
  }

  let listeners = listenersMap.get(src);
  if (!listeners) {
    listeners = new Set();
    listenersMap.set(src, listeners);
  }
  listeners.add(onReady);

  if (!loadingSet.has(src)) {
    loadingSet.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      imageCache.set(src, img);
      loadingSet.delete(src);
      const set = listenersMap.get(src);
      if (set) {
        set.forEach((fn) => fn());
        set.clear();
      }
    };
    img.onerror = () => {
      loadingSet.delete(src);
      listenersMap.get(src)?.clear();
    };
    img.src = src;
  }
  return null;
}

/**
 * OpenSeadragon-style Direct Physical-Pixel High-DPI Canvas Renderer.
 *
 * Why this exists:
 * Chromium's CSS compositor rasterizes any DOM element with `clip-path: polygon(...)`
 * or 3D `perspective`/`rotateX`/`rotateY` transforms into a 1x (1054x676) offscreen
 * texture buffer BEFORE applying parent `transform: scale(4.74)`, causing severe blur
 * when zooming into sections and sub-parts.
 *
 * This canvas sits in unscaled screen space at 1:1 physical device pixels
 * (`stageViewport.width * dpr` x `stageViewport.height * dpr`) and draws:
 * 1. Base master poster (`CVA-Muscular-System-Original.png` 5560x3563 / `map-full.jpg`)
 * 2. Active section native crop (`axial.jpg`, `appendicular.jpg`, `hypobranchial.jpg`, `branchiomeric.jpg`)
 * 3. Precision 2x super-sampled sub-part plates (`./assets/subparts/<id>.webp`, equivalent to 11,120x7,126 master resolution!)
 */
export function TrueResCanvas({
  x,
  y,
  scale,
  stageViewport,
  activeSectionId,
  activeSubZoneId,
  emphasizeActive,
  active,
  onReadyChange,
}: TrueResCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const readyReportedRef = useRef(false);

  const scheduleDrawRef = useRef<() => void>(() => {});

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const triggerRedraw = () => scheduleDrawRef.current();

    if (!active) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const s = scale.get();
    const cx = x.get();
    const cy = y.get();

    // Always supersample at >= 2.0x SSAA even on 1x desktop monitors so deep-zoom text is razor-sharp
    const dpr = Math.max(
      2.0,
      Math.min(
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 2,
        2.75,
      ),
    );
    const targetW = Math.max(1, Math.round(stageViewport.width * dpr));
    const targetH = Math.max(1, Math.round(stageViewport.height * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pick highest-resolution loaded master image (5560x3563 lossless PNG > 5560x3563 JPG > 2400w JPG)
    const losslessImg = loadImageCached(ORIGINAL_LOSSLESS_PNG, triggerRedraw);
    const fullJpgImg = loadImageCached(FULL_MAP_SRC, triggerRedraw);
    const display2400Img = loadImageCached(FULL_MAP_DISPLAY_2400, triggerRedraw);

    const masterImg = losslessImg ?? fullJpgImg ?? display2400Img;
    if (!masterImg) return;

    if (!readyReportedRef.current) {
      readyReportedRef.current = true;
      onReadyChange?.(true);
    }

    const { baseWidth, baseHeight } = computeBaseMetrics(stageViewport);
    const worldScreenW = baseWidth * s;
    const worldScreenH = baseHeight * s;
    const worldScreenX = stageViewport.width / 2 + cx - worldScreenW / 2;
    const worldScreenY = stageViewport.height / 2 + cy - worldScreenH / 2;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, stageViewport.width, stageViewport.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const activeSection = activeSectionId ? SECTION_BY_ID[activeSectionId] : null;

    const drawActiveSectionContents = () => {
      if (!activeSection) return;

      // 1. Draw the full-resolution master poster
      ctx.drawImage(
        masterImg,
        worldScreenX,
        worldScreenY,
        worldScreenW,
        worldScreenH,
      );

      // 2. Overlay the active section's dedicated 5560w-scale crop if loaded
      const secImg = loadImageCached(activeSection.cropSrc, triggerRedraw);
      if (secImg) {
        const [sx1, sy1, sx2, sy2] = activeSection.bbox;
        const secX = worldScreenX + (sx1 / WORLD_WIDTH) * worldScreenW;
        const secY = worldScreenY + (sy1 / WORLD_HEIGHT) * worldScreenH;
        const secW = ((sx2 - sx1) / WORLD_WIDTH) * worldScreenW;
        const secH = ((sy2 - sy1) / WORLD_HEIGHT) * worldScreenH;
        ctx.drawImage(secImg, secX, secY, secW, secH);
      }

      // 3. Overlay all loaded 2x super-sampled sub-part plates (11,120x7,126 equivalent resolution)
      // Draw non-active sub-parts first, then the active sub-part on top so its edges are 100% seamless
      const orderedSubZones = [...activeSection.subZones].sort((a, b) =>
        a.id === activeSubZoneId ? 1 : b.id === activeSubZoneId ? -1 : 0,
      );

      for (const subZone of orderedSubZones) {
        const subSrc = `./assets/subparts/${subZone.id}.webp${SUBPART_CACHE_VER}`;
        const subImg = loadImageCached(subSrc, triggerRedraw);
        if (subImg) {
          const [x1, y1, x2, y2] = subZone.bbox;
          const subX = worldScreenX + (x1 / WORLD_WIDTH) * worldScreenW;
          const subY = worldScreenY + (y1 / WORLD_HEIGHT) * worldScreenH;
          const subW = ((x2 - x1) / WORLD_WIDTH) * worldScreenW;
          const subH = ((y2 - y1) / WORLD_HEIGHT) * worldScreenH;
          ctx.drawImage(subImg, subX, subY, subW, subH);
        }
      }
    };

    if (activeSection && emphasizeActive) {
      // Draw dimmed/desaturated surrounding poster outside active section
      ctx.save();
      ctx.filter = 'grayscale(100%) brightness(0.46) contrast(0.92)';
      ctx.drawImage(
        masterImg,
        worldScreenX,
        worldScreenY,
        worldScreenW,
        worldScreenH,
      );
      ctx.restore();

      // Vector-clip to the active section's exact polygon at full Retina resolution
      ctx.save();
      const pairs = activeSection.polygon
        .trim()
        .split(/\s+/)
        .map((pt) => pt.split(',').map(Number));
      if (pairs.length >= 3) {
        ctx.beginPath();
        pairs.forEach(([px, py], idx) => {
          const sx = worldScreenX + (px / WORLD_WIDTH) * worldScreenW;
          const sy = worldScreenY + (py / WORLD_HEIGHT) * worldScreenH;
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.clip();
      }

      drawActiveSectionContents();
      ctx.restore();
    } else if (activeSection) {
      drawActiveSectionContents();
    } else {
      // Overview free-zoom mode
      ctx.drawImage(
        masterImg,
        worldScreenX,
        worldScreenY,
        worldScreenW,
        worldScreenH,
      );
    }

    ctx.restore();
  }, [
    active,
    activeSectionId,
    activeSubZoneId,
    emphasizeActive,
    onReadyChange,
    scale,
    stageViewport,
    x,
    y,
  ]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  scheduleDrawRef.current = scheduleDraw;

  // Redraw synchronously whenever props or viewport change
  useEffect(() => {
    draw();
  }, [draw]);

  // Subscribe directly to Framer Motion x, y, scale MotionValues so pan/zoom redraws at 60/120fps with zero React re-renders
  useEffect(() => {
    const unsubX = x.on('change', scheduleDraw);
    const unsubY = y.on('change', scheduleDraw);
    const unsubS = scale.on('change', scheduleDraw);
    return () => {
      unsubX();
      unsubY();
      unsubS();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scale, scheduleDraw, x, y]);

  // Preload all 2x sub-part plates for the active section immediately on section entry
  useEffect(() => {
    if (!activeSectionId) return;
    const section = SECTION_BY_ID[activeSectionId];
    loadImageCached(section.cropSrc, scheduleDraw);
    for (const subZone of section.subZones) {
      loadImageCached(`./assets/subparts/${subZone.id}.webp${SUBPART_CACHE_VER}`, scheduleDraw);
    }
    loadImageCached(ORIGINAL_LOSSLESS_PNG, scheduleDraw);
  }, [activeSectionId, scheduleDraw]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="true-res-canvas"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] block h-full w-full select-none"
      style={{
        opacity: active ? 1 : 0,
      }}
    />
  );
}
