import { useEffect, useRef } from 'react';
import { SCOPE_CHANGED_EVENT } from '../components/scope/ScopeSwitcher';
import { useScopeStore } from '../store/scopeStore';
import type { Scope } from '../types/scope.types';

interface ScopeChangeDetail {
  scope: Scope;
  previousScopeId: number | null;
}

/**
 * Aktiv scope o'zgartirilganda berilgan callback'ni chaqiradi.
 *
 * <p>Ikkita manbada ishlaydi:</p>
 * <ul>
 *   <li>ScopeSwitcher dispatch qilgan {@code scope-changed} custom event'i
 *       (server'ga POST /v1/auth/switch-scope dan keyin)</li>
 *   <li>Zustand scopeStore.activeScope.id o'zgarganda (boshqa sabab bilan
 *       o'zgargan bo'lsa ham, masalan boshqa tab)</li>
 * </ul>
 *
 * <h3>Foydalanish</h3>
 * <pre>
 * const fetchAccounts = useCallback(() =&gt; { ... }, [...]);
 *
 * useScopeChangeEffect(() =&gt; {
 *     // Aktiv scope o'zgardi — ma'lumotni qayta yuklash kerak
 *     fetchAccounts();
 * });
 * </pre>
 *
 * <p>Birinchi mount paytida callback chaqirilmaydi — initial fetch o'z
 * useEffect/useQuery orqali bo'lishi kerak.</p>
 *
 * @param onScopeChange — yangi scope ID bilan chaqiriladi (oldingisi bilan)
 */
export function useScopeChangeEffect(
  onScopeChange: (newScopeId: number, previousScopeId: number | null) => void,
): void {
  const callbackRef = useRef(onScopeChange);
  callbackRef.current = onScopeChange;

  const activeScopeId = useScopeStore((s) => s.activeScope?.id ?? null);
  const previousScopeIdRef = useRef<number | null>(activeScopeId);

  // 1) Custom event listener — bir xil tab'da ScopeSwitcher orqali o'zgarish
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ScopeChangeDetail>;
      const detail = customEvent.detail;
      if (!detail) return;
      callbackRef.current(detail.scope.id, detail.previousScopeId);
    };
    window.addEventListener(SCOPE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SCOPE_CHANGED_EVENT, handler);
  }, []);

  // 2) scopeStore.activeScope.id o'zgarishini ham kuzatamiz — masalan, boshqa
  //    tab'dan localStorage o'zgargan yoki test'da ScopeStore qo'lda yangilanganda.
  //    Birinchi mount paytida chaqirmaymiz (faqat real o'zgarishlarda).
  useEffect(() => {
    const previous = previousScopeIdRef.current;
    if (previous !== null && activeScopeId !== null && previous !== activeScopeId) {
      callbackRef.current(activeScopeId, previous);
    }
    previousScopeIdRef.current = activeScopeId;
  }, [activeScopeId]);
}

/**
 * useScopeChangeEffect ning oddiyroq versiyasi — faqat bayroq qaytaradi.
 *
 * <p>Chaqirilgan paytda aktiv scope ID'sini qaytaradi. Komponent
 * useEffect'da uni dependency sifatida ishlatishi mumkin:</p>
 *
 * <pre>
 * const scopeId = useActiveScopeId();
 *
 * useEffect(() =&gt; {
 *     loadData();
 * }, [scopeId]); // scope o'zgarganda qayta yuklanadi
 * </pre>
 */
export function useActiveScopeId(): number | null {
  return useScopeStore((s) => s.activeScope?.id ?? null);
}
