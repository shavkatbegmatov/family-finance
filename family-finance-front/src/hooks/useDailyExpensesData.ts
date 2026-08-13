import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { transactionsApi } from '../api/transactions.api';
import { accountsApi } from '../api/accounts.api';
import { categoriesApi } from '../api/categories.api';
import { familyMembersApi } from '../api/family-members.api';
import { useActiveScopeId } from './useScopeChange';
import { useQuickEntryStore } from '../store/quickEntryStore';
import { MONTHS_UZ, getTashkentToday } from '../config/constants';
import { toastApiError } from '../utils/apiError';
import type {
  Account,
  CategoryExpenseTotal,
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

/** Grafik uchun oyning bitta kuni (asosiy valyutada). */
export interface ExpenseChartDay {
  /** YYYY-MM-DD */
  date: string;
  /** Oy kuni (1..31) */
  day: number;
  total: number;
  /** Shu kunda BOSHQA valyutada xarajat bor (tooltip "xarajat yo'q" demasligi uchun). */
  hasOther: boolean;
}

/** O'tgan oy bilan taqqoslash (asosiy valyuta, o'tgan kunlar pariteti bilan). */
export interface MonthTrend {
  /** Foiz o'zgarish (musbat = ko'proq sarflanyapti). */
  pct: number;
  /** O'tgan oyning taqqoslanadigan (shu kunlargacha) jami. */
  prevTotal: number;
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

  // ---------- Kategoriya filtri (jurnalga ta'sir qiladi; oy statistikasi umumiy qoladi) ----------
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>(undefined);
  const toggleCategoryFilter = useCallback(
    (categoryId: number) =>
      setFilterCategoryId((current) => (current === categoryId ? undefined : categoryId)),
    []
  );

  // ---------- Jurnal (faqat EXPENSE, tanlangan oy) ----------
  // lastCreatedAt queryKey ichida: FAB orqali yaratilgan xarajat darhol ko'rinadi
  const journalQuery = useInfiniteQuery({
    queryKey: ['daily-expenses', activeScopeId, monthCursor, filterCategoryId ?? 'all', lastCreatedAt],
    queryFn: async ({ pageParam }): Promise<PagedResponse<Transaction>> =>
      (
        await transactionsApi.getAll(pageParam, JOURNAL_PAGE_SIZE, {
          type: 'EXPENSE',
          from: fromDate,
          to: toDate,
          categoryId: filterCategoryId,
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

  // O'tgan oy xulosasi — trend taqqoslash va bo'sh oyda kategoriya chiplari uchun.
  // queryKey oilasi joriy xulosa bilan bir xil: o'tgan oyga o'tilganda kesh qayta ishlatiladi.
  const prevMonthCursor = shiftMonth(monthCursor, -1);
  const prevSummaryQuery = useQuery({
    queryKey: ['daily-expenses-summary', activeScopeId, prevMonthCursor, lastCreatedAt],
    queryFn: async (): Promise<ExpenseSummary> =>
      (
        await transactionsApi.getExpenseSummary(
          `${prevMonthCursor}-01`,
          `${prevMonthCursor}-${String(lastDayOfMonth(prevMonthCursor)).padStart(2, '0')}`
        )
      ).data.data,
  });
  const prevSummary = prevSummaryQuery.data;

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

  /**
   * O'tgan oy bilan taqqoslash — o'tgan kunlar pariteti bilan (joriy oyda faqat
   * o'tgan oyning shu kunigacha bo'lgan qismi olinadi, aks holda oy boshida trend
   * doim "kamaydi" ko'rsatib yolg'on tinchlantirardi). Faqat asosiy valyuta.
   */
  const monthTrend = useMemo<MonthTrend | null>(() => {
    if (!primaryCurrency || !prevSummary) return null;
    const currentTotal = periodTotals[0]?.total ?? 0;
    // Yopilgan oyda TO'LIQ oy taqqoslanadi (31 = hech qaysi kun filtrlanmaydi) —
    // aks holda 28-kunlik fevralni ko'rishda yanvarning 29-31 kunlari tushib qolardi
    const elapsedDays = isCurrentMonth ? Number(today.slice(8, 10)) : 31;
    const prevComparable = prevSummary.dailyTotals
      .filter((d) => d.currency === primaryCurrency && Number(d.date.slice(8, 10)) <= elapsedDays)
      .reduce((sum, d) => sum + d.total, 0);
    if (prevComparable <= 0) return null;
    return {
      pct: Math.round(((currentTotal - prevComparable) / prevComparable) * 100),
      prevTotal: prevComparable,
    };
  }, [primaryCurrency, prevSummary, periodTotals, isCurrentMonth, today]);

  /**
   * Tezkor kiritish chiplari uchun eng ko'p ishlatilgan EXPENSE kategoriyalar —
   * joriy + o'tgan oy yozuvlar soni bo'yicha (oy boshida ham bo'sh qolmasin).
   */
  const topCategories = useMemo<FinanceCategory[]>(() => {
    const counts = new Map<number, number>();
    const addCounts = (list?: CategoryExpenseTotal[]) => {
      for (const c of list ?? []) {
        if (c.categoryId == null) continue;
        counts.set(c.categoryId, (counts.get(c.categoryId) ?? 0) + c.count);
      }
    };
    addCounts(summary?.categoryTotals);
    addCounts(prevSummary?.categoryTotals);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => categories.find((c) => c.id === id))
      .filter((c): c is FinanceCategory => Boolean(c && c.type === 'EXPENSE' && c.isActive))
      .slice(0, 6);
  }, [summary, prevSummary, categories]);

  /** Oy grafigi: barcha kunlar (xarajatsiz kunlar 0 bilan), asosiy valyutada. */
  const chartDays = useMemo<ExpenseChartDay[]>(() => {
    if (!primaryCurrency) return [];
    const byDay = new Map<string, number>();
    const otherDays = new Set<string>();
    for (const d of summary?.dailyTotals ?? []) {
      if (d.currency === primaryCurrency) {
        byDay.set(d.date, d.total);
      } else {
        otherDays.add(d.date);
      }
    }
    const days = lastDayOfMonth(monthCursor);
    return Array.from({ length: days }, (_, i) => {
      const date = `${monthCursor}-${String(i + 1).padStart(2, '0')}`;
      return { date, day: i + 1, total: byDay.get(date) ?? 0, hasOther: otherDays.has(date) };
    });
  }, [summary, primaryCurrency, monthCursor]);

  /** Izoh autocomplete uchun so'nggi noyob izohlar (yuklangan jurnal sahifalaridan). */
  const recentDescriptions = useMemo<string[]>(() => {
    const seen = new Set<string>();
    for (const t of allItems) {
      const d = t.description?.trim();
      if (d && t.status !== 'REVERSED') seen.add(d);
      if (seen.size >= 15) break;
    }
    return [...seen];
  }, [allItems]);

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
    onSuccess: (_res, variables) => {
      // Ko'rilayotgan oydan tashqariga saqlansa (oyning 1-kunida "Kecha", custom
      // sana, o'tgan oy ochiq turganda "Bugun") yozuv ekranda ko'rinmaydi —
      // jim toast dublikat kiritishga olib borardi; sanani aniq aytamiz.
      const savedDate = variables.transactionDate.slice(0, 10);
      if (savedDate.slice(0, 7) !== monthCursor) {
        const [, m, d] = savedDate.split('-').map(Number);
        toast.success(
          `Xarajat ${d}-${(MONTHS_UZ[m - 1] ?? '').toLowerCase()}ga saqlandi (boshqa oy)`,
          { duration: 5000 }
        );
      } else {
        toast.success("Xarajat qo'shildi");
      }
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
    // kategoriya filtri
    filterCategoryId,
    toggleCategoryFilter,
    clearCategoryFilter: () => setFilterCategoryId(undefined),
    // xulosa
    summaryLoading: summaryQuery.isLoading,
    categoryTotals: summary?.categoryTotals ?? [],
    periodTotals,
    todayTotals,
    primaryCurrency,
    avgPerDay,
    maxDay,
    entryCount,
    monthTrend,
    topCategories,
    chartDays,
    recentDescriptions,
    // mutation'lar
    createMutation,
    reverseMutation,
    invalidateAll,
  };
}
