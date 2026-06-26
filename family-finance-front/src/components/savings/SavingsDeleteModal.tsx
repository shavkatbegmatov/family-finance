import { Trash2 } from 'lucide-react';
import { ModalPortal } from '../common/Modal';

interface SavingsDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Jamg'arma maqsadini o'chirish tasdiq modali. Tasdiq/bekor page orqali kechadi.
 */
export function SavingsDeleteModal({ isOpen, onClose, onConfirm }: SavingsDeleteModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl p-4 sm:p-6">
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-error/10 flex items-center justify-center mb-4">
            <Trash2 className="h-7 w-7 text-error" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Maqsadni o'chirish</h3>
          <p className="text-sm text-base-content/60 mb-6">
            Ushbu jamg'arma maqsadini o'chirishni xohlaysizmi? Barcha to'lovlar ham o'chiriladi.
          </p>
          <div className="flex gap-2 w-full">
            <button className="btn btn-ghost flex-1" onClick={onClose}>
              Bekor qilish
            </button>
            <button className="btn btn-error flex-1" onClick={onConfirm}>
              O'chirish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
