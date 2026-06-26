import { useMemo } from 'react';
import { formatCurrency } from '../config/constants';
import { BUDGET_THRESHOLDS } from '../config/chartColors';
import type { InsightTone } from '../components/common/InsightCard';
import type { FamilyDashboardStats, MonthlyTrendItem } from '../types';
import type { TrendInfo } from './useTrendCalculations';

// Insight thresholds
/** % */
const SAVINGS_RATE_GOOD = 20;
/** % */
const SAVINGS_RATE_LOW = 5;

export interface DashboardInsight {
  id: string;
  tone: InsightTone;
  title: string;
  message: React.ReactNode;
}

/**
 * Ma'lumotdan avtomatik dashboard insightlarini generatsiya qiladi (5 tur:
 * xarajat trend, daromad trend, jamg'arish darajasi, byudjet ogohlantirishi,
 * fallback "ma'lumot to'planmoqda"). Logika original DashboardPage bilan AYNAN
 * bir xil — faqat ko'chirildi.
 */
export function generateInsights({
  stats,
  monthlyTrend,
  expenseTrend,
  incomeTrend,
}: {
  stats: FamilyDashboardStats | null;
  monthlyTrend: MonthlyTrendItem[];
  expenseTrend: TrendInfo | null;
  incomeTrend: TrendInfo | null;
}): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  // 1. Xarajat trend insight
  if (expenseTrend && expenseTrend.dir !== 'flat') {
    if (expenseTrend.dir === 'down') {
      insights.push({
        id: 'expense-down',
        tone: 'positive',
        title: 'Xarajat kamaydi',
        message: (
          <>
            Bu oy xarajat o'tgan oyga nisbatan{' '}
            <span className="font-semibold text-success">{expenseTrend.value}</span> kam.
            Ajoyib natija!
          </>
        ),
      });
    } else if (expenseTrend.dir === 'up') {
      insights.push({
        id: 'expense-up',
        tone: 'warning',
        title: 'Xarajat oshdi',
        message: (
          <>
            Bu oy xarajat o'tgan oyga nisbatan{' '}
            <span className="font-semibold text-warning">{expenseTrend.value}</span> ko'paydi.
            Kategoriyalarni tekshirib ko'ring.
          </>
        ),
      });
    }
  }

  // 2. Daromad trend insight
  if (incomeTrend && incomeTrend.dir === 'up') {
    insights.push({
      id: 'income-up',
      tone: 'positive',
      title: 'Daromad oshdi',
      message: (
        <>
          Daromad o'tgan oyga nisbatan{' '}
          <span className="font-semibold text-success">{incomeTrend.value}</span> ko'paydi.
        </>
      ),
    });
  }

  // 3. Jamg'arish darajasi (savings rate)
  if (stats && stats.totalIncome > 0) {
    const savingsRate = ((stats.totalIncome - stats.totalExpense) / stats.totalIncome) * 100;
    if (savingsRate >= SAVINGS_RATE_GOOD) {
      insights.push({
        id: 'savings-good',
        tone: 'positive',
        title: 'Yaxshi jamg\'arish',
        message: (
          <>
            Bu oy daromadingizning{' '}
            <span className="font-semibold text-success">{savingsRate.toFixed(0)}%</span>{' '}
            qismini tejadingiz. Maqsadlaringizga yaqinlashyapsiz.
          </>
        ),
      });
    } else if (savingsRate < SAVINGS_RATE_LOW && savingsRate >= 0) {
      insights.push({
        id: 'savings-low',
        tone: 'warning',
        title: 'Jamg\'arish kam',
        message: (
          <>
            Bu oy faqat{' '}
            <span className="font-semibold text-warning">{savingsRate.toFixed(0)}%</span>{' '}
            tejadingiz. Maqsad — kamida {SAVINGS_RATE_GOOD}%.
          </>
        ),
      });
    } else if (savingsRate < 0) {
      insights.push({
        id: 'overspent',
        tone: 'negative',
        title: 'Daromaddan ko\'p sarflandi',
        message: (
          <>
            Bu oyda xarajat daromaddan{' '}
            <span className="font-semibold text-error">
              {formatCurrency(stats.totalExpense - stats.totalIncome)}
            </span>{' '}
            ortiq. Byudjetni qayta ko'rib chiqing.
          </>
        ),
      });
    }
  }

  // 4. Byudjet ogohlantirishi
  if (stats?.budgetProgress?.length) {
    const overBudget = stats.budgetProgress.filter((b) => b.percentage > 100);
    const nearBudget = stats.budgetProgress.filter(
      (b) => b.percentage > BUDGET_THRESHOLDS.warning && b.percentage <= 100
    );
    if (overBudget.length > 0) {
      insights.push({
        id: 'budget-over',
        tone: 'negative',
        title: 'Byudjetdan oshib ketdi',
        message: (
          <>
            <span className="font-semibold text-error">{overBudget.length} ta kategoriya</span>{' '}
            byudjetdan oshib ketdi: {overBudget.slice(0, 2).map((b) => b.categoryName).join(', ')}
            {overBudget.length > 2 && ` va boshqalar`}.
          </>
        ),
      });
    } else if (nearBudget.length > 0) {
      insights.push({
        id: 'budget-near',
        tone: 'warning',
        title: 'Byudjet chegarasiga yaqin',
        message: (
          <>
            <span className="font-semibold text-warning">{nearBudget.length} ta kategoriya</span>{' '}
            byudjetning {BUDGET_THRESHOLDS.warning}% dan ko'pini ishlatdi.
          </>
        ),
      });
    }
  }

  // 5. Eng katta xarajat trend yo'q bo'lganda fallback
  if (insights.length === 0 && monthlyTrend.length === 0) {
    insights.push({
      id: 'no-data',
      tone: 'neutral',
      title: 'Ma\'lumot to\'planmoqda',
      message: 'Bir necha tranzaksiya qo\'shilgandan keyin shaxsiylashgan tavsiyalar paydo bo\'ladi.',
    });
  }

  return insights;
}

/**
 * Insightlarni memoizatsiya bilan hisoblovchi hook — original DashboardPage
 * useMemo bog'liqliklari bilan AYNAN bir xil.
 */
export function useDashboardInsights({
  stats,
  monthlyTrend,
  expenseTrend,
  incomeTrend,
}: {
  stats: FamilyDashboardStats | null;
  monthlyTrend: MonthlyTrendItem[];
  expenseTrend: TrendInfo | null;
  incomeTrend: TrendInfo | null;
}): DashboardInsight[] {
  return useMemo(
    () =>
      generateInsights({
        stats,
        monthlyTrend,
        expenseTrend,
        incomeTrend,
      }),
    [stats, monthlyTrend, expenseTrend, incomeTrend]
  );
}
