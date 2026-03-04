import { useCallback } from 'react';
import clsx from 'clsx';

interface ResizeHandleProps {
  columnKey: string;
  isResizing: boolean;
  isActive: boolean;
  onResizeStart: (columnKey: string, startX: number) => void;
  onDoubleClick: () => void;
}

export function ResizeHandle({
  columnKey,
  isResizing,
  isActive,
  onResizeStart,
  onDoubleClick,
}: ResizeHandleProps) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onResizeStart(columnKey, e.clientX);
    },
    [columnKey, onResizeStart],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick();
    },
    [onDoubleClick],
  );

  return (
    <div
      className={clsx(
        'absolute right-0 top-0 bottom-0 w-[7px] -mr-[3px] z-30',
        'flex items-center justify-center cursor-col-resize',
        'group/resize',
        isResizing && !isActive && 'pointer-events-none',
      )}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      role="separator"
      aria-orientation="vertical"
      tabIndex={-1}
    >
      <div
        className={clsx(
          'rounded-full transition-all duration-150',
          isActive
            ? 'h-full w-[3px] bg-primary'
            : 'h-4 w-[2px] bg-base-content/15 group-hover/resize:bg-primary/60 group-hover/resize:h-6',
        )}
      />
    </div>
  );
}
