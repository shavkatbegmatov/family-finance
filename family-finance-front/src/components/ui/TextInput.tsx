import { useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
  leadingIcon?: React.ReactNode;
  showClear?: boolean;
  type?: 'text' | 'url' | 'email';
  maxLength?: number;
  autoFocus?: boolean;
}

export function TextInput({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  error,
  className,
  required,
  leadingIcon,
  showClear = true,
  type = 'text',
  maxLength,
  autoFocus,
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value.length > 0;

  const handleClear = () => {
    onChange('');
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
          'relative flex items-center rounded-xl border bg-base-100 transition-all duration-200 h-12 cursor-text',
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
          <div className="absolute left-3 text-base-content/40">
            {leadingIcon}
          </div>
        )}

        <input
          ref={inputRef}
          type={type}
          className={clsx(
            'w-full bg-transparent py-3 pr-10 text-sm font-medium outline-none',
            'placeholder:text-base-content/40 placeholder:font-normal',
            leadingIcon ? 'pl-10' : 'pl-4'
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoFocus={autoFocus}
          aria-label={label}
          aria-invalid={!!error}
        />

        {showClear && hasValue && !disabled && (
          <button
            type="button"
            className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={handleClear}
            aria-label="Tozalash"
          >
            <X className="h-4 w-4" />
          </button>
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
