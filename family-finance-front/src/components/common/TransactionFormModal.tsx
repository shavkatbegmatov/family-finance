import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Check, Plus, Split, TrendingDown, TrendingUp, Wand2, X, Trash2 } from 'lucide-react';
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
  tagIds: transaction.tagIds ?? [],
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
    if (editingTransaction) {
      setForm(fromTransaction(editingTransaction));
      const existingSplits = editingTransaction.splits ?? [];
      if (existingSplits.length > 0) {
        setSplits(
          existingSplits.map((s) => ({
            categoryId: s.categoryId,
            amount: s.amount,
            note: s.note,
          }))
        );
        setSplitMode(true);
      } else {
        setSplits([]);
        setSplitMode(false);
      }
    } else {
      setForm(applyDefaults(defaultType));
      setSplits([]);
      setSplitMode(false);
    }
  }, [isOpen, editingTransaction, defaultType, applyDefaults]);

  const splitsTotal = useMemo(
    () => splits.reduce((sum, s) => sum + (s.amount || 0), 0),
    [splits]
  );
  const splitsDiff = form.amount - splitsTotal;
  const splitsValid = splitMode && splits.length >= 2 && Math.abs(splitsDiff) < 0.01;
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

  /** Qolgan farqni oxirgi qatorga qo'shadi (yoki ayiradi). */
  const autofillLast = () => {
    if (Math.abs(splitsDiff) < 0.01 || splits.length === 0) return;
    setSplits((prev) => {
      const next = [...prev];
      const lastIdx = next.length - 1;
      const newAmount = (next[lastIdx].amount || 0) + splitsDiff;
      if (newAmount > 0) {
        next[lastIdx] = { ...next[lastIdx], amount: Math.round(newAmount * 100) / 100 };
      }
      return next;
    });
  };

  /** Summani teng ulushlarga bo'lib taqsimlaydi. */
  const distributeEvenly = () => {
    if (splits.length === 0 || form.amount <= 0) return;
    const perItem = Math.floor((form.amount * 100) / splits.length) / 100;
    const remainder = Math.round((form.amount - perItem * splits.length) * 100) / 100;
    setSplits((prev) =>
      prev.map((s, i) => ({
        ...s,
        amount: i === prev.length - 1 ? perItem + remainder : perItem,
      }))
    );
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

  const isTransfer = form.type === 'TRANSFER';

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col bg-base-100 shadow-2xl lg:max-w-5xl lg:rounded-2xl">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-base-200 bg-base-100 px-4 py-4 sm:px-6 lg:rounded-t-2xl">
          <div>
            <h3 className="text-xl font-semibold">
              {isEdit ? 'Tranzaksiyani tahrirlash' : 'Yangi tranzaksiya'}
            </h3>
            <p className="text-sm text-base-content/60">
              {isEdit
                ? "Tranzaksiya ma'lumotlarini o'zgartiring"
                : "Yangi moliyaviy operatsiya qo'shing"}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Yopish">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
            {/* ===== LEFT COLUMN ===== */}
            <div className="space-y-4">
              {/* Type buttons */}
              <div className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Tranzaksiya turi *
                </span>
                <div className="grid grid-cols-3 gap-2">
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
                label={isTransfer ? 'Qaysi hisobdan *' : 'Hisob *'}
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
              {isTransfer && (
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

              {/* Date */}
              <DateInput
                label="Sana *"
                required
                value={form.transactionDate}
                onChange={(val) => setForm((prev) => ({ ...prev, transactionDate: val }))}
              />

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
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="space-y-4">
              {/* Category (oddiy rejim) */}
              {!isTransfer && !splitMode && (
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
              {!isTransfer && (
                <div
                  className={clsx(
                    'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                    splitMode ? 'border-primary/40 bg-primary/5' : 'border-base-300'
                  )}
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
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
                  {!canEnableSplit && !splitMode && (
                    <span className="text-xs text-base-content/50">
                      avval summani kiriting
                    </span>
                  )}
                </div>
              )}

              {/* Splits ro'yxati */}
              {splitMode && (
                <div className="space-y-3 rounded-xl border border-base-300 bg-base-200/30 p-3">
                  {/* Statistic strip */}
                  <div
                    className={clsx(
                      'flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors',
                      splitsValid
                        ? 'bg-success/15 text-success'
                        : splitsDiff > 0
                          ? 'bg-warning/15 text-warning'
                          : 'bg-error/15 text-error'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {splitsValid ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Split className="h-4 w-4" />
                      )}
                      <span>
                        {formatCurrency(splitsTotal)} / {formatCurrency(form.amount)}
                      </span>
                    </div>
                    <div className="text-xs font-medium">
                      {splitsValid && "Yig'indi mos keladi"}
                      {!splitsValid && splitsDiff > 0 &&
                        `${formatCurrency(splitsDiff)} yetishmayapti`}
                      {!splitsValid && splitsDiff < 0 &&
                        `${formatCurrency(Math.abs(splitsDiff))} ortiqcha`}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={autofillLast}
                      disabled={splitsValid || form.amount <= 0}
                      className="btn btn-ghost btn-xs gap-1"
                      title="Farqni oxirgi qatorga taqsimlash"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Qolganini oxirgi qatorga
                    </button>
                    <button
                      type="button"
                      onClick={distributeEvenly}
                      disabled={splits.length === 0 || form.amount <= 0}
                      className="btn btn-ghost btn-xs gap-1"
                      title="Teng ulushlarga bo'lib taqsimlash"
                    >
                      <Split className="h-3.5 w-3.5" />
                      Teng taqsimlash
                    </button>
                  </div>

                  {/* Rows */}
                  <div className="space-y-2">
                    {splits.map((split, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <Select
                          value={split.categoryId || undefined}
                          onChange={(val) => updateSplit(index, { categoryId: Number(val) || 0 })}
                          options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
                          placeholder="Kategoriya"
                          className="flex-1"
                        />
                        <div className="w-36 shrink-0">
                          <CurrencyInput
                            value={split.amount}
                            onChange={(val) => updateSplit(index, { amount: val })}
                            size="sm"
                          />
                        </div>
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
                  </div>

                  <button
                    type="button"
                    onClick={addSplit}
                    className="btn btn-ghost btn-sm w-full justify-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Ulush qo'shish
                  </button>
                </div>
              )}

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
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t border-base-200 bg-base-100 px-4 py-3 sm:px-6 lg:rounded-b-2xl">
          <div className="text-xs text-base-content/50">
            {!isValid && splitMode && !splitsValid && (
              <span className="text-warning">
                Ulushlar yig'indisini summaga moslang
              </span>
            )}
            {!isValid && !splitMode && form.amount <= 0 && (
              <span className="text-base-content/50">Summani kiriting</span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
