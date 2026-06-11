import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
  Edit2,
  Trash2,
  Search,
} from 'lucide-react';
import clsx from 'clsx';

import { transactionsApi } from '../../api/transactions.api';
import { accountsApi } from '../../api/accounts.api';
import { categoriesApi } from '../../api/categories.api';
import { familyMembersApi } from '../../api/family-members.api';
import { formatCurrency, formatDate } from '../../config/constants';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Select } from '../../components/ui/Select';
import { ModalPortal } from '../../components/common/Modal';
import { FilterSheet } from '../../components/common/FilterSheet';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { PermissionCode } from '../../hooks/usePermission';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useHighlight } from '../../hooks/useHighlight';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';
import { DateRangePicker, type DateRangePreset, type DateRange } from '../../components/common/DateRangePicker';
import { resolvePreset } from '../../utils/dateRangePresets';
import { TransactionFormModal } from '../../components/common/TransactionFormModal';
import { useQuickEntryStore } from '../../store/quickEntryStore';
import { useScopeChangeEffect } from '../../hooks/useScopeChange';
import type {
  Transaction,
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

// Mobil tranzaksiya qatori uchun tur metama'lumotlari (ikonka + ranglar)
const TYPE_META: Record<
  TransactionType,
  { label: string; icon: React.ElementType; tile: string; color: string; sign: string }
> = {
  INCOME: { label: 'Daromad', icon: ArrowDownLeft, tile: 'bg-success/10 text-success', color: 'text-success', sign: '+' },
  EXPENSE: { label: 'Xarajat', icon: ArrowUpRight, tile: 'bg-error/10 text-error', color: 'text-error', sign: '−' },
  TRANSFER: { label: "O'tkazma", icon: ArrowRightLeft, tile: 'bg-info/10 text-info', color: 'text-info', sign: '' },
  REVERSAL: { label: 'Storno', icon: RotateCcw, tile: 'bg-warning/10 text-warning', color: 'text-warning', sign: '' },
};

export function TransactionsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { highlightId, clearHighlight } = useHighlight();
  const lastCreatedAt = useQuickEntryStore((s) => s.lastCreatedAt);

  // Data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const allItemsRef = useRef<Transaction[]>([]);
  const [allItems, setAllItems] = useState<Transaction[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ start: '', end: '' });
  const [filterAccountId, setFilterAccountId] = useState<number | undefined>(undefined);
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>(undefined);
  const [filterMemberId, setFilterMemberId] = useState<number | undefined>(undefined);
  const [filterSearch, setFilterSearch] = useState('');
  const debouncedSearch = useDebouncedValue(filterSearch, 300);
  const [showFilters, setShowFilters] = useState(false);

  const resolvedRange = useMemo(
    () => resolvePreset(datePreset, customDateRange),
    [datePreset, customDateRange]
  );

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkReverseModal, setShowBulkReverseModal] = useState(false);
  const [showBulkCategorizeModal, setShowBulkCategorizeModal] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | undefined>(undefined);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Build filters object
  const filters = useMemo<TransactionFilters>(() => {
    const f: TransactionFilters = {};
    if (activeTab !== 'ALL') f.type = activeTab as TransactionType;
    if (resolvedRange?.start) f.from = resolvedRange.start;
    if (resolvedRange?.end) f.to = resolvedRange.end;
    if (filterAccountId) f.accountId = filterAccountId;
    if (filterCategoryId) f.categoryId = filterCategoryId;
    if (filterMemberId) f.memberId = filterMemberId;
    if (debouncedSearch.trim()) f.search = debouncedSearch.trim();
    return f;
  }, [activeTab, resolvedRange, filterAccountId, filterCategoryId, filterMemberId, debouncedSearch]);

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
    } catch {
      toast.error("Ma'lumotnoma yuklashda xatolik");
    }
  }, []);

  // Load transactions
  const loadTransactions = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else if (isMobile && page > 0) setLoadingMore(true);
    try {
      const res = await transactionsApi.getAll(page, pageSize, filters);
      const data = (res.data as ApiResponse<PagedResponse<Transaction>>).data;
      setTransactions(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);

      if (isMobile && page > 0) {
        const newAll = [...allItemsRef.current, ...data.content];
        allItemsRef.current = newAll;
        setAllItems(newAll);
      } else {
        allItemsRef.current = data.content;
        setAllItems(data.content);
      }
    } catch {
      toast.error('Tranzaksiyalarni yuklashda xatolik');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, pageSize, filters, isMobile]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages - 1 && !loadingMore) {
      setPage((p) => p + 1);
    }
  }, [page, totalPages, loadingMore]);

  // Reset allItems when filters change
  useEffect(() => {
    allItemsRef.current = [];
    setAllItems([]);
  }, [filters]);

  // Initial load
  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void loadTransactions(true);
  }, [loadTransactions]);

  // FAB orqali yaratilgan tranzaksiyalar ham ro'yxatda ko'rinishi uchun
  useEffect(() => {
    if (lastCreatedAt === 0) return;
    void loadTransactions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCreatedAt]);

  // Phase 3: aktiv scope o'zgarganda tranzaksiyalarni qayta yuklash
  useScopeChangeEffect(() => {
    void loadTransactions(true);
  });

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
    setDatePreset('all');
    setCustomDateRange({ start: '', end: '' });
    setFilterAccountId(undefined);
    setFilterCategoryId(undefined);
    setFilterMemberId(undefined);
    setFilterSearch('');
    setPage(0);
  };

  const hasActiveFilters = Boolean(
    datePreset !== 'all' || filterAccountId || filterCategoryId || filterMemberId || filterSearch
  );

  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowFormModal(true);
  };

  const handleOpenDelete = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
    setShowDeleteModal(true);
  };

  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingTransaction(null);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setDeletingTransaction(null);
  };

  const handleFormSuccess = () => {
    void loadTransactions();
  };

  // ===== Bulk operations =====

  const allVisibleIds = useMemo(() => {
    const source = isMobile ? allItems : transactions;
    return source.filter((t) => t.status !== 'REVERSED').map((t) => t.id);
  }, [transactions, allItems, isMobile]);

  const isAllSelected = allVisibleIds.length > 0
    && allVisibleIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleIds.every((id) => prev.has(id))) {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allVisibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkReverseSubmit = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await transactionsApi.bulkReverse(ids, 'Bulk storno');
      const data = (res.data as { data: { successCount: number; failures: unknown[] } }).data;
      if (data.failures.length > 0) {
        toast.success(`${data.successCount} storno qilindi, ${data.failures.length} xatolik`);
      } else {
        toast.success(`${data.successCount} ta tranzaksiya storno qilindi`);
      }
      setShowBulkReverseModal(false);
      clearSelection();
      void loadTransactions();
    } catch {
      toast.error('Bulk storno qilishda xatolik');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkCategorizeSubmit = async () => {
    if (selectedIds.size === 0 || !bulkCategoryId) return;
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await transactionsApi.bulkCategorize(ids, bulkCategoryId);
      const data = (res.data as { data: { successCount: number; failures: unknown[] } }).data;
      if (data.failures.length > 0) {
        toast.success(`${data.successCount} kategoriyalandi, ${data.failures.length} xatolik`);
      } else {
        toast.success(`${data.successCount} ta tranzaksiya kategoriyalandi`);
      }
      setShowBulkCategorizeModal(false);
      setBulkCategoryId(undefined);
      clearSelection();
      void loadTransactions();
    } catch {
      toast.error('Bulk kategoriyalashda xatolik');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Filterlar o'zgarganda tanlovlarni tozalash
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, filters]);

  // Submit storno (reverse)
  const handleDelete = async () => {
    if (!deletingTransaction) return;
    setSubmitting(true);
    try {
      await transactionsApi.reverse(deletingTransaction.id, 'Foydalanuvchi tomonidan storno qilindi');
      handleCloseDelete();
      void loadTransactions();
    } catch {
      toast.error("Tranzaksiyani storno qilishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  // Type badge renderer
  const renderTypeBadge = (type: TransactionType) => {
    const config: Record<TransactionType, { label: string; class: string }> = {
      INCOME: { label: 'Daromad', class: 'badge-success' },
      EXPENSE: { label: 'Xarajat', class: 'badge-error' },
      TRANSFER: { label: "O'tkazma", class: 'badge-info' },
      REVERSAL: { label: 'Storno', class: 'badge-warning' },
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

  // Table columns
  const columns: Column<Transaction>[] = [
      {
        key: 'select',
        header: '',
        sortable: false,
        className: 'w-10',
        render: (t) => {
          const disabled = t.status === 'REVERSED';
          return (
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={selectedIds.has(t.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelect(t.id);
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={disabled}
              aria-label={`Tranzaksiyani tanlash: ${t.id}`}
            />
          );
        },
      },
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
    ];

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header — mobilda FAB yaratishni qoplaydi, blok faqat lg+ da ko'rinadi */}
      <PageHeader
        title="Tranzaksiyalar"
        subtitle="Barcha moliyaviy operatsiyalar"
        actions={
          <PermissionGate permission={PermissionCode.TRANSACTIONS_CREATE}>
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Yangi tranzaksiya
            </button>
          </PermissionGate>
        }
      />

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              aria-label="Hammasini tanlash"
            />
            <span className="text-sm font-medium">
              <span className="text-primary">{selectedIds.size}</span> ta tanlangan
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="btn btn-ghost btn-sm"
            >
              Bekor qilish
            </button>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate permission={PermissionCode.TRANSACTIONS_UPDATE}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowBulkCategorizeModal(true)}
              >
                Kategoriyalash
              </button>
            </PermissionGate>
            <PermissionGate permission={PermissionCode.TRANSACTIONS_DELETE}>
              <button
                type="button"
                className="btn btn-warning btn-sm"
                onClick={() => setShowBulkReverseModal(true)}
              >
                <Trash2 className="h-4 w-4" />
                Storno qilish
              </button>
            </PermissionGate>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="surface-card">
        <div className="flex items-center gap-2 border-b border-base-200 p-2">
          <div className="scrollbar-hide flex flex-1 items-center gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={clsx(
                    'tap-sm flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-content shadow-sm'
                      : 'text-base-content/60 hover:bg-base-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filter toggle */}
          <button
            className={clsx(
              'tap-sm relative grid h-9 w-9 flex-none place-items-center rounded-xl border transition-colors',
              showFilters || hasActiveFilters
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-base-200 text-base-content/60 hover:bg-base-200'
            )}
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filtr"
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-base-100" />
            )}
          </button>
        </div>

        {/* Filters panel */}
        <FilterSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        >
          {/* Text search */}
          <div className="flex flex-col gap-1.5 lg:w-64">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Qidiruv
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40 pointer-events-none" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => {
                  setFilterSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Tavsif bo'yicha..."
                className="input input-bordered w-full pl-10 pr-9 h-12"
                maxLength={100}
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSearch('');
                    setPage(0);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-square"
                  aria-label="Qidiruvni tozalash"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Date range picker */}
          <div className="flex flex-col gap-1.5 lg:w-64">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              Davr
            </span>
            <DateRangePicker
              value={datePreset}
              customRange={customDateRange}
              onChange={(preset, range) => {
                setDatePreset(preset);
                if (range) setCustomDateRange(range);
                setPage(0);
              }}
            />
          </div>

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
        </FilterSheet>

        {/* Data Table */}
        <DataTable
          data={isMobile ? allItems : transactions}
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
          onLoadMore={handleLoadMore}
          hasMore={page < totalPages - 1}
          loadingMore={loadingMore}
          onRowClick={(t) => navigate(`/transactions/${t.id}`)}
          highlightId={highlightId}
          onHighlightComplete={clearHighlight}
          renderMobileCard={(t) => {
            const meta = TYPE_META[t.type];
            const Icon = meta.icon;
            const isReversed = t.status === 'REVERSED';
            return (
              <div
                className={clsx(
                  'flex items-center gap-3 rounded-2xl border border-base-200 bg-base-100 p-3',
                  isReversed && 'opacity-60'
                )}
              >
                <span className={clsx('grid h-11 w-11 flex-none place-items-center rounded-2xl', meta.tile)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{t.categoryName || meta.label}</p>
                    <span className={clsx('flex-none text-sm font-bold tabular-nums', meta.color)}>
                      {meta.sign}{formatCurrency(t.amount)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-base-content/55">
                      {t.accountName}
                      {t.type === 'TRANSFER' && t.toAccountName ? ` → ${t.toAccountName}` : ''}
                      {' · '}
                      {formatDate(t.transactionDate)}
                    </p>
                    {isReversed && <span className="badge badge-warning badge-xs flex-none">Storno</span>}
                  </div>
                  {(t.description || t.familyMemberName) && (
                    <p className="mt-0.5 truncate text-xs text-base-content/60">
                      {[t.familyMemberName, t.description].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Create/Edit Modal */}
      <TransactionFormModal
        isOpen={showFormModal}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        editingTransaction={editingTransaction}
        accounts={accounts}
        categories={categories}
        members={members}
      />

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

              <h3 className="text-lg font-semibold mb-2">Tranzaksiyani storno qilish</h3>
              <p className="text-sm text-base-content/60 mb-1">
                Quyidagi tranzaksiyani storno qilishni xohlaysizmi?
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
              <p className="text-xs text-warning/80 mb-4">
                Storno qilish teskari tranzaksiya yaratadi. Asl tranzaksiya saqlanib qoladi.
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
                  className="btn btn-warning"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting && <span className="loading loading-spinner loading-sm" />}
                  Storno qilish
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Bulk Reverse Modal */}
      <ModalPortal isOpen={showBulkReverseModal} onClose={() => setShowBulkReverseModal(false)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-warning" />
              </div>
              <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => setShowBulkReverseModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {selectedIds.size} ta tranzaksiyani storno qilish
            </h3>
            <p className="text-sm text-base-content/60 mb-4">
              Tanlangan barcha tranzaksiyalar uchun teskari operatsiya yaratiladi.
              Bu amalni qaytarib bo'lmaydi.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => setShowBulkReverseModal(false)}
                disabled={bulkProcessing}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-warning"
                onClick={handleBulkReverseSubmit}
                disabled={bulkProcessing}
              >
                {bulkProcessing && <span className="loading loading-spinner loading-sm" />}
                Storno qilish
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Bulk Categorize Modal */}
      <ModalPortal isOpen={showBulkCategorizeModal} onClose={() => setShowBulkCategorizeModal(false)}>
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold">
                {selectedIds.size} ta tranzaksiyaga kategoriya o'rnatish
              </h3>
              <button
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => setShowBulkCategorizeModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4">
              <Select
                label="Yangi kategoriya"
                value={bulkCategoryId}
                onChange={(val) => setBulkCategoryId(val ? Number(val) : undefined)}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Kategoriyani tanlang"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => setShowBulkCategorizeModal(false)}
                disabled={bulkProcessing}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleBulkCategorizeSubmit}
                disabled={bulkProcessing || !bulkCategoryId}
              >
                {bulkProcessing && <span className="loading loading-spinner loading-sm" />}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
