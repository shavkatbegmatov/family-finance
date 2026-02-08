import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Calendar, X } from 'lucide-react';
import { getTashkentToday } from '../../config/constants';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
  min?: string;
  max?: string;
  showTodayButton?: boolean;
  showClear?: boolean;
}

export function DateInput({
  value,
  onChange,
  label,
  placeholder = 'Sanani tanlang',
  disabled = false,
  error,
  className,
  required,
  min,
  max,
  showTodayButton = true,
  showClear = true,
}: DateInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value.length > 0;

  const handleToday = () => {
    onChange(getTashkentToday());
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleWrapperClick = () => {
    inputRef.current?.showPicker?.();
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
          'relative flex items-center rounded-xl border bg-base-200/50 transition-all duration-200 h-12 cursor-pointer',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
        onClick={handleWrapperClick}
      >
        <div className="absolute left-3 text-base-content/40">
          <Calendar className="h-5 w-5" />
        </div>

        <input
          ref={inputRef}
          type="date"
          className={clsx(
            'w-full bg-transparent py-3 pl-10 pr-20 text-sm font-medium outline-none',
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer',
            !hasValue && 'text-base-content/40'
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          aria-label={label}
          aria-invalid={!!error}
        />

        <div className="absolute right-2 flex items-center gap-1 z-10">
          {showTodayButton && !hasValue && !disabled && (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-primary font-medium"
              onClick={(e) => {
                e.stopPropagation();
                handleToday();
              }}
            >
              Bugun
            </button>
          )}
          {showClear && hasValue && !disabled && (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              aria-label="Tozalash"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <label className="label py-1">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
}
