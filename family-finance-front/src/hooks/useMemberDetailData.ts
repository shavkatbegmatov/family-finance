import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { familyMembersApi } from '../api/family-members.api';
import { transactionsApi } from '../api/transactions.api';
import { useIsMobile } from './useMediaQuery';
import { useActiveScopeId } from './useScopeChange';
import type {
  MemberFinancialSummary,
  Transaction,
  PagedResponse,
} from '../types';

const TX_PAGE_SIZE = 15;

export type MemberDetailTab = 'overview' | 'transactions' | 'accounts' | 'statistics';

/**
 * MemberDetailPage uchun butun react-query ma'lumot qatlami: a'zo moliyaviy
 * xulosasi (summary) + tranzaksiyalar (lazy, faqat "transactions" tabida) hamda
 * pagination/filter/mobile load-more holati.
 *
 * <p>Aktiv scope queryKey ichida — scope almashganda avtomatik refetch (D8
 * migratsiyasi). queryKey'lar va xulq original MemberDetailPage bilan AYNAN
 * bir xil:</p>
 * <ul>
 *   <li>summary — {@code ['member-financial-summary', memberId, activeScopeId]}</li>
 *   <li>tranzaksiyalar — {@code ['member-transactions', memberId, activeScopeId,
 *       txPage, txTypeFilter]}, enabled faqat {@code activeTab === 'transactions'}
 *       (lazy yuklash)</li>
 * </ul>
 *
 * <p>Mobil "load more" original mantig'i AYNAN saqlangan: txPage > 0 da yangi
 * sahifa allTxItems'ga to'planadi (ref orqali), aks holda ro'yxat almashtiriladi.
 * txTypeFilter o'zgarganda sahifa 0 ga qaytadi (orchestrator orqali).</p>
 *
 * @param memberId    URL'dan olingan a'zo IDsi (useParams)
 * @param activeTab   joriy tab — tranzaksiyalar lazy yuklanishi uchun
 */
export function useMemberDetailData(memberId: number, activeTab: MemberDetailTab) {
  const isMobile = useIsMobile();
  const activeScopeId = useActiveScopeId();

  // Transactions tab state
  const [txPage, setTxPage] = useState(0);
  const [txTypeFilter, setTxTypeFilter] = useState<string>('');

  // Mobile "load more" — yig'ilgan elementlar (original allTxRef/allTxItems mantiqi)
  const allTxRef = useRef<Transaction[]>([]);
  const [allTxItems, setAllTxItems] = useState<Transaction[]>([]);

  // ---------- Summary (react-query) ----------
  // Aktiv scope queryKey'da — scope almashganda avtomatik refetch (D8 migratsiyasi).
  const summaryQuery = useQuery({
    queryKey: ['member-financial-summary', memberId, activeScopeId],
    queryFn: async (): Promise<MemberFinancialSummary> => {
      const res = await familyMembersApi.getFinancialSummary(memberId);
      return res.data.data;
    },
  });

  useEffect(() => {
    if (summaryQuery.isError) toast.error("Ma'lumotlarni yuklashda xatolik");
  }, [summaryQuery.isError]);

  const data = summaryQuery.data ?? null;
  const loading = summaryQuery.isLoading;

  // ---------- Transactions (react-query, lazy) ----------
  // Faqat "transactions" tabida yuklanadi (enabled). Scope queryKey'da.
  const txQuery = useQuery({
    queryKey: ['member-transactions', memberId, activeScopeId, txPage, txTypeFilter],
    queryFn: async (): Promise<PagedResponse<Transaction>> => {
      const filters: Record<string, unknown> = { memberId };
      if (txTypeFilter) filters.type = txTypeFilter;
      const res = await transactionsApi.getAll(txPage, TX_PAGE_SIZE, filters);
      return res.data.data;
    },
    enabled: activeTab === 'transactions',
  });

  useEffect(() => {
    if (txQuery.isError) toast.error('Tranzaksiyalarni yuklashda xatolik');
  }, [txQuery.isError]);

  const txData = useMemo(() => txQuery.data?.content ?? [], [txQuery.data]);
  const txTotalElements = txQuery.data?.totalElements ?? 0;
  const txTotalPages = txQuery.data?.totalPages ?? 0;

  // Mobil load-more akkumulyatsiyasi — original loadTransactions mantig'i AYNAN:
  // txPage > 0 (mobil) bo'lsa yangi sahifani yig'amiz, aks holda almashtiramiz.
  // Yangi page muvaffaqiyatli kelganda ishlaydi (txQuery.data o'zgarishini kuzatamiz).
  useEffect(() => {
    if (!txQuery.data) return;
    const content = txQuery.data.content;
    if (isMobile && txPage > 0) {
      const newAll = [...allTxRef.current, ...content];
      allTxRef.current = newAll;
      setAllTxItems(newAll);
    } else {
      allTxRef.current = content;
      setAllTxItems(content);
    }
    // txData (content) yangilanganda qayta hisoblanadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txQuery.data]);

  // txLoading: birinchi sahifa yoki desktop sahifa almashinuvi yuklanishi.
  // txLoadingMore: mobil keyingi sahifa (txPage > 0) yuklanishi — original kabi.
  const txIsBackgroundMore = isMobile && txPage > 0;
  const txLoading = txQuery.isFetching && !txIsBackgroundMore;
  const txLoadingMore = txQuery.isFetching && txIsBackgroundMore;

  const handleTxLoadMore = useCallback(() => {
    if (txPage < txTotalPages - 1 && !txLoadingMore) {
      setTxPage((p) => p + 1);
    }
  }, [txPage, txTotalPages, txLoadingMore]);

  // Filtr o'zgarganda sahifani 0 ga qaytaramiz (original onTypeFilterChange mantig'i)
  const changeTypeFilter = useCallback((val: string) => {
    setTxTypeFilter(val);
    setTxPage(0);
  }, []);

  // Header refresh tugmasi — original loadSummary o'rnida summary refetch
  const refreshSummary = useCallback(() => {
    void summaryQuery.refetch();
  }, [summaryQuery]);

  // Scope o'zgarsa mobil yig'ilgan ro'yxat va sahifa boshiga qaytsin
  // (queryKey o'zi refetch qiladi; bu yerda akkumulyator/sahifa holatini tozalaymiz).
  useEffect(() => {
    allTxRef.current = [];
    setAllTxItems([]);
    setTxPage(0);
  }, [activeScopeId, memberId]);

  return {
    // env
    isMobile,
    // summary
    data,
    loading,
    refreshSummary,
    // transactions list
    txItems: isMobile ? allTxItems : txData,
    txLoading,
    txLoadingMore,
    txPage,
    setTxPage,
    txTotalElements,
    txTotalPages,
    txTypeFilter,
    changeTypeFilter,
    handleTxLoadMore,
    hasMore: txPage < txTotalPages - 1,
    pageSize: TX_PAGE_SIZE,
  };
}
