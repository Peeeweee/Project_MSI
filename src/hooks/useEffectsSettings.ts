import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export type EffectsPreset = 'full' | 'lite' | 'off';

export interface EffectsConfig {
  /** Slow-drifting particles & flowing maroon/blush muscle fibers */
  ambient: boolean;
  /** 3-layer depth parallax (background glow, artwork, floating HUD) */
  parallax: boolean;
  /** 3D card tilt + moving specular highlight on HUD cards */
  cardTilt: boolean;
  /** Animated hover card on section owner badge */
  ownerBadge: boolean;
  /** 2-second micro-intro with assembling title letters & counters */
  intro: boolean;
  /** Optional subtle Web Audio whoosh & hover tick (OFF by default) */
  sound: boolean;
  /** Blurred low-res artwork page-load skeleton placeholder */
  skeleton: boolean;
}

export const EFFECTS_PRESETS: Record<EffectsPreset, EffectsConfig> = {
  full: {
    ambient: true,
    parallax: true,
    cardTilt: true,
    ownerBadge: true,
    intro: true,
    sound: false,
    skeleton: true,
  },
  lite: {
    ambient: true,
    parallax: false,
    cardTilt: true,
    ownerBadge: true,
    intro: false,
    sound: false,
    skeleton: true,
  },
  off: {
    ambient: false,
    parallax: false,
    cardTilt: false,
    ownerBadge: false,
    intro: false,
    sound: false,
    skeleton: false,
  },
};

const STORAGE_KEY = 'cva-muscular-effects-v1';

function detectMatchingPreset(cfg: EffectsConfig): EffectsPreset | 'custom' {
  for (const key of ['full', 'lite', 'off'] as const) {
    const p = EFFECTS_PRESETS[key];
    // Compare visual toggles ignoring optional sound preference
    if (
      cfg.ambient === p.ambient &&
      cfg.parallax === p.parallax &&
      cfg.cardTilt === p.cardTilt &&
      cfg.ownerBadge === p.ownerBadge &&
      cfg.intro === p.intro &&
      cfg.skeleton === p.skeleton
    ) {
      return key;
    }
  }
  return 'custom';
}

function readInitialConfig(prefersReducedMotion: boolean | null): EffectsConfig {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<EffectsConfig>;
        return { ...EFFECTS_PRESETS.full, ...parsed };
      }
    } catch {
      // ignore storage restrictions
    }
  }
  return prefersReducedMotion ? { ...EFFECTS_PRESETS.off } : { ...EFFECTS_PRESETS.full };
}

export function useEffectsSettings() {
  const prefersReducedMotion = useReducedMotion();
  const [config, setConfig] = useState<EffectsConfig>(() =>
    readInitialConfig(prefersReducedMotion),
  );

  // Respect system reduced-motion preference if user hasn't stored an explicit override
  useEffect(() => {
    if (!prefersReducedMotion) return;
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setConfig({ ...EFFECTS_PRESETS.off });
      }
    } catch {
      setConfig({ ...EFFECTS_PRESETS.off });
    }
  }, [prefersReducedMotion]);

  const persist = useCallback((next: EffectsConfig) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const applyPreset = useCallback(
    (preset: EffectsPreset) => {
      setConfig((prev) => {
        const next: EffectsConfig = {
          ...EFFECTS_PRESETS[preset],
          // Preserve user's explicit sound choice unless turning everything Off
          sound: preset === 'off' ? false : prev.sound,
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleEffect = useCallback(
    (key: keyof EffectsConfig) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const activePreset = detectMatchingPreset(config);

  return {
    config,
    activePreset,
    applyPreset,
    toggleEffect,
  };
}

