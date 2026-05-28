import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Scope } from '../types/scope.types';

/**
 * Joriy aktiv scope va user a'zo bo'lgan scope'lar ro'yxati.
 *
 * <p>Aktiv scope ID JWT'da claim sifatida saqlanadi (backend tomonidan).
 * Bu store esa UI tomonida joriy scope ma'lumotlarini cache qiladi.</p>
 */
interface ScopeState {
  /** Joriy aktiv scope (header'da ko'rinadi). */
  activeScope: Scope | null;
  /** User a'zo bo'lgan barcha scope'lar — ScopeSwitcher dropdown'i uchun. */
  myScopes: Scope[];
  /** myScopes yuklanyaptimi? */
  isLoading: boolean;

  setActiveScope: (scope: Scope | null) => void;
  setMyScopes: (scopes: Scope[]) => void;
  setLoading: (loading: boolean) => void;
  /** Logout paytida ishlatish. */
  reset: () => void;
}

export const useScopeStore = create<ScopeState>()(
  persist(
    (set) => ({
      activeScope: null,
      myScopes: [],
      isLoading: false,

      setActiveScope: (scope) => set({ activeScope: scope }),
      setMyScopes: (scopes) => set({ myScopes: scopes }),
      setLoading: (loading) => set({ isLoading: loading }),
      reset: () =>
        set({
          activeScope: null,
          myScopes: [],
          isLoading: false,
        }),
    }),
    {
      name: 'scope-store',
      // myScopes va activeScope ni saqlash, lekin loading flag'ini saqlamaslik
      partialize: (state) => ({
        activeScope: state.activeScope,
        myScopes: state.myScopes,
      }),
    },
  ),
);
