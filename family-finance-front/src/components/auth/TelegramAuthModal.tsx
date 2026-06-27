import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import {
  GENDERS,
  TELEGRAM_BOT_USERNAME,
  telegramDeepLink,
  TELEGRAM_POLL_INTERVAL_MS,
  TELEGRAM_POLL_TIMEOUT_MS,
} from '../../config/constants';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Gender, JwtResponse } from '../../types';

interface TelegramAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = 'starting' | 'waiting' | 'register' | 'submitting';

/**
 * Telegram deep-link orqali kirish/ro'yxatdan o'tish modali.
 * init → deep-link ochish → status polling → (login | jins bilan ro'yxat formasi).
 */
export function TelegramAuthModal({ isOpen, onClose }: TelegramAuthModalProps) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phase, setPhase] = useState<Phase>('starting');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [inviteCode, setInviteCode] = useState('');

  const applyJwt = (jwt: JwtResponse) => {
    setAuth(
      { ...jwt.user, mustChangePassword: jwt.requiresPasswordChange || false },
      jwt.accessToken,
      jwt.refreshToken,
      jwt.permissions,
      jwt.roles,
    );
    toast.success('Muvaffaqiyatli kirildi!');
    navigate('/', { replace: true });
  };

  // Modal ochilganda: init → deep-link → status polling (deadline'gacha)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    setPhase('starting');
    setRequestId(null);
    setGender('');
    setInviteCode('');

    const pollStatus = (id: string) => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        if (Date.now() - startedAt > TELEGRAM_POLL_TIMEOUT_MS) {
          toast.error("Vaqt tugadi. Qaytadan urinib ko'ring.");
          onClose();
          return;
        }
        try {
          const res = await authApi.telegramStatus(id);
          if (cancelled) return;
          if (res.status === 'AUTHENTICATED' && res.jwt) {
            applyJwt(res.jwt);
            return;
          }
          if (res.status === 'NEEDS_REGISTRATION') {
            setFirstName(res.firstName || '');
            setLastName(res.lastName || '');
            setPhase('register');
            return;
          }
          if (res.status === 'EXPIRED') {
            toast.error("Havola eskirdi. Qaytadan urinib ko'ring.");
            onClose();
            return;
          }
        } catch {
          // tarmoq xatosi — keyingi urinishda davom etadi
        }
        pollStatus(id);
      }, TELEGRAM_POLL_INTERVAL_MS);
    };

    (async () => {
      try {
        const { requestId: id } = await authApi.telegramInit();
        if (cancelled) return;
        setRequestId(id);
        setPhase('waiting');
        // Deep-link: web'da yangi tab, APK'da Capacitor WebView system'da ochadi
        window.open(telegramDeepLink(id), '_blank');
        pollStatus(id);
      } catch (e) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(e, 'Telegram bilan ulanishda xatolik'));
          onClose();
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleRegister = async () => {
    if (!requestId || !firstName.trim() || !gender) return;
    setPhase('submitting');
    try {
      const jwt = await authApi.telegramComplete({
        requestId,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        gender,
        inviteCode: inviteCode.trim() || undefined,
      });
      applyJwt(jwt);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Ro'yxatdan o'tishda xatolik"));
      setPhase('register');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Send className="h-5 w-5 text-[#229ED9]" />
            Telegram orqali kirish
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square" aria-label="Yopish">
            <X className="h-4 w-4" />
          </button>
        </div>

        {(phase === 'starting' || phase === 'waiting') && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-base-content/70">
              {phase === 'starting'
                ? 'Ulanmoqda...'
                : `@${TELEGRAM_BOT_USERNAME} botida "Start" tugmasini bosing va shu sahifaga qayting.`}
            </p>
            {phase === 'waiting' && requestId && (
              <a
                href={telegramDeepLink(requestId)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline gap-2"
              >
                <Send className="h-4 w-4" />
                Telegram&apos;ni qayta ochish
              </a>
            )}
          </div>
        )}

        {(phase === 'register' || phase === 'submitting') && (
          <div className="space-y-3">
            <p className="text-sm text-base-content/70">
              Tabriklaymiz! Ro&apos;yxatdan o&apos;tishni yakunlash uchun ma&apos;lumotlarni to&apos;ldiring:
            </p>
            <input
              className="input input-bordered w-full"
              placeholder="Ism *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="input input-bordered w-full"
              placeholder="Familiya"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <div>
              <span className="label-text text-sm">Jins *</span>
              <div className="mt-1 grid grid-cols-2 gap-3">
                {(['MALE', 'FEMALE'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`btn ${gender === g ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {GENDERS[g].label}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="input input-bordered w-full uppercase tracking-wider"
              placeholder="Oila taklif kodi (ixtiyoriy)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              maxLength={32}
            />
            <button
              className="btn btn-primary w-full"
              onClick={handleRegister}
              disabled={phase === 'submitting' || !firstName.trim() || !gender}
            >
              {phase === 'submitting' ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Ro'yxatdan o'tish"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
