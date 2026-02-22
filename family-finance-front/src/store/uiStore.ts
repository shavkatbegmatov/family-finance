import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  sidebarOpen: boolean;
  themeMode: ThemeMode;
  isWhatsNewOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setWhatsNewOpen: (open: boolean) => void;
  getEffectiveTheme: () => 'family' | 'family-dark';
}

const getSystemTheme = (): 'family' | 'family-dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'family-dark' : 'family';
  }
  return 'family';
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      themeMode: 'system',
      isWhatsNewOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setWhatsNewOpen: (open) => set({ isWhatsNewOpen: open }),

      setThemeMode: (mode) => {
        set({ themeMode: mode });
        const effectiveTheme = mode === 'system'
          ? getSystemTheme()
          : mode === 'dark' ? 'family-dark' : 'family';
        document.documentElement.setAttribute('data-theme', effectiveTheme);
      },

      getEffectiveTheme: () => {
        const { themeMode } = get();
        if (themeMode === 'system') {
          return getSystemTheme();
        }
        return themeMode === 'dark' ? 'family-dark' : 'family';
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        themeMode: state.themeMode,
      }),
    }
  )
);
