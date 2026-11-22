import { useEffect, useState } from 'react';
import type { ViewportSize } from '../lib/cameraMath';

function readViewport(): ViewportSize {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }
  const vv = window.visualViewport;
  return {
    width: Math.round(vv ? vv.width : window.innerWidth),
    height: Math.round(vv ? vv.height : window.innerHeight),
  };
}

/**
 * Tracks live viewport dimensions across desktop, iOS Safari dynamic address bars,
 * and Android Chrome visualViewport resize/orientation events.
 */
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
    const vv = window.visualViewport;
    vv?.addEventListener('resize', handleResize, { passive: true });
    vv?.addEventListener('scroll', handleResize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      vv?.removeEventListener('resize', handleResize);
      vv?.removeEventListener('scroll', handleResize);
    };
  }, []);

  return size;
}
