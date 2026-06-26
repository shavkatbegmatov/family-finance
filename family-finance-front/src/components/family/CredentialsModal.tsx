import { useState } from 'react';
import {
  Copy,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  ClipboardCopy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalPortal } from '../common/Modal';
import type { CredentialsInfo } from '../../types';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: CredentialsInfo | null;
}

/**
 * Yangi yaratilgan akkaunt kirish ma'lumotlari (login + vaqtinchalik parol).
 * Faqat bir marta ko'rsatiladi.
 */
export function CredentialsModal({ isOpen, onClose, credentials }: CredentialsModalProps) {
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Nusxalashda xatolik');
    }
  };

  const handleClose = () => {
    setShowCredPassword(false);
    onClose();
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={handleClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <KeyRound className="h-7 w-7 text-success" />
            </div>
            <h3 className="text-xl font-semibold">Kirish ma'lumotlari</h3>
            <p className="text-sm text-base-content/60 mt-1">
              {credentials?.message}
            </p>
          </div>

          <div className="space-y-3">
            {/* Username */}
            <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-base-content/50 font-medium">Login</p>
                <p className="font-mono font-semibold text-lg">{credentials?.username}</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleCopyToClipboard(credentials?.username || '', 'username')}
                title="Nusxa olish"
              >
                {copiedField === 'username' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password */}
            <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-base-content/50 font-medium">
                  {credentials?.mustChangePassword ? 'Vaqtinchalik parol' : 'Parol'}
                </p>
                <p className="font-mono font-semibold text-lg">
                  {showCredPassword
                    ? credentials?.temporaryPassword
                    : '•'.repeat(credentials?.temporaryPassword?.length || 8)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowCredPassword(!showCredPassword)}
                  title={showCredPassword ? 'Yashirish' : "Ko'rsatish"}
                >
                  {showCredPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopyToClipboard(credentials?.temporaryPassword || '', 'password')}
                  title="Nusxa olish"
                >
                  {copiedField === 'password' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Copy All */}
          <button
            className="btn btn-outline btn-sm w-full mt-3"
            onClick={() => handleCopyToClipboard(
              `Login: ${credentials?.username}\nParol: ${credentials?.temporaryPassword}`,
              'all'
            )}
          >
            {copiedField === 'all' ? (
              <>
                <Check className="h-4 w-4 text-success" />
                Nusxalandi!
              </>
            ) : (
              <>
                <ClipboardCopy className="h-4 w-4" />
                Hammasini nusxalash
              </>
            )}
          </button>

          <div className="alert alert-warning mt-4">
            <span className="text-sm">Bu ma'lumotlar faqat bir marta ko'rsatiladi. Oila a'zosiga yetkazing!</span>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              className="btn btn-primary"
              onClick={handleClose}
            >
              Tushunarli
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
