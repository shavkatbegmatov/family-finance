import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import { evaluatePasswordStrength } from '../../utils/password';

interface PasswordStrengthMeterProps {
  password: string;
  /** Mezonlar checklist'ini ham ko'rsatish (uzunlik, katta/kichik harf, raqam). */
  showRequirements?: boolean;
  className?: string;
}

/**
 * Parol kuchi indikatori (progress bar + baho + ixtiyoriy mezonlar checklist'i).
 *
 * Strength-tekshiruvi avval bir nechta sahifada copy-paste qilingan edi; endi yagona
 * {@link evaluatePasswordStrength} manbasiga tayanadi. {@code PasswordInput} ham,
 * react-hook-form ishlatadigan self-service sahifalar ham shu komponentni ishlatadi.
 */
export function PasswordStrengthMeter({
  password,
  showRequirements = false,
  className,
}: PasswordStrengthMeterProps) {
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
    </div>
  );
}
