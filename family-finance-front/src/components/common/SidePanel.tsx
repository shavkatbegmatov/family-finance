import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function SidePanel({ isOpen, onClose, children }: SidePanelProps) {
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

  const content = (
    <div className="fixed inset-0 z-[9998]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/15 animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-base-100 shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
