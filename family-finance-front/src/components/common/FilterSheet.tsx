import { ReactNode } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import clsx from 'clsx';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  children: ReactNode;
  title?: string;
}

/**
 * Filter panel component.
 * Mobile: bottom sheet overlay.
 * Desktop: inline collapsible panel.
 */
export function FilterSheet({
  isOpen,
  onClose,
  onClear,
  hasActiveFilters,
  children,
  title = 'Filtrlar',
}: FilterSheetProps) {
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  // Desktop: inline panel (existing behavior)
  if (!isMobile) {
    return (
      <div className="border-b border-base-200 p-4 surface-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
          {children}
          {hasActiveFilters && onClear && (
            <button
              className="btn btn-ghost btn-sm text-error"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
              Tozalash
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mobile: bottom sheet
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] max-h-[80vh] overflow-y-auto rounded-t-2xl bg-base-100 shadow-2xl animate-slide-up safe-area-bottom">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-base-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{title}</span>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter fields */}
        <div className="flex flex-col gap-4 p-4">
          {children}
        </div>

        {/* Footer actions */}
        <div className={clsx(
          'sticky bottom-0 flex gap-3 border-t border-base-200 bg-base-100 p-4',
          !hasActiveFilters && 'justify-end'
        )}>
          {hasActiveFilters && onClear && (
            <button
              className="btn btn-ghost btn-sm flex-1 text-error"
              onClick={() => { onClear(); onClose(); }}
            >
              Tozalash
            </button>
          )}
          <button
            className="btn btn-primary btn-sm flex-1"
            onClick={onClose}
          >
            Qo'llash
          </button>
        </div>
      </div>
    </>
  );
}
