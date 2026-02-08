import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
  addMonths,
  subMonths,
  getYear,
  getMonth,
  setMonth,
  setYear,
  parse,
  isValid,
} from 'date-fns';
import { getTashkentToday } from '../../config/constants';

// ==================== CONSTANTS ====================

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const MONTHS_SHORT = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
  'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
];

const WEEKDAYS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'];

const DROPDOWN_OFFSET = 2;
const VIEWPORT_MARGIN = 8;

type ViewMode = 'days' | 'months' | 'years';

// ==================== PROPS ====================

interface DatePickerProps {
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

// ==================== HELPERS ====================

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = parse(str, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : null;
}

function formatDisplay(str: string): string {
  if (!str) return '';
  const d = parseDate(str);
  if (!d) return str;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

function isDateDisabled(date: Date, min?: string, max?: string): boolean {
  if (min) {
    const minDate = parseDate(min);
    if (minDate && isBefore(date, minDate)) return true;
  }
  if (max) {
    const maxDate = parseDate(max);
    if (maxDate && isAfter(date, maxDate)) return true;
  }
  return false;
}

// ==================== COMPONENT ====================

export function DatePicker({
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
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const parsed = parseDate(value);
    return parsed || parseDate(getTashkentToday()) || new Date();
  });
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const y = getYear(currentMonth);
    return y - (y % 12);
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const today = parseDate(getTashkentToday()) || new Date();
  const selectedDate = parseDate(value);
  const hasValue = value.length > 0;

  // ==================== POSITIONING ====================

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 360;
    const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;

    const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    const top = openUp
      ? rect.top - dropdownHeight - DROPDOWN_OFFSET
      : rect.bottom + DROPDOWN_OFFSET;

    const width = Math.max(rect.width, 300);
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
    );

    setDropdownPosition({ top, left, width });
  }, []);

  // ==================== OPEN/CLOSE ====================

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      setIsFocused(false);
      return;
    }
    const parsed = parseDate(value);
    if (parsed) {
      setCurrentMonth(parsed);
    }
    setViewMode('days');
    setIsOpen(true);
    setIsFocused(true);
  }, [disabled, value, isOpen]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setIsFocused(false);
  }, []);

  // ==================== EFFECTS ====================

  // Position updates on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const rafId = window.requestAnimationFrame(updateDropdownPosition);

      const handleUpdate = () => updateDropdownPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

      return () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeDropdown]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDropdown]);

  // ==================== HANDLERS ====================

  const handleDayClick = (date: Date) => {
    if (isDateDisabled(date, min, max)) return;
    onChange(toDateString(date));
    closeDropdown();
  };

  const handleToday = () => {
    const todayStr = getTashkentToday();
    onChange(todayStr);
    closeDropdown();
  };

  const handleClear = () => {
    onChange('');
    closeDropdown();
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleMonthSelect = (monthIdx: number) => {
    setCurrentMonth((prev) => setMonth(prev, monthIdx));
    setViewMode('days');
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth((prev) => setYear(prev, year));
    setViewMode('months');
  };

  const handleHeaderMonthClick = () => {
    setViewMode(viewMode === 'months' ? 'days' : 'months');
  };

  const handleHeaderYearClick = () => {
    if (viewMode === 'years') {
      setViewMode('days');
    } else {
      setYearRangeStart(getYear(currentMonth) - (getYear(currentMonth) % 12));
      setViewMode('years');
    }
  };

  // ==================== RENDER CALENDAR GRID ====================

  const renderDaysView = () => {
    const days = getCalendarDays(currentMonth);

    return (
      <>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="flex h-8 items-center justify-center text-xs font-semibold text-primary/60"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((date, i) => {
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isToday = isSameDay(date, today);
            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
            const isDisabled = isDateDisabled(date, min, max);

            return (
              <button
                key={i}
                type="button"
                disabled={isDisabled}
                onClick={() => handleDayClick(date)}
                className={clsx(
                  'flex h-9 w-full items-center justify-center rounded-lg text-sm transition-all duration-150',
                  isDisabled && 'cursor-not-allowed opacity-30',
                  !isDisabled && !isSelected && 'hover:bg-base-200',
                  !isCurrentMonth && !isSelected && 'text-base-content/25',
                  isCurrentMonth && !isSelected && !isToday && 'text-base-content',
                  isToday && !isSelected && 'ring-1 ring-primary text-primary font-semibold',
                  isSelected && 'bg-primary text-primary-content font-semibold shadow-sm',
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const renderMonthsView = () => {
    const currentYear = getYear(currentMonth);
    const currentMonthIdx = getMonth(currentMonth);

    return (
      <>
        {/* Year navigation header */}
        <div className="flex items-center justify-between px-2 mb-3">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={() => setCurrentMonth((prev) => setYear(prev, getYear(prev) - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="text-sm font-bold text-base-content hover:text-primary transition-colors"
            onClick={handleHeaderYearClick}
          >
            {currentYear}
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={() => setCurrentMonth((prev) => setYear(prev, getYear(prev) + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-2 px-1">
          {MONTHS_SHORT.map((monthName, idx) => {
            const isCurrentMonthSelected = idx === currentMonthIdx;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleMonthSelect(idx)}
                className={clsx(
                  'flex h-10 items-center justify-center rounded-lg text-sm transition-all duration-150',
                  'hover:bg-base-200',
                  isCurrentMonthSelected && 'bg-primary text-primary-content font-semibold shadow-sm',
                  !isCurrentMonthSelected && 'text-base-content',
                )}
              >
                {monthName}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const renderYearsView = () => {
    const currentYearValue = getYear(currentMonth);
    const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

    return (
      <>
        {/* Year range navigation */}
        <div className="flex items-center justify-between px-2 mb-3">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={() => setYearRangeStart((prev) => prev - 12)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-base-content">
            {yearRangeStart} – {yearRangeStart + 11}
          </span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
            onClick={() => setYearRangeStart((prev) => prev + 12)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Year grid */}
        <div className="grid grid-cols-4 gap-2 px-1">
          {years.map((year) => {
            const isCurrentYear = year === currentYearValue;

            return (
              <button
                key={year}
                type="button"
                onClick={() => handleYearSelect(year)}
                className={clsx(
                  'flex h-10 items-center justify-center rounded-lg text-sm transition-all duration-150',
                  'hover:bg-base-200',
                  isCurrentYear && 'bg-primary text-primary-content font-semibold shadow-sm',
                  !isCurrentYear && 'text-base-content',
                )}
              >
                {year}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <div className={clsx('form-control', className)}>
      {label && (
        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          {label} {required && <span className="text-error">*</span>}
        </span>
      )}

      {/* Trigger */}
      <div
        ref={triggerRef}
        className={clsx(
          'relative flex items-center rounded-xl border bg-base-200/50 transition-all duration-200 h-12 cursor-pointer select-none',
          isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : error
              ? 'border-error'
              : 'border-base-300 hover:border-base-content/30',
          disabled && 'opacity-50 pointer-events-none bg-base-200'
        )}
        onClick={toggleDropdown}
      >
        <div className="absolute left-3 text-base-content/40">
          <Calendar className="h-5 w-5" />
        </div>

        <div
          className={clsx(
            'w-full py-3 pl-10 pr-20 text-sm font-medium',
            hasValue ? 'text-base-content' : 'text-base-content/40'
          )}
        >
          {hasValue ? formatDisplay(value) : placeholder}
        </div>

        <div className="absolute right-2 flex items-center gap-1 z-10">
          {showClear && hasValue && !disabled && (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              aria-label="Tozalash"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <label className="label py-1">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}

      {/* Portal Dropdown */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] animate-datepicker-in rounded-xl border border-primary/20 bg-base-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-primary/10 p-3"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            minWidth: 300,
          }}
        >
          {/* Days View Header */}
          {viewMode === 'days' && (
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-md px-2 py-0.5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
                  onClick={handleHeaderMonthClick}
                >
                  {MONTHS_UZ[getMonth(currentMonth)]}
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-0.5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
                  onClick={handleHeaderYearClick}
                >
                  {getYear(currentMonth)}
                </button>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Content */}
          {viewMode === 'days' && renderDaysView()}
          {viewMode === 'months' && renderMonthsView()}
          {viewMode === 'years' && renderYearsView()}

          {/* Footer */}
          {viewMode === 'days' && (
            <div className="mt-2 flex items-center justify-between border-t border-base-200 pt-2">
              {showTodayButton ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-primary font-medium"
                  onClick={handleToday}
                >
                  Bugun
                </button>
              ) : (
                <div />
              )}
              {showClear ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-base-content/50 font-medium"
                  onClick={handleClear}
                >
                  Tozalash
                </button>
              ) : (
                <div />
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
