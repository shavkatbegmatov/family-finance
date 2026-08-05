import { useMemo } from 'react';
import { PieChart } from 'lucide-react';

import { getCategoryIcon } from '../../utils/icons';
import { formatCompactWithCurrency } from './expensesHelpers';
import type { CategoryExpenseTotal } from '../../types';

/** Progress-bar ko'rinishida chiqariladigan maksimal kategoriya soni. */
const MAX_BARS = 8;

interface BreakdownRow {
  key: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  total: number;
  percent: number;
}

interface ExpenseCategoryBreakdownProps {
  categoryTotals: CategoryExpenseTotal[];
  primaryCurrency?: string;
  loading: boolean;
}

/**
 * Oy xarajatlarining kategoriya taqsimoti — asosiy valyuta bo'yicha progress
 * barlar (top-8 + "Boshqalar"), boshqa valyutalar alohida ixcham ro'yxatda.
 */
export function ExpenseCategoryBreakdown({
  categoryTotals,
  primaryCurrency,
  loading,
}: ExpenseCategoryBreakdownProps) {
  const { rows, otherCurrencies } = useMemo(() => {
    const primary = categoryTotals.filter((c) => c.currency === primaryCurrency);
    const rest = categoryTotals.filter((c) => c.currency !== primaryCurrency);

    const grandTotal = primary.reduce((sum, c) => sum + c.total, 0);
    const top = primary.slice(0, MAX_BARS);
    const overflow = primary.slice(MAX_BARS);

    const toRow = (c: CategoryExpenseTotal): BreakdownRow => ({
      key: `${c.categoryId ?? 'none'}-${c.currency}`,
      name: c.categoryName ?? 'Kategoriyasiz',
      icon: c.categoryIcon,
      color: c.categoryColor,
      total: c.total,
      percent: grandTotal > 0 ? (c.total / grandTotal) * 100 : 0,
    });

    const builtRows = top.map(toRow);
    if (overflow.length > 0) {
      const overflowTotal = overflow.reduce((sum, c) => sum + c.total, 0);
      builtRows.push({
        key: 'others',
        name: `Boshqalar (${overflow.length})`,
        total: overflowTotal,
        percent: grandTotal > 0 ? (overflowTotal / grandTotal) * 100 : 0,
      });
    }
    return { rows: builtRows, otherCurrencies: rest };
  }, [categoryTotals, primaryCurrency]);

  return (
    <div className="surface-card p-4 lg:p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary/10 text-secondary">
          <PieChart className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold lg:text-base">Kategoriyalar bo'yicha</h2>
      </div>

      {loading && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton h-4 w-36" />
              <div className="skeleton mt-1.5 h-2 w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="mt-4 text-sm text-base-content/50">
          Bu oyda kategoriya kesimida ma'lumot yo'q
        </p>
      )}

      {!loading && rows.length > 0 && (
        <ul className="mt-4 space-y-3.5">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  {getCategoryIcon(row.icon, row.color, 'h-4 w-4 flex-none')}
                  <span className="truncate font-medium">{row.name}</span>
                </span>
                <span className="whitespace-nowrap text-base-content/70">
                  {formatCompactWithCurrency(row.total, primaryCurrency)}
                  <span className="ml-1.5 text-xs text-base-content/40">
                    {row.percent.toFixed(0)}%
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-base-200">
                <div
                  className={row.color ? 'h-full rounded-full' : 'h-full rounded-full bg-primary'}
                  style={{
                    width: `${Math.max(row.percent, 2)}%`,
                    ...(row.color ? { backgroundColor: row.color } : {}),
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && otherCurrencies.length > 0 && (
        <div className="mt-4 border-t border-base-200 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
            Boshqa valyutalar
          </p>
          <ul className="mt-2 space-y-1.5">
            {otherCurrencies.map((c) => (
              <li
                key={`${c.categoryId ?? 'none'}-${c.currency}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {getCategoryIcon(c.categoryIcon, c.categoryColor, 'h-4 w-4 flex-none')}
                  <span className="truncate">{c.categoryName ?? 'Kategoriyasiz'}</span>
                </span>
                <span className="whitespace-nowrap text-base-content/70">
                  {formatCompactWithCurrency(c.total, c.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
