import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  Edit2,
  Hash,
  RefreshCw,
  Repeat,
  Split as SplitIcon,
  Tag as TagIcon,
  TrendingDown,
  TrendingUp,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { transactionsApi } from '../../api/transactions.api';
import { accountsApi } from '../../api/accounts.api';
import { categoriesApi } from '../../api/categories.api';
import { familyMembersApi } from '../../api/family-members.api';
import { tagsApi, type TagResponse } from '../../api/tags.api';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from '../../config/constants';
import { ModalPortal } from '../../components/common/Modal';
import { TransactionFormModal } from '../../components/common/TransactionFormModal';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PermissionCode } from '../../hooks/usePermission';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type {
  Account,
  ApiResponse,
  FamilyMember,
  FinanceCategory,
  PagedResponse,
  Transaction,
  TransactionType,
} from '../../types';

const TYPE_META: Record<
  TransactionType,
  { label: string; gradient: string; icon: React.ElementType; sign: string; color: string }
> = {
  INCOME: {
    label: 'Daromad',
    gradient: 'from-success/15 to-success/5',
    icon: TrendingUp,
    sign: '+',
    color: 'text-success',
  },
  EXPENSE: {
    label: 'Xarajat',
    gradient: 'from-error/15 to-error/5',
    icon: TrendingDown,
    sign: '-',
    color: 'text-error',
  },
  TRANSFER: {
    label: "O'tkazma",
    gradient: 'from-info/15 to-info/5',
    icon: ArrowRightLeft,
    sign: '',
    color: 'text-info',
  },
  REVERSAL: {
    label: 'Storno',
    gradient: 'from-warning/15 to-warning/5',
    icon: RefreshCw,
    sign: '',
    color: 'text-warning',
  },
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  CONFIRMED: { label: 'Tasdiqlangan', badge: 'badge-success' },
  REVERSED: { label: 'Storno qilingan', badge: 'badge-warning' },
  PENDING: { label: 'Kutilmoqda', badge: 'badge-info' },
};

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reference data — modal va ko'rsatishlar uchun
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [allTags, setAllTags] = useState<TagResponse[]>([]);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseSubmitting, setReverseSubmitting] = useState(false);

  // ---------- Loaders ----------

  const loadTransaction = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await transactionsApi.getById(Number(id));
      const data = (res.data as ApiResponse<Transaction>).data;
      setTransaction(data);
    } catch {
      setError("Tranzaksiya topilmadi yoki yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [accountsRes, categoriesRes, membersRes, tagsRes] = await Promise.all([
        accountsApi.getList(),
        categoriesApi.getAll(),
        familyMembersApi.getList(),
        tagsApi.getAll(),
      ]);
      setAccounts(
        (accountsRes.data as ApiResponse<Account[]>).data ?? (accountsRes.data as Account[])
      );

      const catData = categoriesRes.data as
        | ApiResponse<PagedResponse<FinanceCategory>>
        | ApiResponse<FinanceCategory[]>;
      if ('content' in (catData.data as PagedResponse<FinanceCategory>)) {
        setCategories((catData.data as PagedResponse<FinanceCategory>).content);
      } else {
        setCategories(catData.data as FinanceCategory[]);
      }

      setMembers(
        (membersRes.data as ApiResponse<FamilyMember[]>).data ??
          (membersRes.data as FamilyMember[])
      );
      setAllTags((tagsRes.data as ApiResponse<TagResponse[]>).data);
    } catch {
      // Reference data is non-blocking for read-only display
    }
  }, []);

  useEffect(() => {
    void loadTransaction();
  }, [loadTransaction]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  // ---------- Computed ----------

  const typeMeta = transaction ? TYPE_META[transaction.type] : null;
  const statusMeta = transaction
    ? STATUS_META[transaction.status ?? 'CONFIRMED'] ?? STATUS_META.CONFIRMED
    : null;
  const isReversed = transaction?.status === 'REVERSED';
  const isReversal = transaction?.type === 'REVERSAL';
  const canEdit = transaction && !isReversed && !isReversal;
  const canReverse = transaction && !isReversed && !isReversal;

  const splitsTotal = useMemo(
    () => (transaction?.splits ?? []).reduce((sum, s) => sum + (s.amount || 0), 0),
    [transaction?.splits]
  );

  const linkedTags = useMemo(() => {
    if (!transaction?.tagIds || transaction.tagIds.length === 0) return [];
    return allTags.filter((t) => transaction.tagIds?.includes(t.id));
  }, [transaction?.tagIds, allTags]);

  // ---------- Navigation ----------

  const handleBack = useCallback(() => {
    if (!id) {
      navigate('/transactions');
      return;
    }
    navigate(`/transactions?highlight=${id}`);
  }, [id, navigate]);

  // Klaviatura yorliqlari: Backspace orqaga, Esc yopish (modallar yopiq bo'lganda)
  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          definition: { key: 'Backspace' },
          handler: handleBack,
          label: 'Orqaga',
        },
      ],
      [handleBack]
    ),
    { enabled: !showEditModal && !showReverseModal }
  );

  // ---------- Actions ----------

  const handleReverse = async () => {
    if (!transaction) return;
    setReverseSubmitting(true);
    try {
      await transactionsApi.reverse(transaction.id, 'Foydalanuvchi tomonidan storno qilindi');
      toast.success('Tranzaksiya storno qilindi');
      setShowReverseModal(false);
      void loadTransaction();
    } catch {
      toast.error('Storno qilishda xatolik');
    } finally {
      setReverseSubmitting(false);
    }
  };

  // ---------- Render helpers ----------

  const renderField = (label: string, value: React.ReactNode, icon?: React.ElementType) => {
    const Icon = icon;
    return (
      <div className="flex items-start gap-3 py-2">
        {Icon && (
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-base-200 text-base-content/60">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
            {label}
          </div>
          <div className="mt-0.5 break-words text-sm font-medium text-base-content">
            {value || <span className="text-base-content/40">—</span>}
          </div>
        </div>
      </div>
    );
  };

  // ---------- Loading / Error ----------

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="surface-card animate-pulse p-6">
          <div className="mb-4 h-8 w-1/3 rounded bg-base-200" />
          <div className="h-12 w-1/2 rounded bg-base-200" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="surface-card h-64 animate-pulse" />
          <div className="surface-card h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !transaction || !typeMeta || !statusMeta) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-3 p-12 text-center">
        <X className="h-12 w-12 text-error/40" />
        <h2 className="text-lg font-semibold">{error ?? 'Tranzaksiya topilmadi'}</h2>
        <button className="btn btn-primary mt-2" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="h-4 w-4" />
          Tranzaksiyalar ro'yxati
        </button>
      </div>
    );
  }

  const TypeIcon = typeMeta.icon;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* ===== Header ===== */}
      <div className="surface-card flex items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={handleBack}
            aria-label="Orqaga"
            title="Orqaga (Backspace)"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-base-content/50">
              Tranzaksiya tafsiloti
            </div>
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              #{transaction.id} · {typeMeta.label}
            </h1>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm btn-square"
          onClick={handleBack}
          aria-label="Yopish"
          title="Yopish (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ===== Hero ===== */}
      <div
        className={clsx(
          'surface-card relative overflow-hidden border-l-4 p-6',
          transaction.type === 'INCOME' && 'border-success',
          transaction.type === 'EXPENSE' && 'border-error',
          transaction.type === 'TRANSFER' && 'border-info',
          transaction.type === 'REVERSAL' && 'border-warning'
        )}
      >
        <div className={clsx('absolute inset-0 -z-[1] bg-gradient-to-br', typeMeta.gradient)} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                'grid h-14 w-14 place-items-center rounded-2xl bg-base-100 shadow-sm',
                typeMeta.color
              )}
            >
              <TypeIcon className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={clsx('badge', statusMeta.badge)}>{statusMeta.label}</span>
                {transaction.isRecurring && (
                  <span className="badge badge-outline gap-1">
                    <Repeat className="h-3 w-3" />
                    Takrorlanuvchi
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={clsx('text-3xl font-bold tracking-tight', typeMeta.color)}>
                  {typeMeta.sign}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-base-content/60">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(transaction.transactionDate)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <PermissionGate permission={PermissionCode.TRANSACTIONS_UPDATE}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowEditModal(true)}>
                  <Edit2 className="h-4 w-4" />
                  Tahrirlash
                </button>
              </PermissionGate>
            )}
            {canReverse && (
              <PermissionGate permission={PermissionCode.TRANSACTIONS_DELETE}>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => setShowReverseModal(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Storno qilish
                </button>
              </PermissionGate>
            )}
          </div>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column: asosiy ma'lumotlar */}
        <div className="surface-card divide-y divide-base-200/60 p-4 sm:p-6">
          <div className="pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Asosiy ma'lumotlar
            </h3>
          </div>

          {renderField(
            transaction.type === 'TRANSFER' ? 'Qaysi hisobdan' : 'Hisob',
            <>
              {transaction.accountName}
              {transaction.debitAccCode && transaction.type !== 'TRANSFER' && (
                <span className="ml-2 text-xs text-base-content/50">
                  {transaction.debitAccCode}
                </span>
              )}
            </>,
            Wallet
          )}

          {transaction.type === 'TRANSFER' && transaction.toAccountName && (
            renderField('Qaysi hisobga', transaction.toAccountName, ArrowRightLeft)
          )}

          {transaction.categoryName && (
            renderField('Kategoriya', transaction.categoryName, Hash)
          )}

          {transaction.familyMemberName && (
            renderField('Oila a\'zosi', transaction.familyMemberName, User)
          )}

          {transaction.description && (
            renderField('Tavsif', transaction.description)
          )}

          {renderField(
            'Yaratilgan vaqt',
            <span className="text-xs text-base-content/60">
              {formatDateTime(transaction.createdAt)}
            </span>,
            Calendar
          )}
        </div>

        {/* Right column: balans, splits, tags */}
        <div className="space-y-4">
          {/* Splits */}
          {transaction.splits && transaction.splits.length > 0 && (
            <div className="surface-card p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  <SplitIcon className="h-4 w-4" />
                  Ulushlar bo'yicha taqsimot
                </h3>
                <span className="text-xs text-base-content/60">
                  {transaction.splits.length} ta ulush
                </span>
              </div>
              <div className="space-y-2">
                {transaction.splits.map((split) => {
                  const percent = transaction.amount > 0
                    ? (split.amount / transaction.amount) * 100
                    : 0;
                  return (
                    <div key={split.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{split.categoryName ?? '—'}</span>
                        <span className="font-semibold">{formatCurrency(split.amount)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-200">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                        />
                      </div>
                      <div className="text-xs text-base-content/50">{percent.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-base-200 pt-3">
                <span className="text-xs text-base-content/60">Jami</span>
                <span className="font-semibold">{formatCurrency(splitsTotal)}</span>
              </div>
            </div>
          )}

          {/* Balans tarixi */}
          {(transaction.balanceBeforeDebit !== undefined ||
            transaction.balanceBeforeCredit !== undefined) && (
            <div className="surface-card p-4 sm:p-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Balans o'zgarishi
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {transaction.debitAccountName && (
                  <div className="rounded-xl border border-base-200 p-3">
                    <div className="mb-1 flex items-center gap-1 text-xs text-base-content/50">
                      <span>Debit</span>
                      <span className="truncate font-medium text-base-content/80">
                        {transaction.debitAccountName}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-base-content/60">Avval</span>
                        <span>{formatCurrency(transaction.balanceBeforeDebit ?? 0)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-base-content/60">Keyin</span>
                        <span className="text-success">
                          {formatCurrency(transaction.balanceAfterDebit ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {transaction.creditAccountName && (
                  <div className="rounded-xl border border-base-200 p-3">
                    <div className="mb-1 flex items-center gap-1 text-xs text-base-content/50">
                      <span>Credit</span>
                      <span className="truncate font-medium text-base-content/80">
                        {transaction.creditAccountName}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-base-content/60">Avval</span>
                        <span>{formatCurrency(transaction.balanceBeforeCredit ?? 0)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-base-content/60">Keyin</span>
                        <span className="text-error">
                          {formatCurrency(transaction.balanceAfterCredit ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {linkedTags.length > 0 && (
            <div className="surface-card p-4 sm:p-6">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                <TagIcon className="h-4 w-4" />
                Teglar
              </h3>
              <div className="flex flex-wrap gap-2">
                {linkedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}
                  >
                    <TagIcon className="h-3 w-3" />
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recurring details */}
          {transaction.isRecurring && transaction.recurringPattern && (
            <div className="surface-card p-4 sm:p-6">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                <Repeat className="h-4 w-4" />
                Takrorlanish
              </h3>
              <p className="text-sm text-base-content/80">
                Bu tranzaksiya har <strong>{transaction.recurringPattern.toLowerCase()}</strong>{' '}
                avtomatik takrorlanadi.
              </p>
            </div>
          )}

          {/* Reversal link */}
          {transaction.originalTransactionId && (
            <div className="surface-card p-4 sm:p-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Asl tranzaksiya
              </h3>
              <button
                className="btn btn-link btn-sm gap-1 pl-0"
                onClick={() => navigate(`/transactions/${transaction.originalTransactionId}`)}
              >
                #{transaction.originalTransactionId} ga o'tish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== Edit Modal ===== */}
      <TransactionFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          void loadTransaction();
        }}
        editingTransaction={transaction}
        accounts={accounts}
        categories={categories}
        members={members}
      />

      {/* ===== Reverse Modal ===== */}
      <ModalPortal isOpen={showReverseModal} onClose={() => setShowReverseModal(false)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-warning" />
              </div>
              <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => setShowReverseModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="text-lg font-semibold mb-2">Tranzaksiyani storno qilish</h3>
            <p className="text-sm text-base-content/60 mb-4">
              Bu tranzaksiya uchun teskari operatsiya yaratiladi. Asl yozuv saqlanib qoladi,
              lekin uning ta'siri bekor qilinadi.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => setShowReverseModal(false)}
                disabled={reverseSubmitting}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-warning"
                onClick={handleReverse}
                disabled={reverseSubmitting}
              >
                {reverseSubmitting && <span className="loading loading-spinner loading-sm" />}
                Storno qilish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
