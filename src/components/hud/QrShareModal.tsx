import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  CloudDownload,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Globe,
  Image as ImageIcon,
  QrCode as QrCodeIcon,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';
import {
  QR_MATRICES,
  type QrTargetKey,
} from '../../data/qrMatrices';
import type { SectionId } from '../../data/sections';
import { encodeTextToQrMatrix } from '../../lib/liveQrEncoder';
import { HUD_SPRING, pickTransition } from '../../lib/springs';
import { TiltCard } from './TiltCard';

interface QrShareModalProps {
  open: boolean;
  activeSectionId: SectionId | null;
  cardTiltEnabled?: boolean;
  onClose: () => void;
}

const PRIMARY_QR_KEYS: readonly QrTargetKey[] = [
  'overview',
  'original',
  'raw_png',
  'raw_pdf',
];

const SECTION_QR_KEYS: readonly QrTargetKey[] = [
  'axial',
  'appendicular',
  'hypobranchial',
  'branchiomeric',
];

const OFFLINE_CACHE_NAME = 'project-msi-offline-v5';
const OFFLINE_PRECACHE_ASSETS = [
  './',
  './index.html',
  './poster-original.html',
  './favicon.svg?v=5',
  './assets/map-full-1200w.jpg?v=4',
  './assets/map-full-2400w.jpg?v=4',
  './assets/map-full.jpg?v=4',
  './assets/axial.jpg?v=4',
  './assets/appendicular.jpg?v=4',
  './assets/hypobranchial.jpg?v=4',
  './assets/branchiomeric.jpg?v=4',
  './assets/qr-project-msi.svg',
  './models/shark.glb',
  './models/teleost.glb',
  './models/frog.glb',
  './models/crocodile.glb',
  './models/parrot.glb',
  './models/dog.glb',
  './models/horse.glb',
];

function isFinderEye(x: number, y: number, size: number): boolean {
  const inTopLeft = x < 7 && y < 7;
  const inTopRight = x >= size - 7 && y < 7;
  const inBottomLeft = x < 7 && y >= size - 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

function getRelativePathForKey(key: QrTargetKey): string {
  switch (key) {
    case 'overview':
      return '/';
    case 'original':
      return '/poster-original.html';
    case 'raw_png':
      return '/assets/CVA-Muscular-System-Original.png';
    case 'raw_pdf':
      return '/assets/CVA-Muscular-System-Original.pdf';
    default:
      return `/#${key}`;
  }
}

function detectInitialLanBase(): string {
  if (typeof window === 'undefined') return 'http://192.168.137.1:5173';
  const { protocol, hostname, port, pathname } = window.location;
  if (
    hostname &&
    hostname !== 'peeeweee.github.io' &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1'
  ) {
    const cleanPath = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    return `${protocol}//${hostname}${port ? `:${port}` : ''}${cleanPath}`;
  }
  const activePort = port || '5173';
  return `http://192.168.137.1:${activePort}`;
}

function BrandedQrSvg({
  size,
  rows,
  accent,
  label,
  url,
}: {
  size: number;
  rows: readonly string[];
  accent: string;
  label: string;
  url: string;
}) {
  const pad = 3;
  const total = size + pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const logoRadius = 3.55;

  const finderOrigins = [
    { ox: 0, oy: 0 },
    { ox: size - 7, oy: 0 },
    { ox: 0, oy: size - 7 },
  ];

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      className="h-full w-full select-none"
      role="img"
      aria-label={`QR Code for ${label}: ${url}`}
    >
      <rect width={total} height={total} rx={2.4} fill="#fff8f6" />

      {finderOrigins.map(({ ox, oy }) => (
        <g key={`${ox}-${oy}`} transform={`translate(${ox + pad}, ${oy + pad})`}>
          <rect
            x={0.5}
            y={0.5}
            width={6}
            height={6}
            rx={1.55}
            fill="none"
            stroke="#240505"
            strokeWidth={1}
          />
          <rect x={2} y={2} width={3} height={3} rx={0.75} fill={accent} />
        </g>
      ))}

      {rows.map((row, y) =>
        row.split('').map((ch, x) => {
          if (ch !== '1') return null;
          if (isFinderEye(x, y, size)) return null;
          if (
            Math.abs(x + 0.5 - cx) < logoRadius &&
            Math.abs(y + 0.5 - cy) < logoRadius
          ) {
            return null;
          }
          return (
            <rect
              key={`${x}-${y}`}
              x={x + pad + 0.06}
              y={y + pad + 0.06}
              width={0.88}
              height={0.88}
              rx={0.28}
              fill="#240505"
            />
          );
        }),
      )}
    </svg>
  );
}

/**
 * Top-bar triggered Classroom Phone Companion QR Code modal (#5):
 * - Works 100% offline:
 *   1. "GitHub Pages (Online / Cached PWA)" QR mode
 *   2. "Local Wi-Fi Hotspot (100% Offline LAN)" QR mode — dynamically encodes any
 *      local laptop/phone hotspot IP (e.g. http://192.168.137.1:5173) right in the browser!
 *   3. "Save All Offline" 1-tap PWA Cache button that stores all poster crops and
 *      3D models locally on the device for zero-internet / Airplane Mode use.
 */
export function QrShareModal({
  open,
  activeSectionId,
  cardTiltEnabled = true,
  onClose,
}: QrShareModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = pickTransition(HUD_SPRING, prefersReducedMotion);

  const [selectedKey, setSelectedKey] = useState<QrTargetKey>(
    activeSectionId ?? 'overview',
  );
  const [connectionMode, setConnectionMode] = useState<'cloud' | 'hotspot'>(
    'cloud',
  );
  const [hotspotBase, setHotspotBase] = useState<string>(detectInitialLanBase);
  const [copied, setCopied] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<
    'idle' | 'caching' | 'ready'
  >('idle');
  const [cacheProgress, setCacheProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setSelectedKey(activeSectionId ?? 'overview');
      setCopied(false);
    }
  }, [activeSectionId, open]);

  // Check if offline cache is already populated
  useEffect(() => {
    if (!open || typeof window === 'undefined' || !('caches' in window)) return;
    window.caches
      .open(OFFLINE_CACHE_NAME)
      .then((cache) => cache.keys())
      .then((keys) => {
        if (keys.length >= 10) {
          setOfflineStatus('ready');
        }
      })
      .catch(() => {});
  }, [open]);

  const baseEntry = QR_MATRICES[selectedKey];

  const { activeUrl, qrSize, qrRows } = useMemo(() => {
    if (connectionMode === 'cloud') {
      return {
        activeUrl: baseEntry.url,
        qrSize: baseEntry.size,
        qrRows: baseEntry.rows,
      };
    }

    const cleanBase =
      hotspotBase.trim().replace(/\/+$/, '') || 'http://192.168.137.1:5173';
    const customUrl = `${cleanBase}${getRelativePathForKey(selectedKey)}`;
    try {
      const encoded = encodeTextToQrMatrix(customUrl);
      return {
        activeUrl: customUrl,
        qrSize: encoded.size,
        qrRows: encoded.rows,
      };
    } catch {
      return {
        activeUrl: baseEntry.url,
        qrSize: baseEntry.size,
        qrRows: baseEntry.rows,
      };
    }
  }, [baseEntry, connectionMode, hotspotBase, selectedKey]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSaveOfflineCache = async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    setOfflineStatus('caching');
    setCacheProgress(0);
    try {
      const cache = await window.caches.open(OFFLINE_CACHE_NAME);
      let done = 0;
      for (const assetUrl of OFFLINE_PRECACHE_ASSETS) {
        try {
          const res = await fetch(assetUrl, { cache: 'reload' });
          if (res.ok) {
            await cache.put(assetUrl, res.clone());
          }
        } catch {
          // ignore individual asset error if already cached
        }
        done += 1;
        setCacheProgress(
          Math.round((done / OFFLINE_PRECACHE_ASSETS.length) * 100),
        );
      }
      setOfflineStatus('ready');
    } catch {
      setOfflineStatus('idle');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="qr-share-backdrop"
          data-testid="qr-share-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#140202]/80 p-3 backdrop-blur-md sm:p-4"
        >
          <motion.div
            key="qr-share-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Scan QR Code or Download Original Poster PNG and PDF"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={transition}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <TiltCard
              enabled={cardTiltEnabled}
              maxTilt={4}
              className="hud-glass overflow-hidden rounded-3xl border border-[#ffd9d0]/22 shadow-2xl"
            >
              {/* Top accent bar */}
              <div
                className="h-1 w-full transition-colors duration-300"
                style={{ backgroundColor: baseEntry.accent }}
              />

              <div className="touch-scroll-y max-h-[92dvh] overflow-y-auto p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${baseEntry.accent}26`,
                        color: '#fff1ee',
                        border: `1px solid ${baseEntry.accent}66`,
                      }}
                    >
                      <QrCodeIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#fff1ee]">
                        QR Companion & Offline Mode
                      </h2>
                      <p className="text-xs text-[#ffd9d0]/75">
                        Works online via GitHub Pages or 100% offline via Wi-Fi Hotspot
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="hud-btn flex h-8 w-8 items-center justify-center rounded-full text-[#ffd9d0]/80 hover:bg-[#fff1ee]/12 hover:text-[#fff1ee]"
                    aria-label="Close QR companion"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Online GitHub Pages vs. 100% Offline Local Wi-Fi Hotspot Switcher */}
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-[#ffd9d0]/16 bg-[#170202]/90 p-1">
                  <button
                    type="button"
                    data-testid="qr-conn-cloud"
                    onClick={() => setConnectionMode('cloud')}
                    className={`hud-btn flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                      connectionMode === 'cloud'
                        ? 'bg-[#fff1ee] text-[#240505] shadow-sm'
                        : 'text-[#ffd9d0]/80 hover:text-[#fff1ee]'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>GitHub Pages</span>
                  </button>

                  <button
                    type="button"
                    data-testid="qr-conn-hotspot"
                    onClick={() => setConnectionMode('hotspot')}
                    className={`hud-btn flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                      connectionMode === 'hotspot'
                        ? 'bg-emerald-400 text-[#0f1f14] shadow-sm'
                        : 'text-[#ffd9d0]/80 hover:text-[#fff1ee]'
                    }`}
                  >
                    <Wifi className="h-3.5 w-3.5" />
                    <span>Offline Wi-Fi Hotspot</span>
                  </button>
                </div>

                {/* Local Hotspot IP Input (shown when Offline Wi-Fi Hotspot mode is active) */}
                {connectionMode === 'hotspot' && (
                  <div className="mt-2 rounded-2xl border border-emerald-400/35 bg-emerald-950/35 p-2.5">
                    <label
                      htmlFor="hotspot-ip-input"
                      className="block text-[10px] font-semibold tracking-wider text-emerald-200 uppercase"
                    >
                      Your Laptop / Hotspot Local Address (Zero Internet Needed)
                    </label>
                    <input
                      id="hotspot-ip-input"
                      data-testid="hotspot-ip-input"
                      type="text"
                      value={hotspotBase}
                      onChange={(e) => setHotspotBase(e.target.value)}
                      placeholder="http://192.168.137.1:5173"
                      className="font-mono-num mt-1 w-full rounded-xl border border-emerald-400/40 bg-[#120202]/90 px-2.5 py-1.5 text-xs text-[#fff1ee] focus:border-emerald-300 focus:outline-none"
                    />
                    <p className="mt-1 text-[10.5px] leading-snug text-emerald-100/80">
                      Connect phones to your laptop Wi-Fi hotspot & run{' '}
                      <code className="font-mono-num rounded bg-black/40 px-1">
                        npm run dev
                      </code>{' '}
                      — QR updates live offline!
                    </p>
                  </div>
                )}

                {/* Row 1: Interactive App vs. Original High-Quality Poster (HD / PNG / PDF) QR Switcher */}
                <div className="mt-2.5">
                  <div
                    className="grid grid-cols-2 gap-1 rounded-2xl border border-[#ffd9d0]/16 bg-[#1c0303]/85 p-1 sm:grid-cols-4"
                    role="tablist"
                    aria-label="QR Code destination type"
                  >
                    {PRIMARY_QR_KEYS.map((key) => {
                      const item = QR_MATRICES[key];
                      const active = key === selectedKey;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          data-testid={`qr-tab-${key}`}
                          onClick={() => {
                            setSelectedKey(key);
                            setCopied(false);
                          }}
                          className={`hud-btn rounded-xl px-2 py-1.5 text-center text-[11px] font-semibold transition-all ${
                            active
                              ? 'bg-[#fff1ee] text-[#240505] shadow-sm'
                              : 'text-[#ffd9d0]/82 hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: CVA Section Deep-Link QR Switcher */}
                <div
                  className="mt-1.5 grid grid-cols-4 gap-1 rounded-2xl border border-[#ffd9d0]/12 bg-[#1c0303]/60 p-1"
                  role="tablist"
                  aria-label="CVA Section QR Code links"
                >
                  {SECTION_QR_KEYS.map((key) => {
                    const item = QR_MATRICES[key];
                    const active = key === selectedKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        data-testid={`qr-tab-${key}`}
                        onClick={() => {
                          setSelectedKey(key);
                          setCopied(false);
                        }}
                        className={`hud-btn truncate rounded-xl px-1.5 py-1 text-center text-[10.5px] font-semibold transition-all ${
                          active
                            ? 'bg-[#fff1ee] text-[#240505] shadow-sm'
                            : 'text-[#ffd9d0]/75 hover:bg-[#fff1ee]/8 hover:text-[#fff1ee]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* High-contrast TV-scannable QR Card with centered Muscle Emblem */}
                <div className="mt-3 flex flex-col items-center">
                  <div
                    className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-3xl border-2 bg-[#fff8f6] p-3 shadow-2xl sm:h-56 sm:w-56"
                    style={{
                      borderColor: `${baseEntry.accent}aa`,
                      boxShadow: `0 16px 38px -10px rgba(8, 1, 1, 0.8), 0 0 28px -6px ${baseEntry.accent}66`,
                    }}
                  >
                    <BrandedQrSvg
                      size={qrSize}
                      rows={qrRows}
                      accent={baseEntry.accent}
                      label={baseEntry.label}
                      url={activeUrl}
                    />

                    {/* Centered Project MSI Muscle Logo Emblem */}
                    <div
                      className="pointer-events-none absolute flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#fff8f6] bg-[#240505] p-0.5 shadow-lg"
                      style={{
                        boxShadow: `0 4px 14px rgba(20, 2, 2, 0.45), 0 0 0 2px ${baseEntry.accent}`,
                      }}
                    >
                      <img
                        src="./favicon.svg?v=5"
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    </div>
                  </div>

                  {/* Active link caption */}
                  <div className="mt-2 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fff1ee]">
                      <Smartphone
                        className="h-3.5 w-3.5"
                        style={{ color: baseEntry.accent }}
                      />
                      <span>{baseEntry.subtitle}</span>
                    </div>
                    <div className="font-mono-num mt-0.5 break-all text-[10.5px] text-[#ffd9d0]/75">
                      {activeUrl}
                    </div>
                  </div>
                </div>

                {/* Link Actions: Copy Link, Open Target, Save All Offline PWA Cache */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="qr-copy-link"
                    onClick={handleCopy}
                    className="hud-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/22 bg-[#380909]/90 px-3 py-1.5 text-xs font-semibold text-[#fff1ee] hover:bg-[#4f0d0d]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hud-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/20 bg-[#260505]/85 px-3 py-1.5 text-xs font-semibold text-[#ffd9d0] hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open</span>
                  </a>

                  <button
                    type="button"
                    data-testid="qr-save-offline-cache"
                    onClick={handleSaveOfflineCache}
                    disabled={offlineStatus === 'caching'}
                    className={`hud-btn flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      offlineStatus === 'ready'
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                        : 'border-[#ffd9d0]/22 bg-[#260505]/90 text-[#fff1ee] hover:bg-[#3b0909]'
                    }`}
                    title="Pre-download all poster crops & 3D models so Project MSI works in Airplane Mode / zero internet"
                  >
                    {offlineStatus === 'ready' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Offline Ready</span>
                      </>
                    ) : offlineStatus === 'caching' ? (
                      <>
                        <CloudDownload className="h-3.5 w-3.5 animate-bounce text-amber-300" />
                        <span>Caching {cacheProgress}%</span>
                      </>
                    ) : (
                      <>
                        <CloudDownload className="h-3.5 w-3.5 text-[#ffd9d0]" />
                        <span>Save Offline</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Dedicated Original Poster (5560x3563) Direct View & Save as PNG / PDF Section */}
                <div className="mt-2.5 rounded-2xl border border-[#ffd9d0]/18 bg-[#1b0303]/85 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-[#fff1ee]">
                      Original Quality Poster (5560 × 3563 px)
                    </div>
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9.5px] font-bold text-rose-200 uppercase">
                      Works Offline
                    </span>
                  </div>

                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    <a
                      href="./assets/CVA-Muscular-System-Original.png"
                      target="_blank"
                      rel="noreferrer"
                      data-testid="qr-view-original-image"
                      className="hud-btn flex items-center justify-center gap-1 rounded-xl border border-[#ffd9d0]/20 bg-[#2b0606] px-2 py-1.5 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#3f0909]"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-[#ffd9d0]" />
                      <span>Image Only</span>
                    </a>

                    <a
                      href="./assets/CVA-Muscular-System-Original.png"
                      download="CVA-Muscular-System-Original.png"
                      data-testid="qr-download-png"
                      className="hud-btn flex items-center justify-center gap-1 rounded-xl border border-emerald-400/35 bg-emerald-500/18 px-2 py-1.5 text-[11px] font-bold text-[#fff1ee] hover:bg-emerald-500/28"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Save PNG</span>
                    </a>

                    <a
                      href="./assets/CVA-Muscular-System-Original.pdf"
                      download="CVA-Muscular-System-Original.pdf"
                      data-testid="qr-download-pdf"
                      className="hud-btn flex items-center justify-center gap-1 rounded-xl border border-amber-400/35 bg-amber-500/18 px-2 py-1.5 text-[11px] font-bold text-[#fff1ee] hover:bg-amber-500/28"
                    >
                      <FileDown className="h-3.5 w-3.5 text-amber-300" />
                      <span>Save PDF</span>
                    </a>
                  </div>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
