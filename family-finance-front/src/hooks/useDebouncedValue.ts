import { useEffect, useState } from 'react';

const DEFAULT_DELAY_MS = 300;

/**
 * Qiymatni belgilangan vaqt davomida kechiktiradi.
 * Foydalanuvchi har bosishida API chaqirilmasligi uchun.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = DEFAULT_DELAY_MS): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
