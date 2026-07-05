import { useEffect, useState } from 'react';
import { Users, Home, X, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { scopesApi } from '../../api/scopes.api';
import { ModalPortal } from '../common/Modal';
import { getApiErrorMessage } from '../../utils/apiError';
import { getScopeTypeMeta } from './scopeTypeMeta';

interface JoinFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: () => void;
}

/**
 * Login qilingan user invite code orqali boshqa oilaga ko'chish modal'i.
 * - Real-time kod preview
 * - Eski auto-yaratilgan clan'ni arxivlash uchun checkbox
 */
export function JoinFamilyModal({ isOpen, onClose, onJoined }: JoinFamilyModalProps) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<{ name: string; type: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [archiveOldGroup, setArchiveOldGroup] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const trimmed = code.trim();
    if (trimmed.length < 6) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await scopesApi.lookupByCode(trimmed);
        setPreview({ name: res.data.data.name, type: res.data.data.type });
        setPreviewError(null);
      } catch {
        setPreview(null);
        setPreviewError("Kod topilmadi yoki bekor qilingan");
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code]);

  const handleJoin = async () => {
    if (!preview || !code.trim()) {
      toast.error("To'g'ri kod kiriting");
      return;
    }
    setSubmitting(true);
    try {
      await scopesApi.joinByCode(code.trim(), archiveOldGroup);
      toast.success(`"${preview.name}" oilaga muvaffaqiyatli qo'shildingiz!`);
      onJoined();
      onClose();
      // Page reload — barcha scope-related ma'lumotlar yangilanadi
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Qo'shilishda xatolik"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={submitting ? () => {} : onClose}>
      <div className="surface-card max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5 text-primary" />
            Boshqa oilaga qo'shilish
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-square btn-sm" disabled={submitting}>
            <X className="h-5 w-5" />
          </button>
        </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-base-content/60">
              Oila a'zosidan olgan taklif kodingizni kiriting:
            </p>

            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Masalan: CABC234DEF"
                autoComplete="off"
                maxLength={32}
                className={`input input-bordered w-full uppercase tracking-wider ${
                  previewError ? 'input-error' : preview ? 'input-success' : ''
                }`}
                disabled={submitting}
              />
              {previewLoading && (
                <div className="mt-2 text-xs text-base-content/60 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Tekshirilmoqda...
                </div>
              )}
              {preview && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                  <Home className="h-4 w-4" />
                  <span>
                    <strong>{preview.name}</strong> ({getScopeTypeMeta(preview.type).label})
                  </span>
                </div>
              )}
              {previewError && (
                <div className="mt-2 text-xs text-error">{previewError}</div>
              )}
            </div>

            <div className="rounded-lg bg-warning/10 p-3 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-warning mb-1">Diqqat:</p>
                  <ul className="list-disc list-inside text-base-content/70 space-y-1">
                    <li>Yangi oilaga MEMBER bo'lib qo'shilasiz</li>
                    <li>Hozirgi tranzaksiyalar va hisoblaringiz saqlanadi</li>
                    <li>Aktiv scope avtomatik yangi oilaga o'zgartiriladi</li>
                  </ul>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={archiveOldGroup}
                onChange={(e) => setArchiveOldGroup(e.target.checked)}
                className="checkbox checkbox-sm mt-0.5"
                disabled={submitting}
              />
              <span>
                Eski avtomatik yaratilgan oilamni arxivlash
                <span className="block text-xs text-base-content/50">
                  (faqat bo'sh va siz yagona OWNER bo'lsangiz)
                </span>
              </span>
            </label>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="btn btn-ghost flex-1" disabled={submitting}>
              Bekor qilish
            </button>
            <button
              onClick={handleJoin}
              className="btn btn-primary flex-1"
              disabled={submitting || !preview || !!previewError}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Qo'shilmoqda...
                </>
              ) : (
                "Qo'shilish"
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
