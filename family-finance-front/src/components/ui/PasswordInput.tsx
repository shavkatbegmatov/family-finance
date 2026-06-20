import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';
import { generateStrongPassword } from '../../utils/password';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
  /** HTML autocomplete (login formada "current-password", aks holda "new-password"). */
  autoComplete?: string;
  /** Boshlovchi ikonka (default: kalit). null bersangiz ikonkasiz. */
  leadingIcon?: React.ReactNode;
  /** Parol kuchi indikatori (progress bar + baho). Faqat qiymat bor bo'lsa ko'rinadi. */
  showStrength?: boolean;
  /** Mezonlar checklist'i (uzunlik, katta/kichik harf, raqam). */
  showRequirements?: boolean;
  /** Tasodifiy kuchli parol generatsiya tugmasi. */
  showGenerate?: boolean;
}

/**
 * Markazlashtirilgan parol kiritish komponenti: ko'rsatish/yashirish (eye),
 * ixtiyoriy generatsiya tugmasi, kuch indikatori va mezonlar checklist'i.
 *
 * Parol siyosati uchun yagona manba — {@link evaluatePasswordStrength}.
 */
export function PasswordInput({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  error,
  className,
  required,
  autoFocus,
  autoComplete = 'new-password',
  leadingIcon = <KeyRound className="h-5 w-5" />,
  showStrength = false,
  showRequirements = false,
  showGenerate = false,
}: PasswordInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    onChange(generateStrongPassword());
    setVisible(true);
    inputRef.current?.focus();
  };

  return (
    <div className={clsx('form-control', className)}>
      {label && (
        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          {label} {required && <span className="text-error">*</span>}
        </span>
      )}

      <div
        className={clsx(
          'relative flex items-center rounded-xl border bg-base-200/50 transition-all duration-200 h-12 cursor-text',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {leadingIcon && (
          <div className="absolute left-3 text-base-content/40">{leadingIcon}</div>
        )}

        <input
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          className={clsx(
            'w-full bg-transparent py-3 text-sm font-medium outline-none',
            'placeholder:text-base-content/40 placeholder:font-normal',
            leadingIcon ? 'pl-10' : 'pl-4',
            showGenerate ? 'pr-20' : 'pr-12'
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          aria-label={label}
          aria-invalid={!!error}
        />

        <div className="absolute right-2 flex items-center gap-0.5">
          {showGenerate && !disabled && (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base-content/40 transition-colors hover:bg-base-200 hover:text-primary"
              onClick={handleGenerate}
              title="Kuchli parol generatsiya qilish"
              aria-label="Kuchli parol generatsiya qilish"
              tabIndex={-1}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={() => setVisible((v) => !v)}
            title={visible ? 'Parolni yashirish' : "Parolni ko'rsatish"}
            aria-label={visible ? 'Parolni yashirish' : "Parolni ko'rsatish"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {(showStrength || showRequirements) && (
        <PasswordStrengthMeter
          password={value}
          showRequirements={showRequirements}
          className="mt-2"
        />
      )}

      {error && (
        <label className="label py-1">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
}
