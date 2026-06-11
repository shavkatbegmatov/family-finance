import { useEffect, useRef } from 'react';

/** Fokuslanadigan elementlar selektori (disabled/yashirinlar chiqariladi). */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Dialog (modal/bottom-sheet) uchun haqiqiy focus-trap:
 * - ochilganda fokus konteynerga olib kiriladi (konteyner o'zi — birinchi
 *   input emas, aks holda mobilda klaviatura o'z-o'zidan ochilib ketadi);
 * - Tab / Shift+Tab konteyner ichida aylanadi, orqa fonga chiqmaydi;
 * - yopilganda fokus dialogni ochgan elementga qaytadi.
 *
 * Qaytarilgan ref dialog konteyneriga beriladi (konteynerda tabIndex={-1}
 * bo'lishi shart).
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const restoreTarget = document.activeElement as HTMLElement | null;
    container.focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);

      if (items.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const inside = container.contains(current);

      if (e.shiftKey) {
        if (!inside || current === first || current === container) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // capture: true — boshqa keydown handler'lardan oldin ishlaydi
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Dialog yopilganda fokusni trigger elementga qaytarish
      restoreTarget?.focus?.({ preventScroll: true });
    };
  }, [active]);

  return containerRef;
}
