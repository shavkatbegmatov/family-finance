import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Plus, Split, TrendingDown, TrendingUp, X, Trash2 } from 'lucide-react';
import clsx from 'clsx';

import { transactionsApi } from '../../api/transactions.api';
import { formatCurrency, TRANSACTION_TYPES } from '../../config/constants';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DateInput } from '../ui/DateInput';
import { Select } from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import { ModalPortal } from './Modal';
import { TagInput } from './TagInput';
import { useTransactionDefaults } from '../../hooks/useTransactionDefaults';
import type {
  Account,
  FamilyMember,
  FinanceCategory,
  Transaction,
  TransactionRequest,
  TransactionSplitItem,
  TransactionType,
} from '../../types';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Yaratish/tahrirlash muvaffaqiyatli bo'lganda chaqiriladi. */
  onSuccess?: (transaction: Transaction) => void;
  /** Tahrirlanayotgan tranzaksiya. null bo'lsa create rejimi. */
  editingTransaction?: Transaction | null;
  /** Create rejimi uchun default tip. */
  defaultType?: TransactionType;
  /** Mavjud accounts/categories/members ro'yxati (parent yuklab beradi). */
  accounts: readonly Account[];
  categories: readonly FinanceCategory[];
  members: readonly FamilyMember[];
}

const TYPE_ICONS: Record<TransactionType, React.ElementType | null> = {
  INCOME: TrendingUp,
  EXPENSE: TrendingDown,
  TRANSFER: ArrowRightLeft,
  REVERSAL: null,
};

const buildEmptyForm = (type: TransactionType): TransactionRequest => ({
  type,
  amount: 0,
  accountId: 0,
  toAccountId: undefined,
  categoryId: undefined,
  familyMemberId: undefined,
  transactionDate: new Date().toISOString().split('T')[0],
  description: '',
});

const fromTransaction = (transaction: Transaction): TransactionRequest => ({
  type: transaction.type,
  amount: transaction.amount,
  accountId: transaction.accountId,
  toAccountId: transaction.toAccountId,
  categoryId: transaction.categoryId,
  familyMemberId: transaction.familyMemberId,
  transactionDate: transaction.transactionDate?.split('T')[0] ?? '',
  description: transaction.description ?? '',
});

export function TransactionFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingTransaction,
  defaultType = 'EXPENSE',
  accounts,
  categories,
  members,
}: TransactionFormModalProps) {
  const isEdit = Boolean(editingTransaction);

  const refData = useMemo(
    () => ({ accounts: [...accounts], categories: [...categories], members: [...members] }),
    [accounts, categories, members]
  );
  const { getDefaults, saveDefaults } = useTransactionDefaults(refData);

  const applyDefaults = useCallback(
    (type: TransactionType): TransactionRequest => {
      const base = buildEmptyForm(type);
      const defaults = getDefaults(type);
      if (!defaults) return base;
      return {
        ...base,
        accountId: defaults.accountId ?? base.accountId,
        toAccountId: defaults.toAccountId ?? base.toAccountId,
        categoryId: defaults.categoryId ?? base.categoryId,
        familyMemberId: defaults.familyMemberId ?? base.familyMemberId,
      };
    },
    [getDefaults]
  );

  const [form, setForm] = useState<TransactionRequest>(() => applyDefaults(defaultType));
  const [submitting, setSubmitting] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState<TransactionSplitItem[]>([]);

  // Modal ochilganda formani qayta sozlash
  useEffect(() => {
    if (!isOpen) return;
    setSplitMode(false);
    setSplits([]);
    if (editingTransaction) {
      setForm(fromTransaction(editingTransaction));
    } else {
      setForm(applyDefaults(defaultType));
    }
  }, [isOpen, editingTransaction, defaultType, applyDefaults]);

  const splitsTotal = useMemo(
    () => splits.reduce((sum, s) => sum + (s.amount || 0), 0),
    [splits]
  );
  const splitsValid = splitMode && splits.length >= 2 && Math.abs(splitsTotal - form.amount) < 0.01;
  const canEnableSplit = form.type !== 'TRANSFER' && form.amount > 0;

  const filteredCategories = useMemo(() => {
    if (form.type === 'TRANSFER') return [];
    const catType = form.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    return categories.filter((c) => c.type === catType);
  }, [form.type, categories]);

  const handleTypeChange = (nextType: TransactionType) => {
    if (isEdit) {
      setForm((prev) => ({
        ...prev,
        type: nextType,
        categoryId: undefined,
        toAccountId: undefined,
      }));
      return;
    }
    const next = applyDefaults(nextType);
    setForm((prev) => ({
      ...next,
      amount: prev.amount,
      transactionDate: prev.transactionDate,
      description: prev.description,
    }));
  };

  const isValid = useMemo(() => {
    if (form.amount <= 0 || !form.accountId) return false;
    if (form.type === 'TRANSFER' && !form.toAccountId) return false;
    if (splitMode) {
      if (splits.length < 2) return false;
      if (Math.abs(splitsTotal - form.amount) >= 0.01) return false;
      if (splits.some((s) => !s.categoryId || s.amount <= 0)) return false;
    }
    return true;
  }, [form, splitMode, splits, splitsTotal]);

  const addSplit = () => {
    setSplits((prev) => [...prev, { categoryId: 0, amount: 0 }]);
  };

  const updateSplit = (index: number, patch: Partial<TransactionSplitItem>) => {
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeSplit = (index: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    setSubmitting(true);
    try {
      const payload: TransactionRequest = {
        ...form,
        transactionDate: form.transactionDate.includes('T')
          ? form.transactionDate
          : form.transactionDate + 'T00:00:00',
        categoryId: splitMode ? undefined : (form.type === 'TRANSFER' ? undefined : form.categoryId),
        toAccountId: form.type === 'TRANSFER' ? form.toAccountId : undefined,
        splits: splitMode ? splits : undefined,
      };

      const response = editingTransaction
        ? await transactionsApi.update(editingTransaction.id, payload)
        : await transactionsApi.create(payload);

      if (!editingTransaction) {
        saveDefaults(payload.type, payload);
        toast.success('Tranzaksiya qo\'shildi');
      } else {
        toast.success('Tranzaksiya yangilandi');
      }

      const created = (response.data as { data: Transaction }).data;
      onSuccess?.(created);
      onClose();
    } catch {
      toast.error('Tranzaksiyani saqlashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-lg bg-base-100 lg:rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-semibold">
                {isEdit ? 'Tranzaksiyani tahrirlash' : 'Yangi tranzaksiya'}
              </h3>
              <p className="text-sm text-base-content/60">
                {isEdit
                  ? 'Tranzaksiya ma\'lumotlarini o\'zgartiring'
                  : 'Yangi moliyaviy operatsiya qo\'shing'}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Type buttons */}
            <div className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Tranzaksiya turi *
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((key) => {
                  const Icon = TYPE_ICONS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={clsx(
                        'btn btn-sm min-h-0 whitespace-nowrap',
                        form.type === key ? 'btn-primary' : 'btn-outline'
                      )}
                      onClick={() => handleTypeChange(key)}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {TRANSACTION_TYPES[key].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <CurrencyInput
              label="Summa *"
              value={form.amount}
              onChange={(val) => setForm((prev) => ({ ...prev, amount: val }))}
              showQuickButtons
            />

            {/* Account */}
            <Select
              label={form.type === 'TRANSFER' ? 'Qaysi hisobdan *' : 'Hisob *'}
              value={form.accountId || undefined}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, accountId: Number(val) || 0 }))
              }
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.name} (${formatCurrency(a.balance)})`,
              }))}
              placeholder="Hisobni tanlang"
              required
            />

            {/* To Account (TRANSFER) */}
            {form.type === 'TRANSFER' && (
              <Select
                label="Qaysi hisobga *"
                value={form.toAccountId || undefined}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, toAccountId: Number(val) || undefined }))
                }
                options={accounts
                  .filter((a) => a.id !== form.accountId)
                  .map((a) => ({
                    value: a.id,
                    label: `${a.name} (${formatCurrency(a.balance)})`,
                  }))}
                placeholder="Hisobni tanlang"
                required
              />
            )}

            {/* Category yoki Split */}
            {form.type !== 'TRANSFER' && !splitMode && (
              <Select
                label="Kategoriya"
                value={form.categoryId || undefined}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, categoryId: val ? Number(val) : undefined }))
                }
                options={[
                  { value: '', label: 'Tanlanmagan' },
                  ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Kategoriyani tanlang"
              />
            )}

            {/* Split toggle */}
            {form.type !== 'TRANSFER' && (
              <div className="flex items-center justify-between rounded-xl border border-base-300 px-3 py-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={splitMode}
                    onChange={(e) => {
                      setSplitMode(e.target.checked);
                      if (e.target.checked && splits.length === 0) {
                        setSplits([
                          { categoryId: 0, amount: 0 },
                          { categoryId: 0, amount: 0 },
                        ]);
                      }
                    }}
                    disabled={!canEnableSplit}
                  />
                  <Split className="h-4 w-4" />
                  Bir nechta kategoriyaga bo'lish
                </label>
                {splitMode && (
                  <span className={clsx('text-xs', splitsValid ? 'text-success' : 'text-warning')}>
                    {splitsTotal.toLocaleString()} / {form.amount.toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Splits ro'yxati */}
            {splitMode && (
              <div className="space-y-2 rounded-xl border border-base-300 p-3">
                {splits.map((split, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <Select
                      label={index === 0 ? 'Kategoriya' : undefined}
                      value={split.categoryId || undefined}
                      onChange={(val) => updateSplit(index, { categoryId: Number(val) || 0 })}
                      options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
                      placeholder="Kategoriya"
                      className="flex-1"
                    />
                    <input
                      type="number"
                      className="input input-bordered input-sm w-32"
                      value={split.amount || ''}
                      onChange={(e) => updateSplit(index, { amount: Number(e.target.value) || 0 })}
                      placeholder="Summa"
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={() => removeSplit(index)}
                      className="btn btn-ghost btn-sm btn-square"
                      disabled={splits.length <= 2}
                      aria-label="Ulushni o'chirish"
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSplit}
                  className="btn btn-ghost btn-sm gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Ulush qo'shish
                </button>
              </div>
            )}

            {/* Family member */}
            <Select
              label="Oila a'zosi"
              value={form.familyMemberId || undefined}
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  familyMemberId: val ? Number(val) : undefined,
                }))
              }
              options={[
                { value: '', label: 'Tanlanmagan' },
                ...members.map((m) => ({ value: m.id, label: m.fullName })),
              ]}
              placeholder="Oila a'zosini tanlang"
            />

            {/* Date */}
            <DateInput
              label="Sana"
              required
              value={form.transactionDate}
              onChange={(val) => setForm((prev) => ({ ...prev, transactionDate: val }))}
            />

            {/* Description */}
            <TextArea
              label="Tavsif"
              value={form.description ?? ''}
              onChange={(val) => setForm((prev) => ({ ...prev, description: val }))}
              placeholder="Qo'shimcha ma'lumot..."
              rows={2}
            />

            {/* Tags */}
            <TagInput
              selectedIds={form.tagIds ?? []}
              onChange={(ids) => setForm((prev) => ({ ...prev, tagIds: ids }))}
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !isValid}
            >
              {submitting && <span className="loading loading-spinner loading-sm" />}
              {isEdit ? 'Saqlash' : "Qo'shish"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
