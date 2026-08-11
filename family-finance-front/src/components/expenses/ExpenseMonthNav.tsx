import { CalendarDays, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import clsx from 'clsx';

import { formatMonthLabel } from './expensesHelpers';

interface ExpenseMonthNavProps {
  monthCursor: string;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/** Oy bo'ylab navigatsiya: ‹ Avgust 2026 › + joriy oyga qaytish tugmasi. */
export function ExpenseMonthNav({
  monthCursor,
  isCurrentMonth,
  onPrev,
  onNext,
  onToday,
}: ExpenseMonthNavProps) {
  return (
    <div className="surface-card flex items-center justify-between gap-2 p-2.5 lg:p-3">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={onPrev}
        aria-label="Oldingi oy"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className="truncate text-base font-semibold lg:text-lg">
          {formatMonthLabel(monthCursor)}
        </span>
        {!isCurrentMonth && (
          // Mobilda ikonka-tugma (label sm+ da) — telefonda ham bir bosishda joriy oyga qaytish
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1 text-primary"
            onClick={onToday}
            aria-label="Joriy oyga qaytish"
          >
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Joriy oy</span>
          </button>
        )}
      </div>

      <button
        type="button"
        className={clsx('btn btn-ghost btn-sm btn-square', isCurrentMonth && 'invisible')}
        onClick={onNext}
        aria-label="Keyingi oy"
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
