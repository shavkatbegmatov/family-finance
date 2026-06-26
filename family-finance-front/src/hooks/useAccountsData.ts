import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { accountsApi } from '../api/accounts.api';
import { useIsMobile } from './useMediaQuery';
import { useActiveScopeId } from './useScopeChange';
import type {
  Account, AccountType, AccountStatus, AccountFilters, CurrencyBalance, PagedResponse,
} from '../types';

export type AccountsTab = 'all' | 'my';
export type AccountsViewMode = 'grid' | 'table';

/**
 * AccountsPage uchun butun react-query (desktop {@code useQuery} + mobile
 * {@code useInfiniteQuery} + balans KPI) hamda filtr/qidiruv/pagination/tab/
 * viewMode/modal/highlight holati va hisoblangan KPI qiymatlari.
 *
 * <p>Desktop: sahifalangan; Mobile: infinite scroll — UX bir xil. Scope queryKey
 * ichida (D8 migratsiyasi). queryKey'lar, invalidate mantig'i, my/all tab tanlovi,
 * hisoblangan KPI va 400ms debounce original AccountsPage bilan AYNAN bir xil.</p>
 */
export function useAccountsData() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const activeScopeId = useActiveScopeId();

  // Tabs, View & Filters
  const [activeTab, setActiveTab] = useState<AccountsTab>('all');
  const [viewMode, setViewMode] = useState<AccountsViewMode>('grid');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AccountType | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<AccountStatus | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Highlight
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // Debounced search input
  const [searchInput, setSearchInput] = useState('');

  const hasActiveFilters = !!filterType || !!filterStatus || !!search;

  // -----------------------------------------------------------------------
  // Data fetching (react-query)
  // -----------------------------------------------------------------------
  // Desktop: sahifa-asosli; Mobile: infinite scroll — UX bir xil. Scope queryKey'da (D8 migratsiyasi).

  // Umumiy balans (KPI)
  const { data: balances = [], isLoading: kpiLoading } = useQuery({
    queryKey: ['accounts-balance', activeScopeId],
    queryFn: async (): Promise<CurrencyBalance[]> => (await accountsApi.getTotalBalance()).data.data ?? [],
  });

  // Bitta sahifani yuklovchi (activeTab 'my' -> getMy, aks holda filtrlangan getAll)
  const fetchAccountsPage = async (pageParam: number): Promise<PagedResponse<Account>> => {
    if (activeTab === 'my') {
      return (await accountsApi.getMy(pageParam, pageSize)).data.data;
    }
    const filters: AccountFilters = { page: pageParam, size: pageSize };
    if (search) filters.search = search;
    if (filterType) filters.accountType = filterType;
    if (filterStatus) filters.status = filterStatus;
    return (await accountsApi.getAll(filters)).data.data;
  };

  const desktopQuery = useQuery({
    queryKey: ['accounts', activeScopeId, activeTab, page, pageSize, search, filterType, filterStatus],
    queryFn: () => fetchAccountsPage(page),
    enabled: !isMobile,
  });
  const mobileQuery = useInfiniteQuery({
    queryKey: ['accounts-infinite', activeScopeId, activeTab, pageSize, search, filterType, filterStatus],
    queryFn: ({ pageParam }) => fetchAccountsPage(pageParam),
    enabled: isMobile,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.totalPages ? allPages.length : undefined,
  });

  const accounts = useMemo(() => desktopQuery.data?.content ?? [], [desktopQuery.data]);
  const allItems = useMemo(
    () => mobileQuery.data?.pages.flatMap((p) => p.content) ?? [],
    [mobileQuery.data],
  );
  const totalPages =
    (isMobile ? mobileQuery.data?.pages[0]?.totalPages : desktopQuery.data?.totalPages) ?? 0;
  const totalElements =
    (isMobile ? mobileQuery.data?.pages[0]?.totalElements : desktopQuery.data?.totalElements) ?? 0;
  const initialLoading = isMobile ? mobileQuery.isLoading : desktopQuery.isLoading;
  const loading = initialLoading;
  const loadingMore = mobileQuery.isFetchingNextPage;

  useEffect(() => {
    if (desktopQuery.isError || mobileQuery.isError) toast.error('Hisoblarni yuklashda xatolik');
  }, [desktopQuery.isError, mobileQuery.isError]);

  const handleLoadMore = useCallback(() => {
    if (mobileQuery.hasNextPage && !mobileQuery.isFetchingNextPage) {
      void mobileQuery.fetchNextPage();
    }
  }, [mobileQuery]);

  const invalidateAccounts = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts-infinite'] });
    void queryClient.invalidateQueries({ queryKey: ['accounts-balance'] });
  }, [queryClient]);

  // Filter/scope o'zgarsa desktop sahifani boshiga qaytaramiz
  useEffect(() => {
    setPage(0);
  }, [search, filterType, filterStatus, activeTab, activeScopeId]);

  // Debounced search (searchInput -> search, 400ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // -----------------------------------------------------------------------
  // Computed KPI values
  // -----------------------------------------------------------------------

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.status === 'ACTIVE' || !a.status),
    [accounts],
  );
  const frozenAccounts = useMemo(
    () => accounts.filter((a) => a.status === 'FROZEN'),
    [accounts],
  );
  const positiveSum = useMemo(
    () => accounts.filter((a) => a.balance > 0).reduce((sum, a) => sum + a.balance, 0),
    [accounts],
  );
  const negativeSum = useMemo(
    () => Math.abs(accounts.filter((a) => a.balance < 0).reduce((sum, a) => sum + a.balance, 0)),
    [accounts],
  );

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    invalidateAccounts();
  }, [invalidateAccounts]);

  const openCreate = useCallback(() => {
    setEditingAccount(null);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((account: Account) => {
    setEditingAccount(account);
    setShowModal(true);
  }, []);

  const handleModalSuccess = useCallback(() => {
    invalidateAccounts();
  }, [invalidateAccounts]);

  const clearFilters = useCallback(() => {
    setFilterType(undefined);
    setFilterStatus(undefined);
    setSearchInput('');
    setSearch('');
  }, []);

  return {
    // env
    isMobile,
    // tabs / view / filters state
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    searchInput,
    setSearchInput,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    showFilters,
    setShowFilters,
    hasActiveFilters,
    // modal state
    showModal,
    setShowModal,
    editingAccount,
    setEditingAccount,
    // highlight
    highlightId,
    setHighlightId,
    // balance KPI
    balances,
    kpiLoading,
    // list data
    accounts,
    allItems,
    totalPages,
    totalElements,
    initialLoading,
    loading,
    loadingMore,
    handleLoadMore,
    // computed KPI
    activeAccounts,
    frozenAccounts,
    positiveSum,
    negativeSum,
    // handlers
    handleRefresh,
    openCreate,
    openEdit,
    handleModalSuccess,
    clearFilters,
    invalidateAccounts,
  };
}
