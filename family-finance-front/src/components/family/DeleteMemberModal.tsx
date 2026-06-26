import { Trash2 } from 'lucide-react';
import { ModalPortal } from '../common/Modal';

interface DeleteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Oila a'zosini o'chirishni tasdiqlash modali. */
export function DeleteMemberModal({ isOpen, onClose, onConfirm }: DeleteMemberModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <Trash2 className="h-7 w-7 text-error" />
          </div>
          <h3 className="text-lg font-semibold mb-2">A'zoni o'chirish</h3>
          <p className="text-sm text-base-content/60 mb-6">
            Haqiqatan ham bu oila a'zosini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
          </p>
          <div className="flex justify-center gap-3">
            <button
              className="btn btn-ghost"
              onClick={onClose}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-error"
              onClick={onConfirm}
            >
              O'chirish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
