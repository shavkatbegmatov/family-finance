import { CalendarOff, ChevronDown, Copy, Pencil, Receipt, Split, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
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
  /** TRANSACTIONS_CREATE bormi — bo'sh holat maslahati shunga qarab tanlanadi. */
  canCreate: boolean;
  /** Scope'da yozish mumkin bo'lgan hisob bormi (false FAQAT ro'yxat yuklanib bo'sh chiqqanda). */
  hasAccounts: boolean;
  /** ACCOUNTS_CREATE bormi — hisob yo'q maslahati o'zi ochish yoki egadan so'rashga yo'naltiradi. */
  canCreateAccounts: boolean;
  /**
   * Kategoriya filtri faolmi — kun jamlari xulosadan emas, ko'rinayotgan qatorlardan
   * hisoblanadi (xulosa jamlari filtrlanmagan) va bo'sh holat matni moslashadi.
   */
  filtered: boolean;
  onLoadMore: () => void;
  onRowClick: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  /** Qatorni formaga ko'chirish (takrorlash) — bugungi sana bilan qayta yozish uchun. */
  onRepeat: (t: Transaction) => void;
}

/** Filtr faol bo'lganda kun jami — ko'rinayotgan (REVERSED bo'lmagan) qatorlardan, valyuta kesimida. */
function totalsFromItems(items: Transaction[]): ExpenseCurrencyTotal[] {
  const byCurrency = new Map<string, ExpenseCurrencyTotal>();
  for (const t of items) {
    if (t.status === 'REVERSED') continue;
    const key = t.currency ?? 'UZS';
    const entry = byCurrency.get(key) ?? { currency: key, total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    byCurrency.set(key, entry);
  }
  return [...byCurrency.values()];
}

/**
 * Bo'sh jurnal maslahati kontekstga mos bo'lishi shart: hisob yo'q holatda
 * "Tezkor kiritish"ga yuborish zid (panel o'zi "avval hisob oching" deydi),
 * huquq yo'q holatda esa panel umuman ko'rinmaydi. Hisob yo'q + ACCOUNTS_CREATE
 * ham yo'q bo'lsa, hisob ocholmaydigan sahifaga havola bermaymiz — yo'l
 * xonadon egasi orqali.
 */
function EmptyJournalHint({
  canCreate,
  hasAccounts,
  canCreateAccounts,
}: {
  canCreate: boolean;
  hasAccounts: boolean;
  canCreateAccounts: boolean;
}) {
  if (!canCreate) {
    return (
      <>Sizda xarajat kiritish huquqi yo'q — yozuvlarni xonadon egasi yoki hisobchi kiritadi</>
    );
  }
  if (!hasAccounts) {
    if (!canCreateAccounts) {
      return (
        <>Xarajat yozish uchun sizga hisob biriktirilishi kerak — xonadon egasiga murojaat qiling</>
      );
    }
    return (
      <>
        Xarajat yozish uchun avval{' '}
        <Link to="/accounts" className="link link-primary font-medium">
          hisob oching
        </Link>
      </>
    );
  }
  return <>Yuqoridagi "Tezkor kiritish" orqali birinchi xarajatingizni yozing</>;
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
  onRepeat,
}: {
  transaction: Transaction;
  category?: FinanceCategory;
  onRowClick: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onRepeat: (t: Transaction) => void;
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
          // Ichki tugmalardan (takrorlash/tahrirlash/storno) ko'tarilgan Enter/Space'ni
          // ushlamaymiz — aks holda preventDefault ularning native click'ini o'ldiradi
          if (e.target !== e.currentTarget) return;
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
          <span className="flex items-center gap-0.5">
            {/* Takrorlash — barcha ekranlarda (kunlik siklning asosiy tezlatgichi):
                qiymatlar formaga ko'chadi, yozish faqat "Qo'shish" bilan (tasodifiy tap xavfsiz) */}
            <PermissionGate permission={PermissionCode.TRANSACTIONS_CREATE}>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square text-base-content/60"
                onClick={(e) => {
                  e.stopPropagation();
                  onRepeat(transaction);
                }}
                aria-label="Takrorlash — formaga ko'chirish"
                title="Takrorlash"
              >
                <Copy className="h-4 w-4" />
              </button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.TRANSACTIONS_UPDATE}>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square hidden lg:inline-flex"
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
                className="btn btn-ghost btn-sm btn-square hidden text-error lg:inline-flex"
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
  canCreate,
  hasAccounts,
  canCreateAccounts,
  filtered,
  onLoadMore,
  onRowClick,
  onEdit,
  onDelete,
  onRepeat,
}: ExpenseJournalProps) {
  if (loading) return <JournalSkeleton />;

  if (dayGroups.length === 0) {
    return (
      <div className="surface-card grid place-items-center gap-3 p-8 text-center lg:p-12">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-base-200 text-base-content/40">
          <CalendarOff className="h-7 w-7" />
        </span>
        <div>
          <p className="font-semibold">
            {filtered ? 'Filtrga mos yozuv topilmadi' : "Bu oyda xarajat yozuvlari yo'q"}
          </p>
          <p className="mt-1 text-sm text-base-content/50">
            {filtered ? (
              <>Bu oyda tanlangan kategoriya bo'yicha xarajat yo'q — filtrni bekor qiling</>
            ) : (
              <EmptyJournalHint
                canCreate={canCreate}
                hasAccounts={hasAccounts}
                canCreateAccounts={canCreateAccounts}
              />
            )}
          </p>
        </div>
      </div>
    );
  }

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      {dayGroups.map((group, groupIndex) => {
        // Filtr faol bo'lsa xulosa jamlari mos kelmaydi — ko'rinayotgan qatorlardan hisoblanadi.
        // Oxirgi yuklangan kun sahifa chegarasida kesilgan bo'lishi mumkin (100 talik page) —
        // qisman (yolg'on kichik) jami ko'rsatmaslik uchun u holda sarlavha jami yashiriladi.
        const lastGroupMaybePartial = filtered && hasMore && groupIndex === dayGroups.length - 1;
        const totals = filtered
          ? lastGroupMaybePartial
            ? []
            : totalsFromItems(group.items)
          : dailyTotalsByDate.get(group.date) ?? [];
        return (
          <section
            key={group.date}
            id={`day-${group.date}`}
            className="surface-card scroll-mt-24 overflow-hidden p-0"
          >
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
                  onRepeat={onRepeat}
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
