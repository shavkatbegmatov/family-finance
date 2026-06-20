import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Check, X } from 'lucide-react';
import { evaluatePasswordStrength, PASSWORD_MIN_LENGTH } from '../../utils/password';
import { isPasswordPwned } from '../../utils/hibp';

interface PasswordStrengthMeterProps {
  password: string;
  /** Mezonlar checklist'ini ham ko'rsatish (uzunlik, katta/kichik harf, raqam). */
  showRequirements?: boolean;
  /** HIBP buzilgan-parol tekshiruvi (debounced, advisory). Default: true. */
  checkPwned?: boolean;
  className?: string;
}

/**
 * Parol kuchi indikatori (progress bar + baho + ixtiyoriy mezonlar checklist'i + HIBP advisory).
 *
 * Strength-tekshiruvi yagona {@link evaluatePasswordStrength} manbasiga tayanadi. Buzilgan-parol
 * ogohlantirishi {@link isPasswordPwned} (HIBP k-anonymity) bilan — debounced va faqat MASLAHAT
 * (backend PwnedPasswordService baribir majburiy tekshiradi).
 */
export function PasswordStrengthMeter({
  password,
  showRequirements = false,
  checkPwned = true,
  className,
}: PasswordStrengthMeterProps) {
  const [pwned, setPwned] = useState(false);

  useEffect(() => {
    setPwned(false); // yangi parol — eski ogohlantirishni darhol olib tashlash
    // Faqat min-uzunlikka yetgan parolni tekshiramiz (terish paytidagi keraksiz so'rovlarni kamaytiradi)
    if (!checkPwned || password.length < PASSWORD_MIN_LENGTH) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      isPasswordPwned(password, controller.signal).then(setPwned).catch(() => {});
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [password, checkPwned]);

  if (!password) return null;

  const strength = evaluatePasswordStrength(password);

  return (
    <div className={clsx('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-base-300 rounded-full overflow-hidden">
          <div
            className={clsx('h-full transition-all duration-300', strength.colorClass)}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
        <span className={clsx('text-xs font-medium', strength.textColorClass)}>
          {strength.label}
        </span>
      </div>

      {showRequirements && (
        <div className="grid grid-cols-2 gap-1.5">
          {strength.requirements.map((req) => (
            <div
              key={req.key}
              className={clsx(
                'flex items-center gap-1.5 text-xs',
                req.met ? 'text-success' : 'text-base-content/50'
              )}
            >
              {req.met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}

      {pwned && (
        <div className="flex items-start gap-1.5 text-xs text-error">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Bu parol ommaviy ma'lumotlar sizishida topilgan — boshqa, noyob parol tanlang.</span>
        </div>
      )}
    </div>
  );
}
