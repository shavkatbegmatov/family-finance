import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { familyReportsApi } from '../api/family-reports.api';
import { useActiveScopeId } from './useScopeChange';
import type {
  IncomeExpenseReport,
  CategoryReport,
  MemberReport,
  CategoryType,
  ApiResponse,
} from '../types';

/** Daromad/Xarajat BarChart elementi — fill original ReportsPage bilan AYNAN. */
export interface IncomeExpenseBarDatum {
  name: string;
  amount: number;
  fill: string;
}

/** Hisobot tab kaliti — original ReportsPage string literal'lari bilan AYNAN. */
export type ReportTab = 'income-expense' | 'category' | 'member';

/**
 * ReportsPage uchun butun react-query ma'lumot qatlami: 3 hisobot (daromad/
 * xarajat, kategoriya, oila a'zolari) + kategoriya turi toggle holati hamda
 * UI hosilaviy qiymatlari (farq, bar-chart datasi, saralangan kategoriyalar,
 * jami summa).
 *
 * <p>Aktiv scope queryKey ichida — scope almashganda avtomatik refetch (D8
 * migratsiyasi). Date-range (from/to) ham queryKey'da — davr o'zgarsa refetch.
 * categoryType queryKey'da — INCOME/EXPENSE almashganda kategoriya hisoboti
 * AYNAN qayta yuklanadi (original useEffect dependency mantig'i).</p>
 *
 * <p>queryKey'lar:</p>
 * <ul>
 *   <li>daromad/xarajat — {@code ['reports-income-expense', fromDate, toDate, activeScopeId]}</li>
 *   <li>kategoriya — {@code ['reports-category', categoryType, fromDate, toDate, activeScopeId]}</li>
 *   <li>a'zolar — {@code ['reports-member', fromDate, toDate, activeScopeId]}</li>
 * </ul>
 *
 * <p>Har hisobot faqat o'z tabida yuklanadi (lazy — original ReportsPage
 * activeTab dependency mantig'i; enabled shartiga activeTab qo'shilgan,
 * MemberDetailPage transactions lazy yuklash bilan izchil). Xato toast'i o'rniga
 * original inline error alert (isError → orchestrator) saqlangan.</p>
 *
 * @param fromDate   resolvedRange.start (orchestrator date-range holatidan)
 * @param toDate     resolvedRange.end
 * @param activeTab  joriy tab — har hisobot faqat o'z tabida yuklanadi (lazy)
 */
export function useReportsData(
  fromDate: string,
  toDate: string,
  activeTab: ReportTab
) {
  const activeScopeId = useActiveScopeId();

  // Kategoriya turi toggle (INCOME/EXPENSE) — queryKey'da → o'zgarsa refetch.
  const [categoryType, setCategoryType] = useState<CategoryType>('EXPENSE');

  const hasRange = Boolean(fromDate && toDate);

  // ---------- Tab 1: Daromad / Xarajat (react-query, lazy) ----------
  const incomeExpenseQuery = useQuery({
    queryKey: ['reports-income-expense', fromDate, toDate, activeScopeId],
    queryFn: async (): Promise<IncomeExpenseReport> => {
      const res = await familyReportsApi.getIncomeExpense(fromDate, toDate);
      return (res.data as ApiResponse<IncomeExpenseReport>).data;
    },
    enabled: activeTab === 'income-expense' && hasRange,
  });

  // ---------- Tab 2: Kategoriya (react-query, lazy) — categoryType queryKey'da ----------
  const categoryQuery = useQuery({
    queryKey: ['reports-category', categoryType, fromDate, toDate, activeScopeId],
    queryFn: async (): Promise<CategoryReport[]> => {
      const res = await familyReportsApi.getCategoryReport(categoryType, fromDate, toDate);
      return (res.data as ApiResponse<CategoryReport[]>).data;
    },
    enabled: activeTab === 'category' && hasRange,
  });

  // ---------- Tab 3: Oila a'zolari (react-query, lazy) ----------
  const memberQuery = useQuery({
    queryKey: ['reports-member', fromDate, toDate, activeScopeId],
    queryFn: async (): Promise<MemberReport[]> => {
      const res = await familyReportsApi.getMemberReport(fromDate, toDate);
      return (res.data as ApiResponse<MemberReport[]>).data;
    },
    enabled: activeTab === 'member' && hasRange,
  });

  const incomeExpense = incomeExpenseQuery.data ?? null;
  const categories = useMemo(() => categoryQuery.data ?? [], [categoryQuery.data]);
  const members = memberQuery.data ?? [];

  // ------ Holat (original isLoading/error mantig'i) ------
  const ieLoading = incomeExpenseQuery.isFetching;
  const catLoading = categoryQuery.isFetching;
  const memLoading = memberQuery.isFetching;
  const isLoading = ieLoading || catLoading || memLoading;

  const isError =
    incomeExpenseQuery.isError || categoryQuery.isError || memberQuery.isError;

  // Original inline error alert matnini saqlash (eng birinchi xato manbasiga ko'ra).
  const error = useMemo<string | null>(() => {
    if (incomeExpenseQuery.isError) return 'Daromad/Xarajat hisobotini yuklashda xatolik';
    if (categoryQuery.isError) return 'Kategoriya hisobotini yuklashda xatolik';
    if (memberQuery.isError) return "Oila a'zolari hisobotini yuklashda xatolik";
    return null;
  }, [incomeExpenseQuery.isError, categoryQuery.isError, memberQuery.isError]);

  // ------ Hosilaviy qiymatlar (original ReportsPage bilan AYNAN) ------
  const difference = incomeExpense
    ? incomeExpense.totalIncome - incomeExpense.totalExpense
    : 0;

  const barChartData = useMemo<IncomeExpenseBarDatum[]>(
    () =>
      incomeExpense
        ? [
            { name: 'Daromad', amount: incomeExpense.totalIncome, fill: '#22c55e' },
            { name: 'Xarajat', amount: incomeExpense.totalExpense, fill: '#ef4444' },
          ]
        : [],
    [incomeExpense]
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => b.amount - a.amount),
    [categories]
  );

  const totalCategoryAmount = useMemo(
    () => sortedCategories.reduce((sum, c) => sum + c.amount, 0),
    [sortedCategories]
  );

  return {
    // kategoriya turi toggle
    categoryType,
    setCategoryType,
    // holat
    isLoading,
    isError,
    error,
    // tab 1
    incomeExpense,
    ieLoading,
    difference,
    barChartData,
    // tab 2
    catLoading,
    sortedCategories,
    totalCategoryAmount,
    // tab 3
    members,
    memLoading,
  };
}
