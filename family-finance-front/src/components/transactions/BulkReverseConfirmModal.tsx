import { X, Trash2 } from 'lucide-react';
import { ModalPortal } from '../common/Modal';

interface BulkReverseConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  processing: boolean;
  onConfirm: () => void;
}

/**
 * Bulk storno tasdiq modali. Original TransactionsPage'dagi xulq AYNAN saqlangan.
 */
export function BulkReverseConfirmModal({
  isOpen,
  onClose,
  selectedCount,
  processing,
  onConfirm,
}: BulkReverseConfirmModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-warning" />
            </div>
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {selectedCount} ta tranzaksiyani storno qilish
          </h3>
          <p className="text-sm text-base-content/60 mb-4">
            Tanlangan barcha tranzaksiyalar uchun teskari operatsiya yaratiladi.
            Bu amalni qaytarib bo'lmaydi.
          </p>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              onClick={onClose}
              disabled={processing}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-warning"
              onClick={onConfirm}
              disabled={processing}
            >
              {processing && <span className="loading loading-spinner loading-sm" />}
              Storno qilish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
