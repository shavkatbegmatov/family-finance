import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Plus, Wallet, Zap } from 'lucide-react';
import { Link } from 'react-router';
import clsx from 'clsx';

import { CurrencyInput } from '../ui/CurrencyInput';
import { DateInput } from '../ui/DateInput';
import { Select } from '../ui/Select';
import { useTransactionDefaults } from '../../hooks/useTransactionDefaults';
import { getDateDaysAgo, getTashkentToday } from '../../config/constants';
import { getCategoryIcon } from '../../utils/icons';
import type { Account, FinanceCategory, TransactionRequest } from '../../types';

/** Jurnal qatoridan "takrorlash" bosilganda formaga ko'chiriladigan qiymatlar. */
export interface QuickAddPrefill {
  amount: number;
  categoryId?: number;
  accountId?: number;
  description?: string;
}

/** Sana kiritish rejimi — qiymat SUBMIT paytida hisoblanadi (eskirgan sana himoyasi). */
type DateMode = 'today' | 'yesterday' | 'custom';

const DATE_MODE_CHIPS: ReadonlyArray<{ key: DateMode; label: string }> = [
  { key: 'today', label: 'Bugun' },
  { key: 'yesterday', label: 'Kecha' },
];

interface ExpenseQuickAddProps {
  accounts: readonly Account[];
  categories: readonly FinanceCategory[];
  accountsLoaded: boolean;
  /** ACCOUNTS_CREATE bormi — hisob yo'q holat xabari shunga qarab tanlanadi. */
  canCreateAccounts: boolean;
  /** Eng ko'p ishlatilgan EXPENSE kategoriyalar — bir bosishda tanlash chiplari. */
  topCategories: readonly FinanceCategory[];
  /** Izoh autocomplete uchun so'nggi izohlar. */
  recentDescriptions: readonly string[];
  /** Takrorlashdan kelgan boshlang'ich qiymatlar (formKey remount bilan qo'llanadi). */
  prefill?: QuickAddPrefill | null;
  /** Har prefill'da o'zgaradigan kalit — ichki forma remount bo'lib yangi initial state oladi. */
  formKey: number;
  submitting: boolean;
  onSubmit: (payload: TransactionRequest, onDone: () => void) => void;
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-card p-4 lg:p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Zap className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold lg:text-base">Tezkor kiritish</h2>
          <p className="text-xs text-base-content/50">
            Bugungi xarajatni bir necha soniyada yozib qo'ying
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Kunlik xarajatni tez kiritish paneli. Ketma-ket kiritish sikli uchun
 * optimallashtirilgan: saqlagach summa/izoh tozalanib fokus summa maydoniga
 * qaytadi, hisob/kategoriya/sana rejimi saqlanadi, oxirgi tanlov localStorage
 * default bo'ladi (TransactionFormModal bilan bir xil manba).
 *
 * <p>Ichki forma reference data kelgach render qilinadi — default'lar lazy
 * useState orqali bir marta o'qiladi (effect'da setState kerak emas). Scope
 * almashganda va har takrorlash prefill'ida parent {@code key} bilan remount
 * qiladi.</p>
 */
export function ExpenseQuickAdd({
  accounts,
  categories,
  accountsLoaded,
  canCreateAccounts,
  topCategories,
  recentDescriptions,
  prefill,
  formKey,
  submitting,
  onSubmit,
}: ExpenseQuickAddProps) {
  if (!accountsLoaded) {
    return (
      <PanelShell>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </PanelShell>
    );
  }

  if (accounts.length === 0) {
    // ACCOUNTS_CREATE bo'lmagan a'zoni hisob ocholmaydigan sahifaga yubormaymiz —
    // uning yo'li xonadon egasi orqali (hisob ochish yoki mavjudiga ruxsat)
    return (
      <PanelShell>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-base-300 bg-base-200/40 px-3 py-2.5 text-sm text-base-content/60">
          <Wallet className="h-4 w-4 flex-none" />
          {canCreateAccounts ? (
            <>
              Xarajat yozish uchun avval hisob oching —
              <Link to="/accounts" className="link link-primary font-medium">
                Hisoblar sahifasi
              </Link>
            </>
          ) : (
            <>
              Sizga biriktirilgan hisob yo'q — xonadon egasidan hisob ochib berishni
              yoki mavjud hisobga ruxsat berishni so'rang
            </>
          )}
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <QuickAddForm
        key={formKey}
        accounts={accounts}
        categories={categories}
        topCategories={topCategories}
        recentDescriptions={recentDescriptions}
        prefill={prefill}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </PanelShell>
  );
}

function QuickAddForm({
  accounts,
  categories,
  topCategories,
  recentDescriptions,
  prefill,
  submitting,
  onSubmit,
}: Omit<ExpenseQuickAddProps, 'accountsLoaded' | 'canCreateAccounts' | 'formKey'>) {
  const refData = useMemo(
    () => ({ accounts: [...accounts], categories: [...categories], members: [] }),
    [accounts, categories]
  );
  const { getDefaults, saveDefaults } = useTransactionDefaults(refData);

  const singleAccount = accounts.length === 1;

  const [amount, setAmount] = useState(() => prefill?.amount ?? 0);
  const [categoryId, setCategoryId] = useState<number | undefined>(
    () => prefill?.categoryId ?? getDefaults('EXPENSE')?.categoryId
  );
  const [accountId, setAccountId] = useState<number>(() => {
    if (prefill?.accountId && accounts.some((a) => a.id === prefill.accountId)) {
      return prefill.accountId;
    }
    return getDefaults('EXPENSE')?.accountId ?? (singleAccount ? accounts[0].id : 0);
  });
  const [dateMode, setDateMode] = useState<DateMode>('today');
  const [customDate, setCustomDate] = useState(getTashkentToday());
  const [description, setDescription] = useState(() => prefill?.description ?? '');

  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const hadPrefill = useRef(Boolean(prefill));

  // Fokus: takrorlashdan kelganda har doim; oddiy ochilishda faqat desktop
  // (mobilda klaviatura o'z-o'zidan ochilib ketmasin). DOM side-effect, setState emas.
  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (hadPrefill.current || isDesktop) {
      amountInputRef.current?.focus();
    }
  }, []);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'EXPENSE'),
    [categories]
  );

  /** Sana SUBMIT paytida hisoblanadi — sahifa tunda ochiq qolsa ham eskirmaydi. */
  const resolveDate = (): string => {
    if (dateMode === 'today') return getTashkentToday();
    if (dateMode === 'yesterday') return getDateDaysAgo(1);
    return customDate;
  };

  const isValid =
    amount > 0 && accountId > 0 && (dateMode !== 'custom' || customDate.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    const payload: TransactionRequest = {
      type: 'EXPENSE',
      amount,
      accountId,
      categoryId: categoryId || undefined,
      transactionDate: `${resolveDate()}T00:00:00`,
      description: description.trim() || undefined,
    };

    onSubmit(payload, () => {
      saveDefaults('EXPENSE', payload);
      setAmount(0);
      setDescription('');
      // Ketma-ket kiritish: fokus summa maydoniga qaytadi. select() alohida —
      // Enter bilan saqlashda input allaqachon fokusda bo'lib focus() no-op
      // (focus event otilmaydi), matn tanlanmay qolardi.
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    });
  };

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      {/* Tez kategoriya chiplari — bir bosishda tanlash (takror bosish bekor qiladi) */}
      {topCategories.length > 0 && (
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin"
          role="group"
          aria-label="Tez kategoriya tanlash"
        >
          {topCategories.map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={clsx(
                  'btn btn-sm flex-none gap-1.5 rounded-full font-medium',
                  active ? 'btn-primary' : 'border-base-300 bg-base-200/60 btn-ghost'
                )}
                aria-pressed={active}
                onClick={() => setCategoryId((prev) => (prev === c.id ? undefined : c.id))}
              >
                {getCategoryIcon(c.icon, active ? undefined : c.color, 'h-3.5 w-3.5')}
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Asosiy maydonlar: Summa | Kategoriya | (Hisob — faqat bir nechta bo'lsa) | Qo'shish */}
      <div
        className={clsx(
          'grid grid-cols-2 gap-3 lg:items-end',
          singleAccount
            ? 'lg:grid-cols-[1.3fr_1fr_auto]'
            : 'lg:grid-cols-[1.3fr_1fr_1fr_auto]'
        )}
      >
        <div className="col-span-2 lg:col-span-1">
          <CurrencyInput
            label="Summa *"
            value={amount}
            onChange={setAmount}
            showQuickButtons
            inputRef={amountInputRef}
          />
        </div>

        <Select
          label="Kategoriya"
          value={categoryId ?? undefined}
          onChange={(val) => setCategoryId(val ? Number(val) : undefined)}
          options={[
            { value: '', label: 'Tanlanmagan' },
            ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          placeholder="Kategoriya"
        />

        {!singleAccount && (
          <Select
            label="Hisob"
            value={accountId || undefined}
            onChange={(val) => setAccountId(Number(val) || 0)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Hisob"
            required
          />
        )}

        <button
          type="submit"
          className="btn btn-primary col-span-2 lg:col-span-1"
          disabled={!isValid || submitting}
        >
          {submitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Qo'shish
        </button>
      </div>

      {/* Sana rejimi + izoh — bitta ixcham qator */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1" role="group" aria-label="Sana tanlash">
          <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
            Sana:
          </span>
          {DATE_MODE_CHIPS.map((m) => (
            <button
              key={m.key}
              type="button"
              className={clsx(
                'btn btn-sm rounded-full',
                dateMode === m.key ? 'btn-primary' : 'border-base-300 bg-base-200/60 btn-ghost'
              )}
              aria-pressed={dateMode === m.key}
              onClick={() => setDateMode(m.key)}
            >
              {m.label}
            </button>
          ))}
          <button
            type="button"
            className={clsx(
              'btn btn-sm btn-square rounded-full',
              dateMode === 'custom' ? 'btn-primary' : 'border-base-300 bg-base-200/60 btn-ghost'
            )}
            aria-pressed={dateMode === 'custom'}
            aria-label="Boshqa sana tanlash"
            title="Boshqa sana"
            onClick={() => setDateMode('custom')}
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>

        {dateMode === 'custom' && (
          <div className="w-40">
            <DateInput value={customDate} onChange={setCustomDate} />
          </div>
        )}

        <input
          type="text"
          className="input input-bordered h-10 min-w-[12rem] flex-1 text-sm"
          placeholder="Nimaga sarflandi? (ixtiyoriy)"
          aria-label="Izoh"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={255}
          list="expense-desc-options"
          enterKeyHint="done"
        />
        <datalist id="expense-desc-options">
          {recentDescriptions.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>
    </form>
  );
}
