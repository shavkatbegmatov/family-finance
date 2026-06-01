import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AtSign, Check, Loader2, Wand2, X } from 'lucide-react';
import { usersApi } from '../../api/users.api';

/** Backend USERNAME_PATTERN bilan izchil: lotin harf/raqam/nuqta/pastki chiziq, 3-30 belgi. */
const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;
const CHECK_DEBOUNCE_MS = 450;

type Status = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  /**
   * Login holati (bo'sh/band/bo'sh-emas) o'zgarganda chaqiriladi.
   * `true` — submit qilsa bo'ladi (bo'sh = avto, yoki band emas);
   * `false` — submit bloklanishi kerak (format xato yoki band).
   */
  onValidityChange?: (valid: boolean) => void;
}

/**
 * Login (username) kiritish komponenti — qo'lda kiritish uchun.
 * Bo'sh qoldirilsa backend ism asosida avtomatik yaratadi. Yozilganda real-time
 * (debounce bilan) band-emasligi tekshiriladi va vizual belgi ko'rsatiladi.
 */
export function UsernameInput({
  value,
  onChange,
  label = 'Login',
  disabled = false,
  className,
  required,
  onValidityChange,
}: UsernameInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  // onValidityChange'ni ref orqali ushlaymiz — effekt dependency'siga qo'shib cheksiz
  // qayta ishga tushirmaslik uchun.
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;

  const trimmed = value.trim();
  const isEmpty = trimmed.length === 0;
  const formatValid = USERNAME_REGEX.test(trimmed);

  useEffect(() => {
    const notify = (valid: boolean) => onValidityChangeRef.current?.(valid);

    if (isEmpty) {
      setStatus('idle');
      notify(true); // bo'sh = avtomatik generatsiya = ruxsat
      return;
    }
    if (!formatValid) {
      setStatus('invalid');
      notify(false);
      return;
    }

    setStatus('checking');
    notify(false); // tekshirilguncha submit'ni bloklaymiz
    const handle = setTimeout(async () => {
      try {
        const available = await usersApi.checkUsername(trimmed);
        setStatus(available ? 'available' : 'taken');
        notify(available);
      } catch {
        // Tekshira olmadik (masalan ruxsat yo'q) — submit'ni bloklamaymiz, backend baribir tekshiradi
        setStatus('error');
        notify(true);
      }
    }, CHECK_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [trimmed, isEmpty, formatValid]);

  const hasError = status === 'invalid' || status === 'taken';

  return (
    <div className={clsx('form-control', className)}>
      {label && (
        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          {label} {required && <span className="text-error">*</span>}
        </span>
      )}

      <div
        className={clsx(
          'relative flex items-center rounded-xl border bg-base-200/50 transition-all duration-200 h-12',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : hasError
              ? 'border-error'
              : status === 'available'
                ? 'border-success'
                : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
      >
        <div className="absolute left-3 text-base-content/40">
          <AtSign className="h-5 w-5" />
        </div>

        <input
          type="text"
          className="w-full bg-transparent py-3 pl-10 pr-10 text-sm font-medium outline-none placeholder:text-base-content/40 placeholder:font-normal"
          // Login har doim kichik harf — backend ham shunday normallashtiradi
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Bo'sh qolsa: ism asosida avtomatik"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-label={label}
          aria-invalid={hasError}
        />

        <div className="absolute right-3 flex items-center">
          {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-base-content/40" />}
          {status === 'available' && <Check className="h-4 w-4 text-success" />}
          {(status === 'taken' || status === 'invalid') && <X className="h-4 w-4 text-error" />}
        </div>
      </div>

      <p
        className={clsx(
          'mt-1 flex items-center gap-1 text-xs',
          hasError ? 'text-error' : 'text-base-content/50'
        )}
      >
        {status === 'idle' && (
          <>
            <Wand2 className="h-3 w-3" />
            Bo'sh qolsa, ism asosida avtomatik yaratiladi
          </>
        )}
        {status === 'invalid' && '3-30 belgi: kichik lotin harf, raqam, nuqta yoki pastki chiziq'}
        {status === 'checking' && 'Tekshirilmoqda...'}
        {status === 'available' && <span className="text-success">Bu login bo'sh</span>}
        {status === 'taken' && 'Bu login allaqachon band'}
        {status === 'error' && 'Login saqlashda tekshiriladi'}
      </p>
    </div>
  );
}
