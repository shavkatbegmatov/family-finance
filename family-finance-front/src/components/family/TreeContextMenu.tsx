import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Plus, Eye, RefreshCw, Trash2 } from 'lucide-react';

interface TreeContextMenuProps {
  x: number;
  y: number;
  isRoot: boolean;
  onEdit: () => void;
  onAddRelation: () => void;
  onViewTree: () => void;
  onChangeType: () => void;
  onDeleteRelation: () => void;
  onClose: () => void;
}

export function TreeContextMenu({
  x,
  y,
  isRoot,
  onEdit,
  onAddRelation,
  onViewTree,
  onChangeType,
  onDeleteRelation,
  onClose,
}: TreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Menyu pozitsiyasini ekran chegaralarida tutish
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (rect.right > vw) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > vh) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[10000] min-w-[200px] bg-base-100 border border-base-300 rounded-xl shadow-xl py-1.5 animate-scale-in"
      style={{ left: x, top: y }}
    >
      {/* Tahrirlash */}
      <button
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors text-left"
        onClick={onEdit}
      >
        <Edit2 className="h-4 w-4 text-base-content/60" />
        Tahrirlash
      </button>

      {/* Qarindosh qo'shish */}
      <button
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors text-left"
        onClick={onAddRelation}
      >
        <Plus className="h-4 w-4 text-base-content/60" />
        Qarindosh qo&apos;shish
      </button>

      {/* Daraxtni ko'rish — faqat root bo'lmagan node'lar uchun */}
      {!isRoot && (
        <button
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors text-left"
          onClick={onViewTree}
        >
          <Eye className="h-4 w-4 text-base-content/60" />
          Daraxtni ko&apos;rish
        </button>
      )}

      {/* Separator */}
      {!isRoot && <div className="my-1.5 border-t border-base-200" />}

      {/* Munosabat turini o'zgartirish */}
      {!isRoot && (
        <button
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors text-left"
          onClick={onChangeType}
        >
          <RefreshCw className="h-4 w-4 text-base-content/60" />
          Turni o&apos;zgartirish
        </button>
      )}

      {/* Munosabatni o'chirish */}
      {!isRoot && (
        <button
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-error/10 transition-colors text-left text-error"
          onClick={onDeleteRelation}
        >
          <Trash2 className="h-4 w-4" />
          Munosabatni o&apos;chirish
        </button>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
