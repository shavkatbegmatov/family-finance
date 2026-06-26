import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { familyDebtsApi } from '../api/family-debts.api';
import { useIsMobile } from './useMediaQuery';
import { useActiveScopeId } from './useScopeChange';
import type {
  FamilyDebt,
  FamilyDebtRequest,
  DebtPayment,
  DebtPaymentRequest,
  DebtType,
  DebtStatus,
  PagedResponse,
} from '../types';

export type DebtsTab = 'all' | 'given' | 'taken' | 'closed' | 'stats';

export interface DebtSummary {
  totalGiven: number;
  totalTaken: number;
}

/**
 * DebtsPage uchun butun react-query (desktop {@code useQuery} + mobile
 * {@code useInfiniteQuery} + summary + payments) hamda filtr/qidiruv/pagination
 * holati va barcha mutation'lar (saqlash/o'chirish/to'lov).
 *
 * <p>Desktop: sahifalangan; Mobile: infinite scroll — UX bir xil. Scope queryKey
 * ichida (D8 migratsiyasi). queryKey'lar va invalidate/onSuccess mantig'i original
 * DebtsPage bilan AYNAN bir xil.</p>
 *
 * @param activeTab Aktiv tab — effektiv tur/holat filtrini hisoblash uchun.
 */
export function useDebtsData(activeTab: DebtsTab) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const activeScopeId = useActiveScopeId();

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [typeFilter, setTypeFilter] = useState<DebtType | ''>('');
  const [statusFilter, setStatusFilter] = useState<DebtStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Tanlangan qarz & detail panel (to'lovlar useQuery enabled bilan auto-yuklanadi)
  const [selectedDebt, setSelectedDebt] = useState<FamilyDebt | null>(null);

  // Aktiv tab asosida effektiv filtrlar (queryKey qismlari) — original useMemo mantig'i
  const effectiveType = useMemo((): DebtType | undefined => {
    if (activeTab === 'given') return 'GIVEN';
    if (activeTab === 'taken') return 'TAKEN';
    return typeFilter || undefined;
  }, [activeTab, typeFilter]);

  const effectiveStatus = useMemo((): DebtStatus | undefined => {
    if (activeTab === 'closed') return 'PAID';
    return statusFilter || undefined;
  }, [activeTab, statusFilter]);

  // ==================== DATA (react-query) ====================
  // Desktop: sahifa-asosli (useQuery); Mobile: cheksiz scroll (useInfiniteQuery) — UX bir xil saqlanadi.
  // Aktiv scope queryKey'da — almashganda avtomatik refetch (D8 migratsiyasi).
  const desktopQuery = useQuery({
    queryKey: ['debts', activeScopeId, page, pageSize, effectiveType, effectiveStatus, searchQuery],
    queryFn: async (): Promise<PagedResponse<FamilyDebt>> =>
      (await familyDebtsApi.getAll(page, pageSize, effectiveType, effectiveStatus, searchQuery || undefined)).data.data,
    enabled: !isMobile,
  });

  const mobileQuery = useInfiniteQuery({
    queryKey: ['debts-infinite', activeScopeId, pageSize, effectiveType, effectiveStatus, searchQuery],
    queryFn: async ({ pageParam }): Promise<PagedResponse<FamilyDebt>> =>
      (await familyDebtsApi.getAll(pageParam, pageSize, effectiveType, effectiveStatus, searchQuery || undefined)).data.data,
    enabled: isMobile,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.totalPages ? allPages.length : undefined,
  });

  const debts = useMemo(() => desktopQuery.data?.content ?? [], [desktopQuery.data]);
  const allItems = useMemo(
    () => mobileQuery.data?.pages.flatMap((p) => p.content) ?? [],
    [mobileQuery.data],
  );
  const totalPages =
    (isMobile ? mobileQuery.data?.pages[0]?.totalPages : desktopQuery.data?.totalPages) ?? 0;
  const totalElements =
    (isMobile ? mobileQuery.data?.pages[0]?.totalElements : desktopQuery.data?.totalElements) ?? 0;
  const initialLoading = isMobile ? mobileQuery.isLoading : desktopQuery.isLoading;
  const refreshing = isMobile
    ? mobileQuery.isFetching && !mobileQuery.isFetchingNextPage
    : desktopQuery.isFetching;
  const loadingMore = mobileQuery.isFetchingNextPage;

  useEffect(() => {
    if (desktopQuery.isError || mobileQuery.isError) toast.error('Qarzlarni yuklashda xatolik');
  }, [desktopQuery.isError, mobileQuery.isError]);

  const handleLoadMore = useCallback(() => {
    if (mobileQuery.hasNextPage && !mobileQuery.isFetchingNextPage) {
      void mobileQuery.fetchNextPage();
    }
  }, [mobileQuery]);

  // Filter/scope o'zgarsa desktop sahifani boshiga qaytaramiz (mobile queryKey o'zi reset bo'ladi)
  useEffect(() => {
    setPage(0);
  }, [effectiveType, effectiveStatus, searchQuery, activeScopeId]);

  // Xulosa (summary)
  const { data: summary = { totalGiven: 0, totalTaken: 0 } } = useQuery({
    queryKey: ['debts-summary', activeScopeId],
    queryFn: async (): Promise<DebtSummary> => (await familyDebtsApi.getSummary()).data.data,
  });

  // Tanlangan qarz to'lovlari (detail panel — selectedDebt o'zgarsa auto-yuklanadi)
  const { data: payments = [], isFetching: loadingPayments } = useQuery({
    queryKey: ['debt-payments', selectedDebt?.id],
    queryFn: async (): Promise<DebtPayment[]> => {
      const data = (await familyDebtsApi.getPayments(selectedDebt!.id)).data.data;
      return Array.isArray(data) ? data : [];
    },
    enabled: selectedDebt !== null,
  });

  // ---------- Mutations ----------
  const invalidateDebtLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['debts'] });
    void queryClient.invalidateQueries({ queryKey: ['debts-infinite'] });
    void queryClient.invalidateQueries({ queryKey: ['debts-summary'] });
  }, [queryClient]);

  const debtSaveMutation = useMutation({
    mutationFn: (vars: { id?: number; payload: FamilyDebtRequest }) =>
      vars.id ? familyDebtsApi.update(vars.id, vars.payload) : familyDebtsApi.create(vars.payload),
    onSuccess: () => {
      invalidateDebtLists();
    },
    onError: () => toast.error('Qarzni saqlashda xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => familyDebtsApi.delete(id),
    onSuccess: (_data, id) => {
      invalidateDebtLists();
      if (selectedDebt?.id === id) setSelectedDebt(null);
    },
    onError: () => toast.error("Qarzni o'chirishda xatolik"),
  });

  const paymentMutation = useMutation({
    mutationFn: (vars: { debtId: number; payload: DebtPaymentRequest }) =>
      familyDebtsApi.addPayment(vars.debtId, vars.payload),
    onSuccess: async (_data, vars) => {
      invalidateDebtLists();
      void queryClient.invalidateQueries({ queryKey: ['debt-payments', vars.debtId] });
      // Detail summasi yangilanishi uchun selectedDebt'ni qayta o'qiymiz
      if (selectedDebt?.id === vars.debtId) {
        const updated = (await familyDebtsApi.getById(vars.debtId)).data.data;
        setSelectedDebt(updated);
      }
    },
    onError: () => toast.error("To'lov qo'shishda xatolik"),
  });

  // Muddati o'tgan qarzlar soni (stats KPI) — joriy ko'rinadigan sahifa bo'yicha
  const overdueCount = useMemo(() => debts.filter((d) => d.isOverdue).length, [debts]);

  return {
    // env
    isMobile,
    // pagination state
    page,
    setPage,
    pageSize,
    setPageSize,
    // filters
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    // selection
    selectedDebt,
    setSelectedDebt,
    // list data
    debts,
    allItems,
    totalPages,
    totalElements,
    initialLoading,
    refreshing,
    loadingMore,
    handleLoadMore,
    overdueCount,
    // summary
    summary,
    // payments
    payments,
    loadingPayments,
    // mutations
    debtSaveMutation,
    deleteMutation,
    paymentMutation,
    invalidateDebtLists,
  };
}
