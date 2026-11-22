import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
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

const TARGET_KEYS: readonly QrTargetKey[] = [
  'overview',
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
 * - Never clutters the home poster stage; opens cleanly from the top bar.
 * - Lets classmates & instructors scan the classroom TV to explore Project MSI
 *   (or jump straight to the active presenter's section) on their phones.
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#140202]/78 p-4 backdrop-blur-md"
        >
          <motion.div
            key="qr-share-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Scan QR Code to open Project MSI on mobile"
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

              <div className="p-5">
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
                        Mobile Classroom Companion
                      </h2>
                      <p className="text-xs text-[#ffd9d0]/75">
                        Scan on your phone to zoom & explore live alongside the TV
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

                {/* Target Section / Full Dashboard Switcher */}
                <div
                  className="mt-3.5 flex flex-wrap items-center gap-1 rounded-2xl border border-[#ffd9d0]/14 bg-[#1c0303]/80 p-1"
                  role="tablist"
                  aria-label="QR target link"
                >
                  {TARGET_KEYS.map((key) => {
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
                        className={`hud-btn flex-1 rounded-xl px-2 py-1 text-center text-[11px] font-semibold whitespace-nowrap transition-all ${
                          active
                            ? 'bg-[#fff1ee] text-[#240505] shadow-sm'
                            : 'text-[#ffd9d0]/78 hover:bg-[#fff1ee]/8 hover:text-[#fff1ee]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* High-contrast TV-scannable QR Card with centered Muscle Emblem */}
                <div className="mt-4 flex flex-col items-center">
                  <div
                    className="relative flex h-60 w-60 items-center justify-center overflow-hidden rounded-3xl border-2 bg-[#fff8f6] p-3 shadow-2xl sm:h-64 sm:w-64"
                    style={{
                      borderColor: `${entry.accent}aa`,
                      boxShadow: `0 16px 38px -10px rgba(8, 1, 1, 0.8), 0 0 28px -6px ${entry.accent}66`,
                    }}
                  >
                    <BrandedQrSvg entry={entry} />

                    {/* Centered Project MSI Muscle Logo Emblem */}
                    <div
                      className="pointer-events-none absolute flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#fff8f6] bg-[#240505] p-0.5 shadow-lg"
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
                  <div className="mt-3 text-center">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fff1ee]">
                      <Smartphone
                        className="h-3.5 w-3.5"
                        style={{ color: entry.accent }}
                      />
                      <span>{entry.subtitle}</span>
                    </div>
                    <div className="font-mono-num mt-0.5 text-[11px] text-[#ffd9d0]/75">
                      {entry.url}
                    </div>
                  </div>
                </div>

                {/* Action buttons: Copy Link, Open Live, Download SVG */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="qr-copy-link"
                    onClick={handleCopy}
                    className="hud-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/22 bg-[#380909]/90 px-3 py-2 text-xs font-semibold text-[#fff1ee] hover:bg-[#4f0d0d]"
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
                    className="hud-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/20 bg-[#260505]/85 px-3 py-2 text-xs font-semibold text-[#ffd9d0] hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open</span>
                  </a>

                  <a
                    href="./assets/qr-project-msi.svg"
                    download="Project-MSI-QR.svg"
                    className="hud-btn flex items-center justify-center gap-1.5 rounded-xl border border-[#ffd9d0]/20 bg-[#260505]/85 px-3 py-2 text-xs font-semibold text-[#ffd9d0] hover:bg-[#fff1ee]/10 hover:text-[#fff1ee]"
                    title="Download SVG QR Code"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>SVG</span>
                  </a>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
