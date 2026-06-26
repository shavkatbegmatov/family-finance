import clsx from 'clsx';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../config/constants';
import type { IncomeExpenseReport } from '../../types';

/**
 * Daromad/Xarajat tabidagi 3 ta xulosa kartasi (jami daromad, jami xarajat,
 * farq). Belgilar/ranglar/format original ReportsPage bilan AYNAN.
 */
export function SummaryCards({
  incomeExpense,
  difference,
}: {
  incomeExpense: IncomeExpenseReport;
  difference: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Total Income */}
      <div className="surface-card p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-base-content/60">Jami daromad</p>
            <p className="mt-2 text-3xl font-bold text-success">
              {formatCurrency(incomeExpense.totalIncome)}
            </p>
          </div>
          <div className="rounded-xl bg-success/10 p-3 text-success">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Total Expense */}
      <div className="surface-card p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-base-content/60">Jami xarajat</p>
            <p className="mt-2 text-3xl font-bold text-error">
              {formatCurrency(incomeExpense.totalExpense)}
            </p>
          </div>
          <div className="rounded-xl bg-error/10 p-3 text-error">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Difference */}
      <div className="surface-card p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-base-content/60">Farq (Daromad - Xarajat)</p>
            <p
              className={clsx(
                'mt-2 text-3xl font-bold',
                difference >= 0 ? 'text-success' : 'text-error'
              )}
            >
              {difference >= 0 ? '+' : ''}
              {formatCurrency(difference)}
            </p>
          </div>
          <div
            className={clsx(
              'rounded-xl p-3',
              difference >= 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            )}
          >
            <BarChart3 className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
