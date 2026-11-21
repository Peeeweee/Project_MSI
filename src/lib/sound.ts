/**
 * Optional procedural Web Audio API sound effects (OFF by default).
 * Never allocates an AudioContext until sound is explicitly enabled by the user.
 */
let audioCtx: AudioContext | null = null;
let lastTickAt = 0;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;

  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Tactile, very subtle hover micro-tick (~28ms), throttled so sweeping across
 * regions feels refined rather than noisy.
 */
export function playHoverTick(enabled: boolean): void {
  if (!enabled) return;
  const nowMs = performance.now();
  if (nowMs - lastTickAt < 70) return;
  lastTickAt = nowMs;

  const ctx = ensureContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(920, t);
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.032);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.035, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.036);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.04);
}

/**
 * Soft, airy filtered-noise whoosh for section zoom-in, pan-through, and zoom-out.
 */
export function playTransitionWhoosh(
  enabled: boolean,
  kind: 'in' | 'pan' | 'out' = 'in',
): void {
  if (!enabled) return;
  const ctx = ensureContext();
  if (!ctx) return;

  const duration = kind === 'out' ? 0.34 : 0.44;
  const sampleCount = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Soft pink-ish filtered random noise
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < sampleCount; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.029;
    b1 = 0.985 * b1 + white * 0.032;
    b2 = 0.95 * b2 + white * 0.048;
    data[i] = (b0 + b1 + b2 + white * 0.08) * 0.6;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.6;

  const t = ctx.currentTime;
  if (kind === 'in') {
    filter.frequency.setValueAtTime(220, t);
    filter.frequency.exponentialRampToValueAtTime(760, t + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(260, t + duration);
  } else if (kind === 'pan') {
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(640, t + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(300, t + duration);
  } else {
    filter.frequency.setValueAtTime(660, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + duration);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.06, t + duration * 0.28);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(t);
  source.stop(t + duration + 0.02);
}

