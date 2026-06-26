import { X, Copy, AlertTriangle, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalPortal } from '../common/Modal';
import type { CredentialsInfo } from '../../types';
import type { UserDetail } from '../../api/users.api';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: UserDetail | null;
  /** Reset bajarilgach to'lgan credentials — bo'lsa natija ekrani ko'rsatiladi. */
  credentials: CredentialsInfo | null;
  onReset: () => void;
  isResetting: boolean;
}

/** Parolni tiklash — tasdiqlash bosqichi va so'ngra bir martalik credentials ko'rsatish. */
export function PasswordResetModal({
  isOpen,
  onClose,
  selectedUser,
  credentials,
  onReset,
  isResetting,
}: PasswordResetModalProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Nusxalandi');
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="modal modal-open" onClick={onClose}>
        <div className="modal-box max-w-md p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
          <h3 className="mb-4 text-lg font-bold">Parolni tiklash</h3>

          {credentials ? (
            /* Show credentials after reset */
            <div className="space-y-4">
              <div className="alert alert-warning">
                <AlertTriangle className="h-4 w-4" />
                <span>Bu parol faqat bir marta ko'rsatiladi!</span>
              </div>

              <div className="rounded-lg bg-base-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-base-content/50">Username</span>
                    <p className="font-mono font-bold">{credentials.username}</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyToClipboard(credentials.username)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-base-content/50">Yangi parol</span>
                    <p className="font-mono font-bold text-primary">
                      {credentials.temporaryPassword}
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyToClipboard(credentials.temporaryPassword)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-base-content/60">{credentials.message}</p>

              <div className="modal-action">
                <button className="btn btn-primary btn-sm" onClick={onClose}>
                  Yopish
                </button>
              </div>
            </div>
          ) : (
            /* Confirmation before reset */
            <div className="space-y-4">
              <p className="text-sm">
                <strong>{selectedUser?.fullName}</strong> (@{selectedUser?.username})
                ning parolini tiklashni xohlaysizmi?
              </p>
              <p className="text-xs text-base-content/60">
                Yangi vaqtinchalik parol yaratiladi. Foydalanuvchi keyingi kirishda parolni o'zgartirishi kerak bo'ladi.
              </p>

              <div className="modal-action">
                <button className="btn btn-ghost btn-sm" onClick={onClose}>
                  Bekor qilish
                </button>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={onReset}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Key className="h-3.5 w-3.5" />
                  )}
                  Parolni tiklash
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
