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

  // Column widths per table
  columnWidths: Record<string, Record<string, number>>;
  setColumnWidth: (tableId: string, columnKey: string, width: number) => void;
  resetColumnWidths: (tableId: string, columnKey?: string) => void;
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
      columnWidths: {},

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

      setColumnWidth: (tableId, columnKey, width) =>
        set((state) => ({
          columnWidths: {
            ...state.columnWidths,
            [tableId]: {
              ...(state.columnWidths[tableId] ?? {}),
              [columnKey]: Math.round(width),
            },
          },
        })),

      resetColumnWidths: (tableId, columnKey) =>
        set((state) => {
          if (columnKey) {
            const tableWidths = { ...(state.columnWidths[tableId] ?? {}) };
            delete tableWidths[columnKey];
            return {
              columnWidths: {
                ...state.columnWidths,
                [tableId]: Object.keys(tableWidths).length > 0 ? tableWidths : {},
              },
            };
          }
          const newWidths = { ...state.columnWidths };
          delete newWidths[tableId];
          return { columnWidths: newWidths };
        }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        themeMode: state.themeMode,
        columnWidths: state.columnWidths,
      }),
    }
  )
);
