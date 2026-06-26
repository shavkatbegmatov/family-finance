import type { Dispatch, SetStateAction } from 'react';
import clsx from 'clsx';
import { ArrowLeftRight, X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../config/constants';
import type { Transaction } from '../../types';
import { ChartCard } from './ChartCard';

// Transaction type helpers
const transactionTypeConfig: Record<string, { label: string; color: string; sign: string }> = {
  INCOME: { label: 'Daromad', color: 'text-success', sign: '+' },
  EXPENSE: { label: 'Xarajat', color: 'text-error', sign: '-' },
  TRANSFER: { label: "O'tkazma", color: 'text-info', sign: '' },
};

/**
 * Oxirgi tranzaksiyalar — desktop jadval + mobil karta ko'rinishi (har biri
 * eng ko'pi 5 ta), kategoriya filtri chip'i bilan. Kiruvchi <code>transactions</code>
 * allaqachon filtrlangan ro'yxat (filteredTransactions).
 */
export function RecentTransactionsCard({
  transactions,
  categoryFilter,
  setCategoryFilter,
}: {
  transactions: Transaction[];
  categoryFilter: string | null;
  setCategoryFilter: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <ChartCard
      title="Oxirgi tranzaksiyalar"
      icon={ArrowLeftRight}
      action={
        categoryFilter && (
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className="inline-flex items-center gap-1 rounded-full bg-base-200 px-2.5 py-1 text-xs text-base-content/70 hover:bg-base-300"
          >
            <X className="h-3 w-3" />
            filter: {categoryFilter}
          </button>
        )
      }
    >
      {transactions.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Turi</th>
                  <th>Kategoriya</th>
                  <th>Izoh</th>
                  <th className="text-right">Summa</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((tx) => {
                  const config = transactionTypeConfig[tx.type] || { label: tx.type, color: '', sign: '' };
                  return (
                    <tr key={tx.id} className="hover">
                      <td className="whitespace-nowrap text-sm text-base-content/70">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td>
                        <span
                          className={clsx(
                            'badge badge-sm',
                            tx.type === 'INCOME' && 'badge-success badge-outline',
                            tx.type === 'EXPENSE' && 'badge-error badge-outline',
                            tx.type === 'TRANSFER' && 'badge-info badge-outline'
                          )}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="text-sm">{tx.categoryName || '—'}</td>
                      <td className="max-w-[200px] truncate text-sm text-base-content/60">
                        {tx.description || '—'}
                      </td>
                      <td className={clsx('text-right font-semibold whitespace-nowrap', config.color)}>
                        {config.sign}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="space-y-2 lg:hidden">
            {transactions.slice(0, 5).map((tx) => {
              const config = transactionTypeConfig[tx.type] || { label: tx.type, color: '', sign: '' };
              return (
                <div key={tx.id} className="rounded-xl border border-base-200 p-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        'badge badge-sm',
                        tx.type === 'INCOME' && 'badge-success badge-outline',
                        tx.type === 'EXPENSE' && 'badge-error badge-outline',
                        tx.type === 'TRANSFER' && 'badge-info badge-outline'
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs text-base-content/50">
                      {formatDate(tx.transactionDate)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium">{tx.categoryName || '—'}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="max-w-[60%] truncate text-xs text-base-content/50">
                      {tx.description || '—'}
                    </span>
                    <span className={clsx('font-semibold', config.color)}>
                      {config.sign}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex h-32 items-center justify-center text-base-content/50">
          {categoryFilter
            ? `"${categoryFilter}" kategoriyasi bo'yicha tranzaksiya yo'q`
            : 'Tranzaksiyalar mavjud emas'}
        </div>
      )}
    </ChartCard>
  );
}
