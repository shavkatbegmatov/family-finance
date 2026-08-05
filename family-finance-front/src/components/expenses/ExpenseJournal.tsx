import { CalendarOff, ChevronDown, Pencil, Receipt, Split, Trash2 } from 'lucide-react';
import clsx from 'clsx';

import { PermissionGate } from '../common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { getCategoryIcon } from '../../utils/icons';
import { formatAmountWithCurrency, formatDayLabel } from './expensesHelpers';
import type { ExpenseDayGroup } from '../../hooks/useDailyExpensesData';
import type { ExpenseCurrencyTotal, FinanceCategory, Transaction } from '../../types';

interface ExpenseJournalProps {
  dayGroups: ExpenseDayGroup[];
  dailyTotalsByDate: Map<string, ExpenseCurrencyTotal[]>;
  categories: readonly FinanceCategory[];
  today: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadedCount: number;
  totalElements: number;
  onLoadMore: () => void;
  onRowClick: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

function JournalSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface-card overflow-hidden p-0">
          <div className="border-b border-base-200 bg-base-200/40 px-4 py-3">
            <div className="skeleton h-4 w-44" />
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton mt-2 h-3 w-28" />
                </div>
                <div className="skeleton h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bitta xarajat yozuvi qatori. */
function ExpenseRow({
  transaction,
  category,
  onRowClick,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  category?: FinanceCategory;
  onRowClick: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}) {
  const isReversed = transaction.status === 'REVERSED';
  const title = transaction.description?.trim() || transaction.categoryName || 'Xarajat';
  const subParts = [
    transaction.categoryName ?? 'Kategoriyasiz',
    transaction.accountName,
    transaction.familyMemberName,
  ].filter(Boolean);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onRowClick(transaction)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRowClick(transaction);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-base-200/50"
      >
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-base-200/80">
          {getCategoryIcon(category?.icon, category?.color, 'h-5 w-5') ?? (
            <Receipt className="h-5 w-5 text-base-content/40" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              'truncate text-sm font-medium',
              isReversed && 'text-base-content/40 line-through'
            )}
          >
            {title}
          </p>
          <p className="truncate text-xs text-base-content/50">{subParts.join(' · ')}</p>
        </div>

        {(transaction.splits?.length ?? 0) > 0 && (
          <span className="badge badge-ghost badge-sm hidden gap-1 sm:inline-flex">
            <Split className="h-3 w-3" />
            {transaction.splits?.length}
          </span>
        )}
        {isReversed && <span className="badge badge-warning badge-sm">Storno</span>}

        <span
          className={clsx(
            'whitespace-nowrap text-sm font-semibold',
            isReversed ? 'text-base-content/40 line-through' : 'text-error'
          )}
        >
          −{formatAmountWithCurrency(transaction.amount, transaction.currency)}
        </span>

        {!isReversed && (
          <span className="hidden items-center gap-0.5 lg:flex">
            <PermissionGate permission={PermissionCode.TRANSACTIONS_UPDATE}>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(transaction);
                }}
                aria-label="Tahrirlash"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.TRANSACTIONS_DELETE}>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square text-error"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(transaction);
                }}
                aria-label="Storno qilish"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </PermissionGate>
          </span>
        )}
      </div>
    </li>
  );
}

/** Kunlar bo'yicha guruhlangan xarajatlar jurnali. */
export function ExpenseJournal({
  dayGroups,
  dailyTotalsByDate,
  categories,
  today,
  loading,
  loadingMore,
  hasMore,
  loadedCount,
  totalElements,
  onLoadMore,
  onRowClick,
  onEdit,
  onDelete,
}: ExpenseJournalProps) {
  if (loading) return <JournalSkeleton />;

  if (dayGroups.length === 0) {
    return (
      <div className="surface-card grid place-items-center gap-3 p-8 text-center lg:p-12">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-base-200 text-base-content/40">
          <CalendarOff className="h-7 w-7" />
        </span>
        <div>
          <p className="font-semibold">Bu oyda xarajat yozuvlari yo'q</p>
          <p className="mt-1 text-sm text-base-content/50">
            Yuqoridagi "Tezkor kiritish" orqali birinchi xarajatingizni yozing
          </p>
        </div>
      </div>
    );
  }

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      {dayGroups.map((group) => {
        const totals = dailyTotalsByDate.get(group.date) ?? [];
        return (
          <section key={group.date} className="surface-card overflow-hidden p-0">
            <header className="flex items-center justify-between gap-3 border-b border-base-200 bg-base-200/40 px-4 py-2.5">
              <h3 className="truncate text-sm font-semibold">
                {formatDayLabel(group.date, today)}
              </h3>
              {totals.length > 0 && (
                <span className="whitespace-nowrap text-sm font-bold text-error">
                  −{totals.map((t) => formatAmountWithCurrency(t.total, t.currency)).join(' · ')}
                </span>
              )}
            </header>
            <ul className="divide-y divide-base-200/70">
              {group.items.map((t) => (
                <ExpenseRow
                  key={t.id}
                  transaction={t}
                  category={t.categoryId ? categoriesById.get(t.categoryId) : undefined}
                  onRowClick={onRowClick}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {hasMore && (
        <button
          type="button"
          className="btn btn-ghost btn-sm w-full gap-1"
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Yana yuklash ({loadedCount}/{totalElements})
        </button>
      )}
    </div>
  );
}
