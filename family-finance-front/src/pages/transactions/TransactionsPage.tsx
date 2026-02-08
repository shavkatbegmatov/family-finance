import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Filter,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';

import { transactionsApi } from '../../api/transactions.api';
import { accountsApi } from '../../api/accounts.api';
import { categoriesApi } from '../../api/categories.api';
import { familyMembersApi } from '../../api/family-members.api';
import {
  formatCurrency,
  formatDate,
  TRANSACTION_TYPES,
} from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { DateInput } from '../../components/ui/DateInput';
import { TextArea } from '../../components/ui/TextArea';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import type {
  Transaction,
  TransactionRequest,
  TransactionType,
  TransactionFilters,
  Account,
  FinanceCategory,
  FamilyMember,
  ApiResponse,
  PagedResponse,
} from '../../types';

type TabType = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'ALL', label: 'Barchasi', icon: ArrowLeftRight },
  { id: 'INCOME', label: 'Daromad', icon: TrendingUp },
  { id: 'EXPENSE', label: 'Xarajat', icon: TrendingDown },
  { id: 'TRANSFER', label: "O'tkazma", icon: ArrowRightLeft },
];

const EMPTY_FORM: TransactionRequest = {
  type: 'EXPENSE',
  amount: 0,
  accountId: 0,
  toAccountId: undefined,
  categoryId: undefined,
  familyMemberId: undefined,
  transactionDate: new Date().toISOString().split('T')[0],
  description: '',
};

export function TransactionsPage() {
  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Loading
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterAccountId, setFilterAccountId] = useState<number | undefined>(undefined);
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>(undefined);
  const [filterMemberId, setFilterMemberId] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionRequest>({ ...EMPTY_FORM });

  // Build filters object
  const filters = useMemo<TransactionFilters>(() => {
    const f: TransactionFilters = {};
    if (activeTab !== 'ALL') f.type = activeTab as TransactionType;
    if (filterFrom) f.from = filterFrom;
    if (filterTo) f.to = filterTo;
    if (filterAccountId) f.accountId = filterAccountId;
    if (filterCategoryId) f.categoryId = filterCategoryId;
    if (filterMemberId) f.memberId = filterMemberId;
    return f;
  }, [activeTab, filterFrom, filterTo, filterAccountId, filterCategoryId, filterMemberId]);

  // Load reference data
  const loadReferenceData = useCallback(async () => {
    try {
      const [accountsRes, categoriesRes, membersRes] = await Promise.all([
        accountsApi.getList(),
        categoriesApi.getAll(),
        familyMembersApi.getList(),
      ]);
      setAccounts(
        (accountsRes.data as ApiResponse<Account[]>).data ?? (accountsRes.data as Account[])
      );

      const catData = categoriesRes.data as ApiResponse<PagedResponse<FinanceCategory>> | ApiResponse<FinanceCategory[]>;
      if ('content' in (catData.data as PagedResponse<FinanceCategory>)) {
        setCategories((catData.data as PagedResponse<FinanceCategory>).content);
      } else {
        setCategories(catData.data as FinanceCategory[]);
      }

      setMembers(
        (membersRes.data as ApiResponse<FamilyMember[]>).data ?? (membersRes.data as FamilyMember[])
      );
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  }, []);

  // Load transactions
  const loadTransactions = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await transactionsApi.getAll(page, pageSize, filters);
      const data = (res.data as ApiResponse<PagedResponse<Transaction>>).data;
      setTransactions(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  // Initial load
  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void loadTransactions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters]);

  // Tab change -> reset page
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(0);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // Clear filters
  const clearFilters = () => {
    setFilterFrom('');
    setFilterTo('');
    setFilterAccountId(undefined);
    setFilterCategoryId(undefined);
    setFilterMemberId(undefined);
    setPage(0);
  };

  const hasActiveFilters = filterFrom || filterTo || filterAccountId || filterCategoryId || filterMemberId;

  // Open form modal for create
  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setForm({ ...EMPTY_FORM });
    setShowFormModal(true);
  };

  // Open form modal for edit
  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setForm({
      type: transaction.type,
      amount: transaction.amount,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
      categoryId: transaction.categoryId,
      familyMemberId: transaction.familyMemberId,
      transactionDate: transaction.transactionDate?.split('T')[0] ?? '',
      description: transaction.description ?? '',
    });
    setShowFormModal(true);
  };

  // Open delete confirmation
  const handleOpenDelete = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
    setShowDeleteModal(true);
  };

  // Close modals
  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingTransaction(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setDeletingTransaction(null);
  };

  // Submit create/update
  const handleSubmit = async () => {
    if (!form.accountId || form.amount <= 0) return;
    if (form.type === 'TRANSFER' && !form.toAccountId) return;

    setSubmitting(true);
    try {
      const payload: TransactionRequest = {
        ...form,
        categoryId: form.type === 'TRANSFER' ? undefined : form.categoryId,
        toAccountId: form.type === 'TRANSFER' ? form.toAccountId : undefined,
      };

      if (editingTransaction) {
        await transactionsApi.update(editingTransaction.id, payload);
      } else {
        await transactionsApi.create(payload);
      }

      handleCloseForm();
      void loadTransactions();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit delete
  const handleDelete = async () => {
    if (!deletingTransaction) return;
    setSubmitting(true);
    try {
      await transactionsApi.delete(deletingTransaction.id);
      handleCloseDelete();
      void loadTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Type badge renderer
  const renderTypeBadge = (type: TransactionType) => {
    const config = {
      INCOME: { label: 'Daromad', class: 'badge-success' },
      EXPENSE: { label: 'Xarajat', class: 'badge-error' },
      TRANSFER: { label: "O'tkazma", class: 'badge-info' },
    };
    const c = config[type];
    return <span className={clsx('badge badge-sm', c.class)}>{c.label}</span>;
  };

  // Amount renderer
  const renderAmount = (transaction: Transaction) => {
    const colorClass =
      transaction.type === 'INCOME'
        ? 'text-success'
        : transaction.type === 'EXPENSE'
          ? 'text-error'
          : 'text-info';
    const prefix =
      transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : '';
    return (
      <span className={clsx('font-semibold', colorClass)}>
        {prefix}{formatCurrency(transaction.amount)}
      </span>
    );
  };

  // Filtered categories based on transaction type in form
  const filteredFormCategories = useMemo(() => {
    if (form.type === 'TRANSFER') return [];
    const catType = form.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    return categories.filter((c) => c.type === catType);
  }, [form.type, categories]);

  // Table columns
  const columns: Column<Transaction>[] = useMemo(
    () => [
      {
        key: 'transactionDate',
        header: 'Sana',
        render: (t) => (
          <div>
            <div className="font-medium">{formatDate(t.transactionDate)}</div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Tur',
        render: (t) => renderTypeBadge(t.type),
      },
      {
        key: 'amount',
        header: 'Summa',
        getValue: (t) => t.amount,
        render: (t) => renderAmount(t),
      },
      {
        key: 'accountName',
        header: 'Hisob',
        render: (t) => (
          <div>
            <span>{t.accountName}</span>
            {t.type === 'TRANSFER' && t.toAccountName && (
              <span className="text-base-content/50">
                {' '}<ArrowRightLeft className="inline h-3 w-3" />{' '}
                {t.toAccountName}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'categoryName',
        header: 'Kategoriya',
        render: (t) => (
          <span className="text-base-content/80">{t.categoryName || '—'}</span>
        ),
      },
      {
        key: 'familyMemberName',
        header: "Oila a'zosi",
        render: (t) => (
          <span className="text-base-content/80">{t.familyMemberName || '—'}</span>
        ),
      },
      {
        key: 'description',
        header: 'Tavsif',
        render: (t) => (
          <span className="text-sm text-base-content/60 max-w-[200px] truncate block">
            {t.description || '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        sortable: false,
        className: 'w-24',
        render: (t) => (
          <div className="flex items-center gap-1">
            <PermissionGate permission={PermissionCode.TRANSACTIONS_UPDATE}>
              <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(t);
                }}
                title="Tahrirlash"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.TRANSACTIONS_DELETE}>
              <button
                className="btn btn-ghost btn-sm btn-square text-error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDelete(t);
                }}
                title="O'chirish"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </PermissionGate>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="section-title">Tranzaksiyalar</h1>
          <p className="section-subtitle">Barcha moliyaviy operatsiyalar</p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate permission={PermissionCode.TRANSACTIONS_CREATE}>
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Yangi tranzaksiya
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface-card">
        <div className="flex overflow-x-auto border-b border-base-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}

          {/* Filter toggle */}
          <div className="ml-auto flex items-center px-3">
            <button
              className={clsx(
                'btn btn-ghost btn-sm gap-1',
                showFilters && 'btn-active'
              )}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtr
              {hasActiveFilters && (
                <span className="badge badge-primary badge-xs ml-1">!</span>
              )}
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="border-b border-base-200 p-4 surface-soft">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
              {/* Date from */}
              <DateInput
                label="Boshlanish sanasi"
                value={filterFrom}
                onChange={(val) => {
                  setFilterFrom(val);
                  setPage(0);
                }}
                showTodayButton={false}
                className="lg:w-48"
              />

              {/* Date to */}
              <DateInput
                label="Tugash sanasi"
                value={filterTo}
                onChange={(val) => {
                  setFilterTo(val);
                  setPage(0);
                }}
                showTodayButton={false}
                className="lg:w-48"
              />

              {/* Account filter */}
              <Select
                value={filterAccountId}
                onChange={(val) => {
                  setFilterAccountId(val ? Number(val) : undefined);
                  setPage(0);
                }}
                options={[
                  { value: '', label: 'Barcha hisoblar' },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
                placeholder="Barcha hisoblar"
                className="lg:w-44"
              />

              {/* Category filter */}
              <Select
                value={filterCategoryId}
                onChange={(val) => {
                  setFilterCategoryId(val ? Number(val) : undefined);
                  setPage(0);
                }}
                options={[
                  { value: '', label: 'Barcha kategoriyalar' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="Barcha kategoriyalar"
                className="lg:w-44"
              />

              {/* Member filter */}
              <Select
                value={filterMemberId}
                onChange={(val) => {
                  setFilterMemberId(val ? Number(val) : undefined);
                  setPage(0);
                }}
                options={[
                  { value: '', label: "Barcha a'zolar" },
                  ...members.map((m) => ({ value: m.id, label: m.fullName })),
                ]}
                placeholder="Barcha a'zolar"
                className="lg:w-44"
              />

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  className="btn btn-ghost btn-sm text-error"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4" />
                  Tozalash
                </button>
              )}
            </div>
          </div>
        )}

        {/* Data Table */}
        <DataTable
          data={transactions}
          columns={columns}
          keyExtractor={(t) => t.id}
          loading={loading}
          emptyIcon={<ArrowLeftRight className="h-12 w-12" />}
          emptyTitle="Tranzaksiyalar topilmadi"
          emptyDescription="Filtrlarni o'zgartirib ko'ring yoki yangi tranzaksiya qo'shing"
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          renderMobileCard={(t) => (
            <div className="surface-panel flex flex-col gap-3 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {renderTypeBadge(t.type)}
                  <span className="text-sm text-base-content/60">
                    {formatDate(t.transactionDate)}
                  </span>
                </div>
                {renderAmount(t)}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="space-y-0.5">
                  <div className="text-base-content/80">
                    {t.accountName}
                    {t.type === 'TRANSFER' && t.toAccountName && (
                      <span className="text-base-content/50">
                        {' '}<ArrowRightLeft className="inline h-3 w-3" />{' '}
                        {t.toAccountName}
                      </span>
                    )}
                  </div>
                  {t.categoryName && (
                    <div className="text-xs text-base-content/60">{t.categoryName}</div>
                  )}
                  {t.familyMemberName && (
                    <div className="text-xs text-base-content/60">{t.familyMemberName}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <PermissionGate permission={PermissionCode.TRANSACTIONS_UPDATE}>
                    <button
                      className="btn btn-ghost btn-xs btn-square"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(t);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PermissionCode.TRANSACTIONS_DELETE}>
                    <button
                      className="btn btn-ghost btn-xs btn-square text-error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDelete(t);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGate>
                </div>
              </div>

              {t.description && (
                <p className="text-xs text-base-content/50 truncate">{t.description}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* Create/Edit Modal */}
      <ModalPortal isOpen={showFormModal} onClose={handleCloseForm}>
        <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingTransaction ? 'Tranzaksiyani tahrirlash' : 'Yangi tranzaksiya'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingTransaction
                    ? 'Tranzaksiya ma\'lumotlarini o\'zgartiring'
                    : 'Yangi moliyaviy operatsiya qo\'shing'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={handleCloseForm}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Transaction type */}
              <div className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Tranzaksiya turi *
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TRANSACTION_TYPES).map(([key, { label }]) => (
                    <button
                      key={key}
                      type="button"
                      className={clsx(
                        'btn btn-sm',
                        form.type === key ? 'btn-primary' : 'btn-outline'
                      )}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          type: key as TransactionType,
                          categoryId: undefined,
                          toAccountId: undefined,
                        }))
                      }
                    >
                      {key === 'INCOME' && <TrendingUp className="h-4 w-4" />}
                      {key === 'EXPENSE' && <TrendingDown className="h-4 w-4" />}
                      {key === 'TRANSFER' && <ArrowRightLeft className="h-4 w-4" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="form-control">
                <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                  Summa *
                </span>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  placeholder="0"
                  min={0}
                  value={form.amount || ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))
                  }
                />
              </div>

              {/* Account */}
              <Select
                label={form.type === 'TRANSFER' ? 'Qaysi hisobdan *' : 'Hisob *'}
                value={form.accountId || undefined}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, accountId: Number(val) || 0 }))
                }
                options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` }))}
                placeholder="Hisobni tanlang"
                required
              />

              {/* To Account (only for TRANSFER) */}
              {form.type === 'TRANSFER' && (
                <Select
                  label="Qaysi hisobga *"
                  value={form.toAccountId || undefined}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, toAccountId: Number(val) || undefined }))
                  }
                  options={accounts
                    .filter((a) => a.id !== form.accountId)
                    .map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` }))}
                  placeholder="Hisobni tanlang"
                  required
                />
              )}

              {/* Category (not for TRANSFER) */}
              {form.type !== 'TRANSFER' && (
                <Select
                  label="Kategoriya"
                  value={form.categoryId || undefined}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, categoryId: val ? Number(val) : undefined }))
                  }
                  options={[
                    { value: '', label: 'Tanlanmagan' },
                    ...filteredFormCategories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  placeholder="Kategoriyani tanlang"
                />
              )}

              {/* Family member */}
              <Select
                label="Oila a'zosi"
                value={form.familyMemberId || undefined}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, familyMemberId: val ? Number(val) : undefined }))
                }
                options={[
                  { value: '', label: 'Tanlanmagan' },
                  ...members.map((m) => ({ value: m.id, label: m.fullName })),
                ]}
                placeholder="Oila a'zosini tanlang"
              />

              {/* Transaction date */}
              <DateInput
                label="Sana"
                required
                value={form.transactionDate}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, transactionDate: val }))
                }
              />

              {/* Description */}
              <TextArea
                label="Tavsif"
                value={form.description ?? ''}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, description: val }))
                }
                placeholder="Qo'shimcha ma'lumot..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={handleCloseForm}
                disabled={submitting}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  form.amount <= 0 ||
                  !form.accountId ||
                  (form.type === 'TRANSFER' && !form.toAccountId)
                }
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                {editingTransaction ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Confirmation Modal */}
      <ModalPortal isOpen={showDeleteModal && !!deletingTransaction} onClose={handleCloseDelete}>
        {deletingTransaction && (
          <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-error" />
                </div>
                <button className="btn btn-ghost btn-sm btn-square" onClick={handleCloseDelete}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h3 className="text-lg font-semibold mb-2">Tranzaksiyani o'chirish</h3>
              <p className="text-sm text-base-content/60 mb-1">
                Quyidagi tranzaksiyani o'chirishni xohlaysizmi?
              </p>
              <div className="surface-soft rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  {renderTypeBadge(deletingTransaction.type)}
                  <span className="font-semibold">
                    {formatCurrency(deletingTransaction.amount)}
                  </span>
                </div>
                <div className="text-sm text-base-content/60 mt-1">
                  {deletingTransaction.accountName} &middot;{' '}
                  {formatDate(deletingTransaction.transactionDate)}
                </div>
                {deletingTransaction.description && (
                  <div className="text-xs text-base-content/50 mt-1">
                    {deletingTransaction.description}
                  </div>
                )}
              </div>
              <p className="text-xs text-error/80 mb-4">
                Bu amalni ortga qaytarib bo'lmaydi.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  className="btn btn-ghost"
                  onClick={handleCloseDelete}
                  disabled={submitting}
                >
                  Bekor qilish
                </button>
                <button
                  className="btn btn-error"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting && <span className="loading loading-spinner loading-sm" />}
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}
