import { WORLD_HEIGHT, WORLD_WIDTH, type Section } from '../data/sections';

export interface ViewportSize {
  width: number;
  height: number;
}

export interface CameraState {
  /** Horizontal offset in viewport pixels from stage center */
  x: number;
  /** Vertical offset in viewport pixels from stage center */
  y: number;
  /** Zoom multiplier relative to the edge-to-edge overview fit (1 = overview) */
  scale: number;
}

export interface BaseStageMetrics {
  fitScale: number;
  baseWidth: number;
  baseHeight: number;
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 7.5;
export const SIDEBAR_WIDTH_COLLAPSED = 56;
export const SIDEBAR_WIDTH_DESKTOP = 248;
/** Breakpoint separating desktop left sidebar (>= 1024px) from tablet/mobile bottom sheet */
export const DESKTOP_BREAKPOINT = 1024;

export const OVERVIEW_CAMERA: CameraState = {
  x: 0,
  y: 0,
  scale: 1,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getSidebarInset(
  viewport: ViewportSize,
  hudVisible: boolean,
  sidebarCollapsed = true,
): number {
  if (!hudVisible) return 0;
  if (viewport.width < DESKTOP_BREAKPOINT) return 0;
  return sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_DESKTOP;
}

/**
 * Computes the edge-to-edge overview dimensions of the 2403x1540 artwork
 * inside the current stage viewport (exact object-fit: contain geometry).
 */
export function computeBaseMetrics(viewport: ViewportSize): BaseStageMetrics {
  const safeW = Math.max(1, viewport.width);
  const safeH = Math.max(1, viewport.height);
  const fitScale = Math.min(safeW / WORLD_WIDTH, safeH / WORLD_HEIGHT);

  return {
    fitScale,
    baseWidth: WORLD_WIDTH * fitScale,
    baseHeight: WORLD_HEIGHT * fitScale,
  };
}

/**
 * Clamps camera to the full artwork boundaries (used when no specific section
 * is active, e.g. free zoom on overview).
 */
export function clampCamera(
  cam: CameraState,
  viewport: ViewportSize,
  sidebarInset = 0,
): CameraState {
  const scale = clamp(cam.scale, MIN_SCALE, MAX_SCALE);
  if (scale <= 1.001) {
    return { x: 0, y: 0, scale: 1 };
  }

  const { baseWidth, baseHeight } = computeBaseMetrics(viewport);
  const scaledW = baseWidth * scale;
  const scaledH = baseHeight * scale;

  const padLeft = sidebarInset > 0 ? sidebarInset + 20 : 32;
  const padRight = 32;
  const padTop = 64;
  const padBottom = 32;

  const minX = Math.min(0, viewport.width / 2 - scaledW / 2 - padRight);
  const maxX = Math.max(0, scaledW / 2 - viewport.width / 2 + padLeft);

  const minY = Math.min(0, viewport.height / 2 - scaledH / 2 - padBottom);
  const maxY = Math.max(0, scaledH / 2 - viewport.height / 2 + padTop);

  return {
    x: clamp(cam.x, minX, maxX),
    y: clamp(cam.y, minY, maxY),
    scale,
  };
}

/**
 * Computes the camera transform that fits any arbitrary world-space bbox
 * ([x1, y1, x2, y2]) cleanly into the open TV/viewport stage area.
 */
export function computeBboxCamera(
  bbox: readonly [number, number, number, number],
  viewport: ViewportSize,
  hudVisible: boolean,
  sidebarCollapsed = true,
): CameraState {
  const { fitScale } = computeBaseMetrics(viewport);
  const [x1, y1, x2, y2] = bbox;

  const boxWidthWorld = x2 - x1;
  const boxHeightWorld = y2 - y1;
  const boxCenterX = (x1 + x2) / 2;
  const boxCenterY = (y1 + y2) / 2;

  const boxWidthBase = boxWidthWorld * fitScale;
  const boxHeightBase = boxHeightWorld * fitScale;

  const sidebarInset = getSidebarInset(viewport, hudVisible, sidebarCollapsed);
  const isCompact = viewport.width < DESKTOP_BREAKPOINT;
  const isSubZoneBox = boxWidthWorld < 1020 && boxHeightWorld < 720;
  const subPad = isSubZoneBox ? (isCompact ? 10 : 18) : 0;
  const padLeft = (sidebarInset > 0 ? sidebarInset + 14 : 10) + subPad;
  const padRight = (isCompact ? 10 : 16) + subPad;
  const padTop =
    (hudVisible ? (isCompact ? 10 : 14) : 10) +
    (isSubZoneBox && hudVisible ? 38 : 0);
  const padBottom =
    (hudVisible ? (isCompact ? 132 : 46) : 10) + (isSubZoneBox ? 10 : 0);

  const availW = Math.max(140, viewport.width - padLeft - padRight);
  const availH = Math.max(140, viewport.height - padTop - padBottom);

  const idealScale = Math.min(availW / boxWidthBase, availH / boxHeightBase);
  const scale = clamp(idealScale, 0.85, MAX_SCALE);

  const dxBase = (boxCenterX - WORLD_WIDTH / 2) * fitScale;
  const dyBase = (boxCenterY - WORLD_HEIGHT / 2) * fitScale;

  const visualBiasX = (padLeft - padRight) / 2;
  const visualBiasY = (padTop - padBottom) / 2;

  const rawX = -dxBase * scale + visualBiasX;
  const rawY = -dyBase * scale + visualBiasY;

  return { x: rawX, y: rawY, scale };
}

/**
 * Computes the camera transform that fits a section's bbox cleanly into the
 * open stage area to the right of the minimized desktop rail (or above the
 * mobile bottom sheet) with maximum TV visibility.
 */
export function computeSectionCamera(
  section: Section,
  viewport: ViewportSize,
  hudVisible: boolean,
  sidebarCollapsed = true,
): CameraState {
  return computeBboxCamera(section.bbox, viewport, hudVisible, sidebarCollapsed);
}

/**
 * Clamps drag-pan and wheel/pinch zoom strictly to the active section's crop
 * edges ([x1, y1, x2, y2]) inside the open canvas area (excluding sidebar/mobile sheet).
 */
export function clampCameraToSection(
  cam: CameraState,
  section: Section,
  viewport: ViewportSize,
  hudVisible: boolean,
  sidebarCollapsed = true,
): CameraState {
  const fitCam = computeSectionCamera(section, viewport, hudVisible, sidebarCollapsed);
  const scale = clamp(cam.scale, fitCam.scale, MAX_SCALE);

  const { fitScale } = computeBaseMetrics(viewport);
  const [x1, y1, x2, y2] = section.bbox;

  const cropLeftBase = (x1 - WORLD_WIDTH / 2) * fitScale;
  const cropRightBase = (x2 - WORLD_WIDTH / 2) * fitScale;
  const cropTopBase = (y1 - WORLD_HEIGHT / 2) * fitScale;
  const cropBottomBase = (y2 - WORLD_HEIGHT / 2) * fitScale;

  const cropCxBase = (cropLeftBase + cropRightBase) / 2;
  const cropCyBase = (cropTopBase + cropBottomBase) / 2;

  const cropScaledW = (cropRightBase - cropLeftBase) * scale;
  const cropScaledH = (cropBottomBase - cropTopBase) * scale;

  const sidebarInset = getSidebarInset(viewport, hudVisible, sidebarCollapsed);
  const isCompact = viewport.width < DESKTOP_BREAKPOINT;

  const openLeft = sidebarInset > 0 ? sidebarInset + 12 : 8;
  const openRight = viewport.width - (isCompact ? 8 : 14);
  const openTop = hudVisible ? (isCompact ? 10 : 12) : 10;
  const openBottom = viewport.height - (hudVisible ? (isCompact ? 128 : 44) : 10);

  const openW = Math.max(120, openRight - openLeft);
  const openH = Math.max(120, openBottom - openTop);

  const openCenterXOffset = (openLeft + openRight) / 2 - viewport.width / 2;
  const openCenterYOffset = (openTop + openBottom) / 2 - viewport.height / 2;

  const isDeepSubZoom = scale > fitCam.scale * 1.18;
  const slackX = isDeepSubZoom ? openW * 0.36 : 0;
  const slackY = isDeepSubZoom ? openH * 0.24 : 0;

  let clampedX: number;
  if (cropScaledW <= openW) {
    clampedX = openCenterXOffset - cropCxBase * scale;
  } else {
    const maxX = openLeft - viewport.width / 2 - cropLeftBase * scale + slackX;
    const minX = openRight - viewport.width / 2 - cropRightBase * scale - slackX;
    clampedX = clamp(cam.x, Math.min(minX, maxX), Math.max(minX, maxX));
  }

  let clampedY: number;
  if (cropScaledH <= openH) {
    clampedY = openCenterYOffset - cropCyBase * scale;
  } else {
    const maxY = openTop - viewport.height / 2 - cropTopBase * scale + slackY;
    const minY = openBottom - viewport.height / 2 - cropBottomBase * scale - slackY;
    clampedY = clamp(cam.y, Math.min(minY, maxY), Math.max(minY, maxY));
  }

  return { x: clampedX, y: clampedY, scale };
}

/**
 * Zooms smoothly around an exact stage-local coordinate so the anatomical
 * detail under the pointer never drifts.
 */
export function zoomAroundScreenPoint(
  current: CameraState,
  desiredScale: number,
  localX: number,
  localY: number,
  viewport: ViewportSize,
  activeSection: Section | null = null,
  hudVisible = true,
  sidebarCollapsed = true,
): CameraState {
  const minAllowed = activeSection
    ? computeSectionCamera(activeSection, viewport, hudVisible, sidebarCollapsed).scale
    : MIN_SCALE;

  const nextScale = clamp(desiredScale, minAllowed, MAX_SCALE);
  if (!activeSection && nextScale <= 1.001) {
    return OVERVIEW_CAMERA;
  }

  const px = localX - viewport.width / 2;
  const py = localY - viewport.height / 2;
  const ratio = nextScale / current.scale;

  const nextX = px - (px - current.x) * ratio;
  const nextY = py - (py - current.y) * ratio;

  if (activeSection) {
    return clampCameraToSection(
      { x: nextX, y: nextY, scale: nextScale },
      activeSection,
      viewport,
      hudVisible,
      sidebarCollapsed,
    );
  }

  return clampCamera({ x: nextX, y: nextY, scale: nextScale }, viewport, 0);
}

/**
 * Converts a point in the 2403x1540 artwork space to stage-local coordinates.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: CameraState,
  viewport: ViewportSize,
): { x: number; y: number } {
  const { fitScale } = computeBaseMetrics(viewport);
  const dxBase = (worldX - WORLD_WIDTH / 2) * fitScale;
  const dyBase = (worldY - WORLD_HEIGHT / 2) * fitScale;

  return {
    x: viewport.width / 2 + camera.x + dxBase * camera.scale,
    y: viewport.height / 2 + camera.y + dyBase * camera.scale,
  };
}
