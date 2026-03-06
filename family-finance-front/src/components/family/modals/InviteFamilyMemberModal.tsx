import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AtSign, Info, UserPlus } from 'lucide-react';
import { ModalPortal } from '../../common/Modal';
import { TextInput } from '../../ui/TextInput';

interface InviteFamilyMemberModalProps {
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onInvite: (username: string) => Promise<void>;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
};

const normalizeUsername = (value: string) => value.trim().toLowerCase();

export function InviteFamilyMemberModal({
  isOpen,
  loading = false,
  onClose,
  onInvite,
}: InviteFamilyMemberModalProps) {
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setSubmitted(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const hasWhitespace = /\s/.test(username);

  const validationError = useMemo(() => {
    if (!submitted && username.length === 0) return null;
    if (!normalizedUsername) return "Username kiritilishi shart";
    if (hasWhitespace) return "Username ichida bo'sh joy bo'lmasligi kerak";
    if (normalizedUsername.length < 3) return "Username kamida 3 belgidan iborat bo'lishi kerak";
    return null;
  }, [submitted, username.length, normalizedUsername, hasWhitespace]);

  const canSubmit = Boolean(!loading && normalizedUsername && !validationError);
  const inputError = submitError || validationError || undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);

    if (!normalizedUsername || hasWhitespace || normalizedUsername.length < 3) {
      return;
    }

    try {
      await onInvite(normalizedUsername);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "A'zoni qo'shishda xatolik yuz berdi"));
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={loading ? () => {} : onClose}>
      <form className="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl" onSubmit={handleSubmit}>
        <div className="mb-5 flex items-start gap-3">
          <div className="mt-0.5 grid h-11 w-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">A'zo qo'shish</h3>
            <p className="mt-1 text-sm text-base-content/60">
              Guruhga qo'shish uchun foydalanuvchining loginini kiriting.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <TextInput
            label="Foydalanuvchi logini"
            placeholder="Masalan: 998901234567 yoki akmal_01"
            value={username}
            onChange={(value) => {
              setUsername(value);
              if (submitError) setSubmitError(null);
            }}
            leadingIcon={<AtSign className="h-4 w-4" />}
            error={inputError}
            maxLength={50}
            autoFocus
            disabled={loading}
            required
          />

          {normalizedUsername && !inputError && (
            <div className="rounded-lg border border-base-300 bg-base-200/50 px-3 py-2 text-xs text-base-content/60">
              Qo'shiladigan login: <span className="font-mono font-semibold text-base-content">@{normalizedUsername}</span>
            </div>
          )}

          <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-xs text-base-content/70">
            <p className="flex items-center gap-2 font-medium text-info">
              <Info className="h-3.5 w-3.5" />
              Eslatma
            </p>
            <p className="mt-1">Faqat tizimda ro'yxatdan o'tgan foydalanuvchi loginini kiriting.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit}
          >
            {loading && <span className="loading loading-spinner loading-xs" />}
            Qo'shish
          </button>
        </div>
      </form>
    </ModalPortal>
  );
}
