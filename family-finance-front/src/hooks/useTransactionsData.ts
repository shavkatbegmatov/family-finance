import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { transactionsApi } from '../api/transactions.api';
import { accountsApi } from '../api/accounts.api';
import { categoriesApi } from '../api/categories.api';
import { familyMembersApi } from '../api/family-members.api';
import { useIsMobile } from './useMediaQuery';
import { useActiveScopeId } from './useScopeChange';
import { useDebouncedValue } from './useDebouncedValue';
import { resolvePreset } from '../utils/dateRangePresets';
import { useQuickEntryStore } from '../store/quickEntryStore';
import type { DateRangePreset, DateRange } from '../components/common/DateRangePicker';
import type {
  Transaction,
  TransactionType,
  TransactionFilters,
  Account,
  FinanceCategory,
  FamilyMember,
  PagedResponse,
} from '../types';

export type TabType = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';

/**
 * TransactionsPage uchun butun react-query (desktop {@code useQuery} + mobile
 * {@code useInfiniteQuery} + reference data 3 ta {@code useQuery}) hamda filtr/
 * pagination/bulk-selection holati va barcha mutation'lar (storno / bulk storno /
 * bulk kategoriyalash).
 *
 * <p>Desktop: sahifalangan; Mobile: infinite scroll — UX bir xil. Scope queryKey
 * ichida (D8 migratsiyasi). queryKey'lar, invalidate va onSuccess mantig'i original
 * TransactionsPage bilan AYNAN bir xil saqlangan.</p>
 */
export function useTransactionsData() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const activeScopeId = useActiveScopeId();
  const lastCreatedAt = useQuickEntryStore((s) => s.lastCreatedAt);

  // Pagination (desktop sahifa)
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

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

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  // ---------- Data (react-query) ----------
  // Desktop: sahifa-asosli; Mobile: infinite scroll — UX bir xil. Scope queryKey'da (D8 migratsiyasi).

  // Reference data (filter va form modal uchun)
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-ref', activeScopeId],
    queryFn: async (): Promise<Account[]> => (await accountsApi.getList()).data.data,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-ref', activeScopeId],
    queryFn: async (): Promise<FinanceCategory[]> => (await categoriesApi.getAll()).data.data.content,
  });
  const { data: members = [] } = useQuery({
    queryKey: ['members-ref', activeScopeId],
    queryFn: async (): Promise<FamilyMember[]> => {
      const res = await familyMembersApi.getList();
      return res.data.data ?? (res.data as unknown as FamilyMember[]);
    },
  });

  // Tranzaksiyalar — desktop page / mobile infinite
  const desktopQuery = useQuery({
    queryKey: ['transactions', activeScopeId, page, pageSize, filters],
    queryFn: async (): Promise<PagedResponse<Transaction>> =>
      (await transactionsApi.getAll(page, pageSize, filters)).data.data,
    enabled: !isMobile,
  });
  const mobileQuery = useInfiniteQuery({
    queryKey: ['transactions-infinite', activeScopeId, pageSize, filters],
    queryFn: async ({ pageParam }): Promise<PagedResponse<Transaction>> =>
      (await transactionsApi.getAll(pageParam, pageSize, filters)).data.data,
    enabled: isMobile,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.totalPages ? allPages.length : undefined,
  });

  const transactions = useMemo(() => desktopQuery.data?.content ?? [], [desktopQuery.data]);
  const allItems = useMemo(
    () => mobileQuery.data?.pages.flatMap((p) => p.content) ?? [],
    [mobileQuery.data],
  );
  const totalPages =
    (isMobile ? mobileQuery.data?.pages[0]?.totalPages : desktopQuery.data?.totalPages) ?? 0;
  const totalElements =
    (isMobile ? mobileQuery.data?.pages[0]?.totalElements : desktopQuery.data?.totalElements) ?? 0;
  const loading = isMobile ? mobileQuery.isLoading : desktopQuery.isLoading;
  const loadingMore = mobileQuery.isFetchingNextPage;

  useEffect(() => {
    if (desktopQuery.isError || mobileQuery.isError) toast.error('Tranzaksiyalarni yuklashda xatolik');
  }, [desktopQuery.isError, mobileQuery.isError]);

  const handleLoadMore = useCallback(() => {
    if (mobileQuery.hasNextPage && !mobileQuery.isFetchingNextPage) {
      void mobileQuery.fetchNextPage();
    }
  }, [mobileQuery]);

  // Filter/scope o'zgarsa desktop sahifani boshiga qaytaramiz (mobile queryKey o'zi reset bo'ladi)
  useEffect(() => {
    setPage(0);
  }, [filters, activeScopeId]);

  // FAB orqali yaratilgan tranzaksiya ro'yxatda ko'rinishi uchun
  useEffect(() => {
    if (lastCreatedAt === 0) return;
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCreatedAt]);

  const invalidateTransactions = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
  }, [queryClient]);

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

  const reverseMutation = useMutation({
    mutationFn: (id: number) =>
      transactionsApi.reverse(id, 'Foydalanuvchi tomonidan storno qilindi'),
    onSuccess: () => {
      invalidateTransactions();
    },
    onError: () => toast.error('Tranzaksiyani storno qilishda xatolik'),
  });

  const bulkReverseMutation = useMutation({
    mutationFn: (ids: number[]) => transactionsApi.bulkReverse(ids, 'Bulk storno'),
    onSuccess: (res) => {
      const data = res.data.data;
      toast.success(
        data.failures.length > 0
          ? `${data.successCount} storno qilindi, ${data.failures.length} xatolik`
          : `${data.successCount} ta tranzaksiya storno qilindi`
      );
      invalidateTransactions();
      clearSelection();
    },
    onError: () => toast.error('Bulk storno qilishda xatolik'),
  });

  const bulkCategorizeMutation = useMutation({
    mutationFn: (vars: { ids: number[]; categoryId: number }) =>
      transactionsApi.bulkCategorize(vars.ids, vars.categoryId),
    onSuccess: (res) => {
      const data = res.data.data;
      toast.success(
        data.failures.length > 0
          ? `${data.successCount} kategoriyalandi, ${data.failures.length} xatolik`
          : `${data.successCount} ta tranzaksiya kategoriyalandi`
      );
      invalidateTransactions();
      clearSelection();
    },
    onError: () => toast.error('Bulk kategoriyalashda xatolik'),
  });

  // Filterlar o'zgarganda tanlovlarni tozalash
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, filters]);

  return {
    // env
    isMobile,
    // pagination state
    page,
    setPage,
    pageSize,
    handlePageSizeChange,
    // filter state
    activeTab,
    handleTabChange,
    datePreset,
    setDatePreset,
    customDateRange,
    setCustomDateRange,
    filterAccountId,
    setFilterAccountId,
    filterCategoryId,
    setFilterCategoryId,
    filterMemberId,
    setFilterMemberId,
    filterSearch,
    setFilterSearch,
    showFilters,
    setShowFilters,
    clearFilters,
    hasActiveFilters,
    // reference data
    accounts,
    categories,
    members,
    // list data
    transactions,
    allItems,
    totalPages,
    totalElements,
    loading,
    loadingMore,
    handleLoadMore,
    // bulk selection
    selectedIds,
    isAllSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    // mutations
    reverseMutation,
    bulkReverseMutation,
    bulkCategorizeMutation,
    invalidateTransactions,
  };
}
