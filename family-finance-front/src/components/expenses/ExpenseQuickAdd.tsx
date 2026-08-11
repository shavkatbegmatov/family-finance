import { useMemo, useState } from 'react';
import { Plus, Wallet, Zap } from 'lucide-react';
import { Link } from 'react-router';

import { CurrencyInput } from '../ui/CurrencyInput';
import { DateInput } from '../ui/DateInput';
import { Select } from '../ui/Select';
import { useTransactionDefaults } from '../../hooks/useTransactionDefaults';
import { getTashkentToday } from '../../config/constants';
import type { Account, FinanceCategory, TransactionRequest } from '../../types';

interface ExpenseQuickAddProps {
  accounts: readonly Account[];
  categories: readonly FinanceCategory[];
  accountsLoaded: boolean;
  /** ACCOUNTS_CREATE bormi — hisob yo'q holat xabari shunga qarab tanlanadi. */
  canCreateAccounts: boolean;
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
 * Kunlik xarajatni bir qatorda tez kiritish paneli. Muvaffaqiyatdan so'ng
 * summa/izoh tozalanadi, hisob/kategoriya/sana saqlanib qoladi — ketma-ket
 * bir necha xarajatni yozish uchun. Oxirgi tanlov localStorage default bo'ladi
 * (TransactionFormModal bilan bir xil "transaction-defaults" manbasi).
 *
 * <p>Ichki forma reference data kelgach render qilinadi — default'lar lazy
 * useState orqali bir marta o'qiladi (effect'da setState kerak emas). Scope
 * almashganda parent {@code key} bilan remount qiladi.</p>
 */
export function ExpenseQuickAdd({
  accounts,
  categories,
  accountsLoaded,
  canCreateAccounts,
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
        accounts={accounts}
        categories={categories}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </PanelShell>
  );
}

function QuickAddForm({
  accounts,
  categories,
  submitting,
  onSubmit,
}: Omit<ExpenseQuickAddProps, 'accountsLoaded' | 'canCreateAccounts'>) {
  const refData = useMemo(
    () => ({ accounts: [...accounts], categories: [...categories], members: [] }),
    [accounts, categories]
  );
  const { getDefaults, saveDefaults } = useTransactionDefaults(refData);

  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<number | undefined>(
    () => getDefaults('EXPENSE')?.categoryId
  );
  const [accountId, setAccountId] = useState<number>(
    () => getDefaults('EXPENSE')?.accountId ?? 0
  );
  const [date, setDate] = useState(getTashkentToday());
  const [description, setDescription] = useState('');

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'EXPENSE'),
    [categories]
  );

  const isValid = amount > 0 && accountId > 0 && date.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    const payload: TransactionRequest = {
      type: 'EXPENSE',
      amount,
      accountId,
      categoryId: categoryId || undefined,
      transactionDate: `${date}T00:00:00`,
      description: description.trim() || undefined,
    };

    onSubmit(payload, () => {
      saveDefaults('EXPENSE', payload);
      setAmount(0);
      setDescription('');
    });
  };

  return (
    <form
      className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-[1.2fr_1fr_1fr_0.9fr_auto] lg:items-end"
      onSubmit={handleSubmit}
    >
      <div className="col-span-2 lg:col-span-1">
        <CurrencyInput label="Summa *" value={amount} onChange={setAmount} showQuickButtons />
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

      <Select
        label="Hisob"
        value={accountId || undefined}
        onChange={(val) => setAccountId(Number(val) || 0)}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        placeholder="Hisob"
        required
      />

      <div className="col-span-2 lg:col-span-1">
        <DateInput label="Sana" required value={date} onChange={setDate} />
      </div>

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

      <label className="form-control col-span-2 lg:col-span-5">
        <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          Izoh
        </span>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Nimaga sarflandi? (ixtiyoriy)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={255}
        />
      </label>
    </form>
  );
}
