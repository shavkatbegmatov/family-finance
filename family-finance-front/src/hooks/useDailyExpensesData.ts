import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { transactionsApi } from '../api/transactions.api';
import { accountsApi } from '../api/accounts.api';
import { categoriesApi } from '../api/categories.api';
import { familyMembersApi } from '../api/family-members.api';
import { useActiveScopeId } from './useScopeChange';
import { useQuickEntryStore } from '../store/quickEntryStore';
import { getTashkentToday } from '../config/constants';
import { toastApiError } from '../utils/apiError';
import type {
  Account,
  ExpenseCurrencyTotal,
  ExpenseSummary,
  FamilyMember,
  FinanceCategory,
  PagedResponse,
  Transaction,
  TransactionRequest,
} from '../types';

/** Jurnal sahifasi bir yuklashda oladigan yozuvlar soni (kun guruhlari uzilmasligi uchun yirik). */
const JOURNAL_PAGE_SIZE = 100;

export interface ExpenseDayGroup {
  /** YYYY-MM-DD */
  date: string;
  items: Transaction[];
}

/** 'YYYY-MM' oy kursorini oldinga/orqaga suradi. */
const shiftMonth = (cursor: string, delta: number): string => {
  const [y, m] = cursor.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** Oyning oxirgi kuni (28–31). */
const lastDayOfMonth = (cursor: string): number => {
  const [y, m] = cursor.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/**
 * Kunlik xarajatlar sahifasi uchun butun react-query holati: oy kursori,
 * jurnal (infinite), xulosa (summary), reference data va mutation'lar.
 *
 * <p>Jurnal formatida raqamlangan sahifalash kun guruhini o'rtasidan uzadi,
 * shu sabab desktop/mobil bir xil infinite "Yana yuklash" oqimini ishlatadi
 * (D8'dagi ikki-query naqshidan ongli chekinish). Scope queryKey ichida.</p>
 */
export function useDailyExpensesData() {
  const queryClient = useQueryClient();
  const activeScopeId = useActiveScopeId();
  const lastCreatedAt = useQuickEntryStore((s) => s.lastCreatedAt);

  const today = getTashkentToday();
  const currentMonth = today.slice(0, 7);

  // ---------- Oy kursori ----------
  const [monthCursor, setMonthCursor] = useState(currentMonth);
  const isCurrentMonth = monthCursor === currentMonth;

  const fromDate = `${monthCursor}-01`;
  const toDate = `${monthCursor}-${String(lastDayOfMonth(monthCursor)).padStart(2, '0')}`;

  const goPrevMonth = useCallback(() => setMonthCursor((c) => shiftMonth(c, -1)), []);
  const goNextMonth = useCallback(
    () => setMonthCursor((c) => (c === currentMonth ? c : shiftMonth(c, 1))),
    [currentMonth]
  );
  const goCurrentMonth = useCallback(() => setMonthCursor(currentMonth), [currentMonth]);

  // ---------- Reference data (tez kiritish formasi va tahrirlash modali uchun) ----------
  const accountsQuery = useQuery({
    queryKey: ['accounts-ref', activeScopeId],
    queryFn: async (): Promise<Account[]> => (await accountsApi.getList()).data.data,
  });
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
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

  // ---------- Jurnal (faqat EXPENSE, tanlangan oy) ----------
  // lastCreatedAt queryKey ichida: FAB orqali yaratilgan xarajat darhol ko'rinadi
  const journalQuery = useInfiniteQuery({
    queryKey: ['daily-expenses', activeScopeId, monthCursor, lastCreatedAt],
    queryFn: async ({ pageParam }): Promise<PagedResponse<Transaction>> =>
      (
        await transactionsApi.getAll(pageParam, JOURNAL_PAGE_SIZE, {
          type: 'EXPENSE',
          from: fromDate,
          to: toDate,
        })
      ).data.data,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.totalPages ? allPages.length : undefined,
  });

  const allItems = useMemo(
    () => journalQuery.data?.pages.flatMap((p) => p.content) ?? [],
    [journalQuery.data]
  );
  const totalElements = journalQuery.data?.pages[0]?.totalElements ?? 0;

  // ---------- Xulosa (kun/kategoriya/davr jamlari) ----------
  const summaryQuery = useQuery({
    queryKey: ['daily-expenses-summary', activeScopeId, monthCursor, lastCreatedAt],
    queryFn: async (): Promise<ExpenseSummary> =>
      (await transactionsApi.getExpenseSummary(fromDate, toDate)).data.data,
  });
  const summary = summaryQuery.data;

  // ---------- Hosila ma'lumotlar ----------

  /** Kunlar bo'yicha guruhlangan jurnal (backend sanaga ko'ra kamayish tartibida beradi). */
  const dayGroups = useMemo<ExpenseDayGroup[]>(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of allItems) {
      const key = t.transactionDate?.slice(0, 10) ?? '';
      const list = map.get(key);
      if (list) {
        list.push(t);
      } else {
        map.set(key, [t]);
      }
    }
    return [...map.entries()].map(([date, items]) => ({ date, items }));
  }, [allItems]);

  /** Kun sanasi -> shu kunning valyuta kesimidagi jamlari (storno chiqarilgan). */
  const dailyTotalsByDate = useMemo(() => {
    const map = new Map<string, ExpenseCurrencyTotal[]>();
    for (const d of summary?.dailyTotals ?? []) {
      const list = map.get(d.date) ?? [];
      list.push({ currency: d.currency, total: d.total, count: d.count });
      map.set(d.date, list);
    }
    return map;
  }, [summary]);

  const periodTotals = useMemo(() => summary?.periodTotals ?? [], [summary]);
  const todayTotals = useMemo(() => dailyTotalsByDate.get(today) ?? [], [dailyTotalsByDate, today]);

  /** Asosiy valyuta — davrda eng katta jami bo'lgan valyuta (backend saralab beradi). */
  const primaryCurrency = periodTotals[0]?.currency;

  /** Kunlik o'rtacha (asosiy valyuta): joriy oyda o'tgan kunlarga, o'tgan oyda oy uzunligiga bo'linadi. */
  const avgPerDay = useMemo(() => {
    if (!primaryCurrency) return 0;
    const total = periodTotals[0]?.total ?? 0;
    const elapsedDays = isCurrentMonth ? Number(today.slice(8, 10)) : lastDayOfMonth(monthCursor);
    return elapsedDays > 0 ? total / elapsedDays : 0;
  }, [primaryCurrency, periodTotals, isCurrentMonth, today, monthCursor]);

  /** Eng xarajatli kun (asosiy valyuta bo'yicha). */
  const maxDay = useMemo(() => {
    if (!primaryCurrency || !summary) return null;
    let best: { date: string; total: number } | null = null;
    for (const d of summary.dailyTotals) {
      if (d.currency !== primaryCurrency) continue;
      if (!best || d.total > best.total) best = { date: d.date, total: d.total };
    }
    return best;
  }, [summary, primaryCurrency]);

  const entryCount = useMemo(
    () => periodTotals.reduce((sum, t) => sum + t.count, 0),
    [periodTotals]
  );

  // ---------- Yangilash / mutation'lar ----------

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['daily-expenses'] });
    void queryClient.invalidateQueries({ queryKey: ['daily-expenses-summary'] });
    // Boshqa sahifalardagi ro'yxatlar ham eskirmasin
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['transactions-infinite'] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (payload: TransactionRequest) => transactionsApi.create(payload),
    onSuccess: () => {
      toast.success("Xarajat qo'shildi");
      invalidateAll();
    },
    onError: (error) => toastApiError(error, 'Xarajatni saqlashda xatolik'),
  });

  const reverseMutation = useMutation({
    mutationFn: (id: number) =>
      transactionsApi.reverse(id, 'Foydalanuvchi tomonidan storno qilindi'),
    onSuccess: () => {
      toast.success('Xarajat storno qilindi');
      invalidateAll();
    },
    onError: (error) => toastApiError(error, 'Xarajatni storno qilishda xatolik'),
  });

  const handleLoadMore = useCallback(() => {
    if (journalQuery.hasNextPage && !journalQuery.isFetchingNextPage) {
      void journalQuery.fetchNextPage();
    }
  }, [journalQuery]);

  return {
    // muhit
    activeScopeId,
    // oy kursori
    monthCursor,
    isCurrentMonth,
    goPrevMonth,
    goNextMonth,
    goCurrentMonth,
    today,
    // reference data
    accounts,
    accountsLoaded: accountsQuery.isSuccess,
    categories,
    members,
    // jurnal
    dayGroups,
    dailyTotalsByDate,
    totalElements,
    loadedCount: allItems.length,
    hasMore: journalQuery.hasNextPage ?? false,
    loading: journalQuery.isLoading,
    loadingMore: journalQuery.isFetchingNextPage,
    handleLoadMore,
    // xulosa
    summaryLoading: summaryQuery.isLoading,
    categoryTotals: summary?.categoryTotals ?? [],
    periodTotals,
    todayTotals,
    primaryCurrency,
    avgPerDay,
    maxDay,
    entryCount,
    // mutation'lar
    createMutation,
    reverseMutation,
    invalidateAll,
  };
}
