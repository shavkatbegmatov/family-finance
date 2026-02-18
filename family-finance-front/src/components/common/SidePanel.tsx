import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  pinned?: boolean;
}

export function SidePanel({ isOpen, onClose, children, pinned = false }: SidePanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Pinned rejim — portal va backdrop yo'q
  if (pinned) {
    return (
      <div className="h-full w-full sm:w-[360px] bg-base-100 shadow-2xl overflow-y-auto animate-slide-in-right shrink-0">
        {children}
      </div>
    );
  }

  // Overlay rejim (default)
  const content = (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/15 animate-fade-in" />
      {/* Panel */}
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[360px] bg-base-100 shadow-2xl overflow-y-auto animate-slide-in-right pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
