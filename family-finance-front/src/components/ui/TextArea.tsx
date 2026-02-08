import { useRef, useState } from 'react';
import clsx from 'clsx';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
}

export function TextArea({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  error,
  className,
  required,
  rows = 3,
  maxLength,
}: TextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className={clsx('form-control', className)}>
      {label && (
        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          {label} {required && <span className="text-error">*</span>}
        </span>
      )}

      <div
        className={clsx(
          'relative rounded-xl border bg-base-200/50 transition-all duration-200 cursor-text',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
        onClick={() => textareaRef.current?.focus()}
      >
        <textarea
          ref={textareaRef}
          className={clsx(
            'w-full bg-transparent px-4 py-3 text-sm font-medium outline-none resize-none',
            'placeholder:text-base-content/40 placeholder:font-normal'
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          aria-label={label}
          aria-invalid={!!error}
        />

        {maxLength && (
          <div className="px-4 pb-2 text-right text-xs text-base-content/40">
            {value.length}/{maxLength}
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
