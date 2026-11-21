import { useEffect, useState } from 'react';
import type { ViewportSize } from '../lib/cameraMath';

function readViewport(): ViewportSize {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(readViewport);

  useEffect(() => {
    let rafId: number | null = null;

    const handleResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const next = readViewport();
        setSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next,
        );
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return size;
}

