import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Image as ImageIcon,
  QrCode as QrCodeIcon,
  Smartphone,
  X,
} from 'lucide-react';
import {
  QR_MATRICES,
  type QrMatrixEntry,
  type QrTargetKey,
} from '../../data/qrMatrices';
import type { SectionId } from '../../data/sections';
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

function isFinderEye(x: number, y: number, size: number): boolean {
  const inTopLeft = x < 7 && y < 7;
  const inTopRight = x >= size - 7 && y < 7;
  const inBottomLeft = x < 7 && y >= size - 7;
  return inTopLeft || inTopRight || inBottomLeft;
}

function BrandedQrSvg({ entry }: { entry: QrMatrixEntry }) {
  const { size, rows, accent } = entry;
  const pad = 3;
  const total = size + pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  // Reserve 7x7 center window (safe under ECC.HIGH 30% recovery) for the muscle emblem
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
      aria-label={`QR Code for ${entry.label}: ${entry.url}`}
    >
      <rect width={total} height={total} rx={2.4} fill="#fff8f6" />

      {/* Custom rounded finder pattern eyes */}
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
          <rect
            x={2}
            y={2}
            width={3}
            height={3}
            rx={0.75}
            fill={accent}
          />
        </g>
      ))}

      {/* Rounded data modules */}
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
 * - Includes dedicated QR codes for:
 *   1. Interactive App (`overview` or active CVA section `#axial`..`#branchiomeric`)
 *   2. Original Poster (HD 5560x3563 Viewer + PNG/PDF Save Page)
 *   3. Raw PNG Image Only (`CVA-Muscular-System-Original.png`)
 *   4. Raw PDF File Only (`CVA-Muscular-System-Original.pdf`)
 * - Also provides 1-click Save as PNG, Save as PDF, and View Original Image buttons.
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedKey(activeSectionId ?? 'overview');
      setCopied(false);
    }
  }, [activeSectionId, open]);

  const entry = QR_MATRICES[selectedKey];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
                style={{ backgroundColor: entry.accent }}
              />

              <div className="touch-scroll-y max-h-[90dvh] overflow-y-auto p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${entry.accent}26`,
                        color: '#fff1ee',
                        border: `1px solid ${entry.accent}66`,
                      }}
                    >
                      <QrCodeIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#fff1ee]">
                        QR Companion & Original Poster
                      </h2>
                      <p className="text-xs text-[#ffd9d0]/75">
                        Scan for Interactive App or Original 5560×3563 Poster (PNG & PDF)
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

                {/* Row 1: Interactive App vs. Original High-Quality Poster (HD / PNG / PDF) QR Switcher */}
                <div className="mt-3">
                  <div className="mb-1 text-[10px] font-semibold tracking-wider text-[#ffd9d0]/65 uppercase">
                    Select QR Code Mode
                  </div>
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
                <div className="mt-3.5 flex flex-col items-center">
                  <div
                    className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-3xl border-2 bg-[#fff8f6] p-3 shadow-2xl sm:h-60 sm:w-60"
                    style={{
                      borderColor: `${entry.accent}aa`,
                      boxShadow: `0 16px 38px -10px rgba(8, 1, 1, 0.8), 0 0 28px -6px ${entry.accent}66`,
                    }}
                  >
                    <BrandedQrSvg entry={entry} />

                    {/* Centered Project MSI Muscle Logo Emblem */}
                    <div
                      className="pointer-events-none absolute flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#fff8f6] bg-[#240505] p-0.5 shadow-lg"
                      style={{
                        boxShadow: `0 4px 14px rgba(20, 2, 2, 0.45), 0 0 0 2px ${entry.accent}`,
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
                  <div className="mt-2.5 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fff1ee]">
                      <Smartphone
                        className="h-3.5 w-3.5"
                        style={{ color: entry.accent }}
                      />
                      <span>{entry.subtitle}</span>
                    </div>
                    <div className="font-mono-num mt-0.5 break-all text-[10.5px] text-[#ffd9d0]/75">
                      {entry.url}
                    </div>
                  </div>
                </div>

                {/* Link Actions: Copy Link, Open Target, Download QR SVG */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="qr-copy-link"
                    onClick={handleCopy}
                    className="hud-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/22 bg-[#380909]/90 px-3 py-1.5 text-xs font-semibold text-[#fff1ee] hover:bg-[#4f0d0d]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hud-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/20 bg-[#260505]/85 px-3 py-1.5 text-xs font-semibold text-[#ffd9d0] hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open</span>
                  </a>

                  <a
                    href="./assets/qr-project-msi.svg"
                    download="Project-MSI-QR.svg"
                    className="hud-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/20 bg-[#260505]/85 px-2.5 py-1.5 text-xs font-semibold text-[#ffd9d0] hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]"
                    title="Download SVG QR Code"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>QR</span>
                  </a>
                </div>

                {/* Dedicated Original Poster (5560x3563) Direct View & Save as PNG / PDF Section */}
                <div className="mt-3 rounded-2xl border border-[#ffd9d0]/18 bg-[#1b0303]/85 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-[#fff1ee]">
                      Original Quality Poster (5560 × 3563 px)
                    </div>
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9.5px] font-bold text-rose-200 uppercase">
                      Lossless Master
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <a
                      href="./assets/CVA-Muscular-System-Original.png"
                      target="_blank"
                      rel="noreferrer"
                      data-testid="qr-view-original-image"
                      className="hud-btn flex items-center justify-center gap-1 rounded-xl border border-[#ffd9d0]/20 bg-[#2b0606] px-2 py-2 text-[11px] font-semibold text-[#fff1ee] hover:bg-[#3f0909]"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-[#ffd9d0]" />
                      <span>Image Only</span>
                    </a>

                    <a
                      href="./assets/CVA-Muscular-System-Original.png"
                      download="CVA-Muscular-System-Original.png"
                      data-testid="qr-download-png"
                      className="hud-btn flex items-center justify-center gap-1 rounded-xl border border-emerald-400/35 bg-emerald-500/18 px-2 py-2 text-[11px] font-bold text-[#fff1ee] hover:bg-emerald-500/28"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Save PNG</span>
                    </a>

                    <a
                      href="./assets/CVA-Muscular-System-Original.pdf"
                      download="CVA-Muscular-System-Original.pdf"
                      data-testid="qr-download-pdf"
                      className="hud-btn flex items-center justify-center gap-1 rounded-xl border border-amber-400/35 bg-amber-500/18 px-2 py-2 text-[11px] font-bold text-[#fff1ee] hover:bg-amber-500/28"
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
