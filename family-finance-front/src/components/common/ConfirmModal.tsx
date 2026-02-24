import { AlertTriangle } from 'lucide-react';
import { ModalPortal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'error' | 'warning' | 'primary';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Tasdiqlash',
  confirmColor = 'error',
  loading = false,
}: ConfirmModalProps) {
  const colorMap = {
    error: 'btn-error',
    warning: 'btn-warning',
    primary: 'btn-primary',
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={loading ? () => {} : onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-base-100 p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-error/10">
            <AlertTriangle className="h-7 w-7 text-error" />
          </div>
          <h3 className="mt-4 text-lg font-bold">{title}</h3>
          <p className="mt-2 text-sm text-base-content/60">{message}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            className="btn btn-ghost flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Bekor qilish
          </button>
          <button
            className={`btn flex-1 ${colorMap[confirmColor]}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <span className="loading loading-spinner loading-sm" />}
            {confirmText}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
