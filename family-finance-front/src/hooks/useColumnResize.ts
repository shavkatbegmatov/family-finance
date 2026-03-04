import { useState, useCallback, useRef, useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResizableColumnConfig {
  key: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  className?: string;
}

export interface UseColumnResizeOptions {
  tableId?: string;
  columns: ResizableColumnConfig[];
  enabled: boolean;
}

export interface UseColumnResizeReturn {
  columnWidths: Record<string, number>;
  isResizing: boolean;
  resizingKey: string | null;
  handleResizeStart: (columnKey: string, startX: number) => void;
  resetColumnWidth: (columnKey: string) => void;
  resetAllWidths: () => void;
  hasCustomWidths: boolean;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Parse Tailwind width class to pixels: w-[220px]→220, w-52→208, w-28→112 */
export function parseTailwindWidth(className?: string): number | null {
  if (!className) return null;
  // w-[Npx] pattern
  const arbitrary = className.match(/w-\[(\d+)px\]/);
  if (arbitrary) return parseInt(arbitrary[1], 10);
  // w-N (Tailwind spacing scale: N * 4px)
  const scale = className.match(/\bw-(\d+)\b/);
  if (scale) return parseInt(scale[1], 10) * 4;
  return null;
}

/** Strip width-related Tailwind classes, keep everything else */
export function stripWidthClasses(className?: string): string {
  if (!className) return '';
  return className
    .split(/\s+/)
    .filter((cls) => !/^(w-|min-w-|max-w-)/.test(cls))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MIN_WIDTH = 50;
const DEFAULT_MAX_WIDTH = 800;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useColumnResize({
  tableId,
  columns,
  enabled,
}: UseColumnResizeOptions): UseColumnResizeReturn {
  // Zustand store
  const storedWidths = useUIStore((s) => (tableId ? s.columnWidths[tableId] : undefined));
  const setStoreWidth = useUIStore((s) => s.setColumnWidth);
  const resetStoreWidths = useUIStore((s) => s.resetColumnWidths);

  // Compute default widths from column config
  const getDefaultWidths = useCallback((): Record<string, number> => {
    const defaults: Record<string, number> = {};
    for (const col of columns) {
      if (col.width) {
        defaults[col.key] = col.width;
      } else {
        const parsed = parseTailwindWidth(col.className);
        if (parsed) defaults[col.key] = parsed;
        // If no width found, we skip — table-fixed will auto-distribute
      }
    }
    return defaults;
  }, [columns]);

  // Local widths state — merge stored + defaults
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const defaults = getDefaultWidths();
    return { ...defaults, ...(storedWidths ?? {}) };
  });

  // Sync when stored widths change externally
  useEffect(() => {
    if (storedWidths) {
      setColumnWidths((prev) => ({ ...prev, ...storedWidths }));
    }
  }, [storedWidths]);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizingKey, setResizingKey] = useState<string | null>(null);

  // Refs for pointer tracking (avoid stale closures)
  const widthsRef = useRef(columnWidths);
  widthsRef.current = columnWidths;

  const rafRef = useRef<number | null>(null);

  // Check if user has customized any widths
  const hasCustomWidths = !!(tableId && storedWidths && Object.keys(storedWidths).length > 0);

  // -------------------------------------------------------------------
  // Resize handlers
  // -------------------------------------------------------------------

  const handleResizeStart = useCallback(
    (columnKey: string, startX: number) => {
      if (!enabled) return;

      const col = columns.find((c) => c.key === columnKey);
      if (!col || col.resizable === false) return;

      const startWidth = widthsRef.current[columnKey] ?? 150;
      const minW = col.minWidth ?? DEFAULT_MIN_WIDTH;
      const maxW = col.maxWidth ?? DEFAULT_MAX_WIDTH;

      setIsResizing(true);
      setResizingKey(columnKey);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMove = (e: PointerEvent) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const delta = e.clientX - startX;
          const newWidth = Math.round(Math.min(maxW, Math.max(minW, startWidth + delta)));
          setColumnWidths((prev) => ({ ...prev, [columnKey]: newWidth }));
        });
      };

      const handleUp = () => {
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }

        setIsResizing(false);
        setResizingKey(null);

        // Persist
        if (tableId) {
          // Read latest width from ref after RAF
          const finalWidth = widthsRef.current[columnKey];
          if (finalWidth != null) {
            setStoreWidth(tableId, columnKey, finalWidth);
          }
        }
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [enabled, columns, tableId, setStoreWidth],
  );

  // -------------------------------------------------------------------
  // Reset handlers
  // -------------------------------------------------------------------

  const resetColumnWidth = useCallback(
    (columnKey: string) => {
      const defaults = getDefaultWidths();
      const defaultWidth = defaults[columnKey];
      if (defaultWidth != null) {
        setColumnWidths((prev) => ({ ...prev, [columnKey]: defaultWidth }));
      } else {
        // Remove the key entirely
        setColumnWidths((prev) => {
          const next = { ...prev };
          delete next[columnKey];
          return next;
        });
      }
      if (tableId) resetStoreWidths(tableId, columnKey);
    },
    [getDefaultWidths, tableId, resetStoreWidths],
  );

  const resetAllWidths = useCallback(() => {
    const defaults = getDefaultWidths();
    setColumnWidths(defaults);
    if (tableId) resetStoreWidths(tableId);
  }, [getDefaultWidths, tableId, resetStoreWidths]);

  return {
    columnWidths,
    isResizing,
    resizingKey,
    handleResizeStart,
    resetColumnWidth,
    resetAllWidths,
    hasCustomWidths,
  };
}
