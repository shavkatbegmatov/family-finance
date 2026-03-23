import { useState, useEffect } from 'react';

/**
 * React hook for responsive media queries.
 * Uses window.matchMedia for reactive updates.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Mobile: lg breakpoint'dan past (< 1024px) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)');
}

/** Desktop: lg breakpoint va undan katta (>= 1024px) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
