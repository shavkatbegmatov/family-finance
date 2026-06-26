import { useMemo } from 'react';
import type { FamilyChartData } from '../types';

// Insight thresholds
/** % — bundan kichik o'zgarish trend ko'rsatilmaydi */
export const TREND_NEUTRAL_THRESHOLD = 1;

export interface TrendInfo {
  dir: 'up' | 'down' | 'flat';
  value: string;
}

/** Foiz farqi (oldingi davrga nisbatan). */
export function calcTrend(current: number, previous: number): TrendInfo | null {
  if (!previous || previous === 0) return null;
  const diff = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(diff) < TREND_NEUTRAL_THRESHOLD) {
    return { dir: 'flat', value: `${diff.toFixed(1)}%` };
  }
  return {
    dir: diff > 0 ? 'up' : 'down',
    value: `${Math.abs(diff).toFixed(1)}%`,
  };
}

/**
 * Joriy oy vs oldingi oy trendlari (oxirgi 2 oy asosida): daromad, xarajat va
 * sof jamg'arish (income - expense). Logika original DashboardPage useMemo'lari
 * bilan AYNAN bir xil.
 */
export function useTrendCalculations(charts: FamilyChartData | null) {
  // Joriy oy vs oldingi oy trendlari (oxirgi 2 oy asosida)
  const { incomeTrend, expenseTrend } = useMemo(() => {
    const trend = charts?.monthlyTrend || [];
    if (trend.length < 2) {
      return { incomeTrend: null, expenseTrend: null };
    }
    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    return {
      incomeTrend: calcTrend(current.income, previous.income),
      expenseTrend: calcTrend(current.expense, previous.expense),
    };
  }, [charts?.monthlyTrend]);

  // Net savings trend
  const savingsTrend = useMemo(() => {
    const trend = charts?.monthlyTrend || [];
    if (trend.length < 2) return null;
    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    return calcTrend(current.income - current.expense, previous.income - previous.expense);
  }, [charts?.monthlyTrend]);

  return { incomeTrend, expenseTrend, savingsTrend };
}
