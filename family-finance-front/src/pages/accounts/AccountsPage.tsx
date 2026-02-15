import { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  CreditCard,
  PiggyBank,
  Smartphone,
  Plus,
  Edit2,
  Trash2,
  X,
  ArrowRightLeft,
  Clock,
  Landmark,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { accountsApi } from '../../api/accounts.api';
import type { Account, AccountRequest, AccountType, ApiResponse, PagedResponse } from '../../types';
import { formatCurrency, ACCOUNT_TYPES } from '../../config/constants';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCOUNT_ICONS: Record<AccountType, typeof Wallet> = {
  CASH: Wallet,
  BANK_CARD: CreditCard,
  SAVINGS: PiggyBank,
  E_WALLET: Smartphone,
  TERM_DEPOSIT: Clock,
  CREDIT: Landmark,
};

const DEFAULT_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#14b8a6', '#6366f1', '#d946ef', '#0ea5e9',
];

const ICON_OPTIONS: { value: string; label: string; Icon: typeof Wallet }[] = [
  { value: 'Wallet', label: 'Hamyon', Icon: Wallet },
  { value: 'CreditCard', label: 'Karta', Icon: CreditCard },
  { value: 'PiggyBank', label: "Jamg'arma", Icon: PiggyBank },
  { value: 'Smartphone', label: 'Telefon', Icon: Smartphone },
  { value: 'ArrowRightLeft', label: "O'tkazma", Icon: ArrowRightLeft },
];

function getAccountIcon(type: AccountType) {
  return ACCOUNT_ICONS[type] ?? Wallet;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountsPage() {
  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('CASH');
  const [formBalance, setFormBalance] = useState(0);
  const [formColor, setFormColor] = useState(DEFAULT_COLORS[0]);
  const [formIcon, setFormIcon] = useState('Wallet');

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await accountsApi.getAll();
      const data = res.data as ApiResponse<PagedResponse<Account>>;
      setAccounts(data.data.content);
    } catch {
      toast.error('Hisoblarni yuklashda xatolik');
    }
  }, []);

  const fetchTotalBalance = useCallback(async () => {
    try {
      const balanceRes = await accountsApi.getTotalBalance();
      const data = balanceRes.data as ApiResponse<number>;
      setTotalBalance(data.data);
    } catch {
      // silently fail - balance is supplementary
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAccounts(), fetchTotalBalance()]);
    setLoading(false);
  }, [fetchAccounts, fetchTotalBalance]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Modal helpers
  // -----------------------------------------------------------------------

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormType('CASH');
    setFormBalance(0);
    setFormColor(DEFAULT_COLORS[0]);
    setFormIcon('Wallet');
    setShowModal(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormName(account.name);
    setFormType(account.type);
    setFormBalance(account.balance);
    setFormColor(account.color || DEFAULT_COLORS[0]);
    setFormIcon(account.icon || 'Wallet');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAccount(null);
  };

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('Hisob nomini kiriting');
      return;
    }

    setSubmitting(true);
    try {
      const payload: AccountRequest = {
        name: formName.trim(),
        type: formType,
        balance: formBalance,
        color: formColor,
        icon: formIcon,
      };

      if (editingAccount) {
        await accountsApi.update(editingAccount.id, payload);
        toast.success('Hisob yangilandi');
      } else {
        await accountsApi.create(payload);
        toast.success('Yangi hisob yaratildi');
      }

      closeModal();
      await loadData();
    } catch {
      toast.error('Saqlashda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await accountsApi.delete(id);
      toast.success("Hisob o'chirildi");
      setDeletingId(null);
      await loadData();
    } catch {
      toast.error("O'chirishda xatolik yuz berdi");
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hisoblar</h1>
          <p className="mt-1 text-sm text-base-content/60">
            Moliyaviy hisoblaringiz
          </p>
        </div>

        <PermissionGate permission={PermissionCode.ACCOUNTS_CREATE}>
          <button
            className="btn btn-primary gap-2"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Yangi hisob
          </button>
        </PermissionGate>
      </div>

      {/* ---- Total Balance Card ---- */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-base-content/60">
              Umumiy balans
            </p>
            <p className="text-3xl font-bold tracking-tight">
              {loading ? (
                <span className="inline-block h-9 w-48 animate-pulse rounded-lg bg-base-300" />
              ) : (
                formatCurrency(totalBalance)
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ---- Accounts Grid ---- */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-card p-5 space-y-3 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-base-300" />
              <div className="h-4 w-2/3 rounded bg-base-300" />
              <div className="h-6 w-1/2 rounded bg-base-300" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-base-content/20" />
          <p className="mt-4 text-lg font-medium text-base-content/60">
            Hali hisob mavjud emas
          </p>
          <p className="mt-1 text-sm text-base-content/40">
            Birinchi hisobingizni yaratish uchun "Yangi hisob" tugmasini bosing
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = getAccountIcon(account.type);
            const color = account.color || '#3b82f6';

            return (
              <div
                key={account.id}
                className="surface-card group relative overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                {/* Delete confirmation overlay */}
                {deletingId === account.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/90 backdrop-blur-sm">
                    <div className="text-center space-y-3 p-4">
                      <p className="text-sm font-medium">
                        "{account.name}" hisobini o'chirmoqchimisiz?
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() => handleDelete(account.id)}
                        >
                          O'chirish
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDeletingId(null)}
                        >
                          Bekor qilish
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  {/* Top row: icon + actions */}
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>

                    {/* Hover actions */}
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <PermissionGate permission={PermissionCode.ACCOUNTS_UPDATE}>
                        <button
                          className="btn btn-ghost btn-xs btn-square"
                          onClick={() => openEditModal(account)}
                          title="Tahrirlash"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={PermissionCode.ACCOUNTS_DELETE}>
                        <button
                          className="btn btn-ghost btn-xs btn-square text-error"
                          onClick={() => setDeletingId(account.id)}
                          title="O'chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                    </div>
                  </div>

                  {/* Account info */}
                  <div className="mt-4">
                    <h3 className="font-semibold text-base-content">
                      {account.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-base-content/50">
                        {ACCOUNT_TYPES[account.type]?.label ?? account.type}
                      </span>
                      <span className="text-xs text-base-content/30">/</span>
                      <span className="text-xs text-base-content/50">
                        {account.currency || 'UZS'}
                      </span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="mt-4">
                    <p className="text-2xl font-bold tracking-tight">
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Add / Edit Modal ---- */}
      <ModalPortal isOpen={showModal} onClose={closeModal}>
        <div className="surface-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-base-200 p-5">
            <h3 className="text-lg font-semibold">
              {editingAccount ? 'Hisobni tahrirlash' : 'Yangi hisob yaratish'}
            </h3>
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={closeModal}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-5 p-5">
            {/* Name */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Hisob nomi
                </span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Masalan: Asosiy karta"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Type */}
            <Select
              label="Hisob turi"
              value={formType}
              onChange={(val) => setFormType(val as AccountType)}
              options={Object.values(ACCOUNT_TYPES).map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />

            {/* Balance */}
            <CurrencyInput
              label={editingAccount ? 'Balans' : 'Boshlang\'ich balans'}
              value={formBalance}
              onChange={setFormBalance}
              showQuickButtons
            />

            {/* Color Picker */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Rang
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={clsx(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                      formColor === c
                        ? 'border-base-content scale-110 ring-2 ring-primary/30'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormColor(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Ikonka
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(({ value, label, Icon: IconComp }) => (
                  <button
                    key={value}
                    type="button"
                    className={clsx(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all',
                      formIcon === value
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-base-300 hover:border-base-content/30'
                    )}
                    onClick={() => setFormIcon(value)}
                  >
                    <IconComp className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-base-200 p-5">
            <button className="btn btn-ghost" onClick={closeModal}>
              Bekor qilish
            </button>
            <button
              className={clsx('btn btn-primary', submitting && 'loading')}
              onClick={handleSubmit}
              disabled={submitting || !formName.trim()}
            >
              {submitting
                ? 'Saqlanmoqda...'
                : editingAccount
                  ? 'Saqlash'
                  : 'Yaratish'}
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
