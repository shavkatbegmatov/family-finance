import { useRef, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Mail, XCircle } from 'lucide-react';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailInput({
  value,
  onChange,
  onBlur,
  label,
  placeholder = 'email@example.com',
  disabled = false,
  error,
  className,
  required,
}: EmailInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedValue = value.trim();
  const hasValue = normalizedValue.length > 0;
  const isValid = hasValue && EMAIL_REGEX.test(normalizedValue);

  const handleBlur = () => {
    setIsFocused(false);
    onChange(normalizedValue);
    onBlur?.();
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
          'relative flex h-12 cursor-text items-center overflow-hidden rounded-xl border bg-base-200/50 transition-all duration-200',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'pointer-events-none bg-base-200 opacity-50'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="absolute left-3 text-base-content/40">
          <Mail className="h-5 w-5" />
        </div>

        <input
          ref={inputRef}
          type="email"
          autoComplete="email"
          className={clsx(
            'email-input-field h-full w-full rounded-[inherit] bg-transparent py-3 pl-10 pr-10 text-sm font-medium outline-none',
            'placeholder:font-normal placeholder:text-base-content/40'
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
          aria-invalid={!!error}
        />

        {hasValue && (
          <div
            className={clsx(
              'absolute right-3',
              isValid ? 'text-success' : error ? 'text-error' : 'text-base-content/35'
            )}
          >
            {isValid ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
        )}
      </div>

      {error && (
        <label className="label py-1">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
}
