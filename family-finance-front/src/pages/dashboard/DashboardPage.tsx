import type { CSSProperties } from 'react';
import { useState, useCallback, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  ArrowLeftRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermission, PermissionCode } from '../../hooks/usePermission';
import { formatCurrency, formatCompactCurrency, MONTHS_UZ } from '../../config/constants';
import type { CurrencyBalance } from '../../types';
import { RefreshingPill } from '../../components/common/RefreshingPill';
import { PageHeader } from '../../components/layout/PageHeader';
import { OnboardingChecklist } from '../../components/dashboard/OnboardingChecklist';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useTrendCalculations } from '../../hooks/useTrendCalculations';
import { useDashboardInsights } from '../../hooks/useDashboardInsights';
import { KPICard } from '../../components/dashboard/KPICard';
import { MobileBalanceHero } from '../../components/dashboard/MobileHeroCard';
import { MobileQuickActions } from '../../components/dashboard/MobileQuickActions';
import { IncomeExpenseTrendChart } from '../../components/dashboard/IncomeExpenseTrendChart';
import { RANGE_LABELS, type ChartRange } from '../../components/dashboard/chartRange';
import { ExpenseByCategoryChart } from '../../components/dashboard/ExpenseByCategoryChart';
import { BudgetProgressCard, SavingsProgressCard } from '../../components/dashboard/BudgetProgressCards';
import { SecondaryStats } from '../../components/dashboard/SecondaryStats';
import { RecentTransactionsCard } from '../../components/dashboard/RecentTransactionsCard';
import { InsightCardsTop, InsightCardsExtra } from '../../components/dashboard/InsightCards';

const HIDE_BALANCE_KEY = 'ff-hide-balance';

/** D7: balansni valyutasi bilan formatlaydi (UZS -> "so'm", boshqa valyuta -> kod). */
function formatBalance(b?: CurrencyBalance): string {
  if (!b) return "0 so'm";
  return `${formatCompactCurrency(b.amount)} ${b.currency === 'UZS' ? "so'm" : b.currency}`;
}

/** Birinchi yuklash skeleton'i. */
function DashboardSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-8 w-48" />
          <div className="skeleton mt-2 h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card p-4 lg:p-5">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-3 h-8 w-32" />
            <div className="skeleton mt-3 h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="surface-card p-4 lg:p-5">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-3 h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface-card p-4 lg:col-span-2 lg:p-5">
          <div className="skeleton h-72 w-full" />
        </div>
        <div className="surface-card p-4 lg:p-5">
          <div className="skeleton h-72 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="surface-card p-4 lg:p-5">
          <div className="skeleton h-48 w-full" />
        </div>
        <div className="surface-card p-4 lg:p-5">
          <div className="skeleton h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [chartRange, setChartRange] = useState<ChartRange>('6m');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem(HIDE_BALANCE_KEY) === '1'
  );
  const { hasPermission } = usePermission();
  const canCreateTransaction = hasPermission(PermissionCode.TRANSACTIONS_CREATE);

  const toggleHideBalance = useCallback(() => {
    setHideBalance((prev) => {
      const next = !prev;
      localStorage.setItem(HIDE_BALANCE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  // ---------- Data (react-query) ----------
  const { stats, charts, recentTransactions, initialLoading, refreshing } = useDashboardData();

  // Joriy oy vs oldingi oy trendlari + sof jamg'arish trendi
  const { incomeTrend, expenseTrend, savingsTrend } = useTrendCalculations(charts);

  // Range bo'yicha trend formatlash (oxirgi N oy)
  const formattedMonthlyTrend = useMemo(() => {
    const months = RANGE_LABELS[chartRange].months;
    return (charts?.monthlyTrend || []).slice(-months).map((item) => {
      const [, monthStr] = item.month.split('-');
      const monthIndex = parseInt(monthStr, 10) - 1;
      return {
        ...item,
        monthLabel: MONTHS_UZ[monthIndex] || item.month,
      };
    });
  }, [charts?.monthlyTrend, chartRange]);

  // Insightlar — ma'lumotdan avtomatik xulosa
  const insights = useDashboardInsights({
    stats,
    monthlyTrend: charts?.monthlyTrend || [],
    expenseTrend,
    incomeTrend,
  });

  // Kategoriya bo'yicha filterlangan tranzaksiyalar
  const filteredTransactions = useMemo(() => {
    if (!categoryFilter) return recentTransactions;
    return recentTransactions.filter((tx) => tx.categoryName === categoryFilter);
  }, [recentTransactions, categoryFilter]);

  if (initialLoading) {
    return <DashboardSkeleton />;
  }

  // Joriy oy nomi (subtitle uchun)
  const currentMonthLabel = (() => {
    const trend = charts?.monthlyTrend || [];
    if (trend.length === 0) return '';
    const last = trend[trend.length - 1];
    const [, monthStr] = last.month.split('-');
    const monthIndex = parseInt(monthStr, 10) - 1;
    return MONTHS_UZ[monthIndex] || last.month;
  })();

  return (
    <div className="relative space-y-4 lg:space-y-6">
      {/* Refresh — bloklamaydigan indikator (eski blur-overlay kontent bilan ishlashni to'xtatardi) */}
      {refreshing && <RefreshingPill />}

      {/* Mobil: gradient hero balans kartasi + tezkor amallar */}
      <div className="space-y-4 lg:hidden">
        <MobileBalanceHero
          balance={stats?.totalBalance || 0}
          income={stats?.totalIncome || 0}
          expense={stats?.totalExpense || 0}
          hidden={hideBalance}
          onToggleHidden={toggleHideBalance}
          monthLabel={currentMonthLabel}
        />
        <MobileQuickActions canCreate={canCreateTransaction} />
      </div>

      {/* Desktop sarlavha */}
      <PageHeader
        title="Bosh sahifa"
        subtitle={
          <>
            Oilaviy moliya boshqaruvi
            {currentMonthLabel && <> · {currentMonthLabel}</>}
          </>
        }
      />

      {/* Onboarding — yangi foydalanuvchi uchun 4 qadamli yo'naltirish (E9).
          Tranzaksiya+byudjet bo'lgan foydalanuvchida o'zi yashirinadi. */}
      <OnboardingChecklist
        stats={stats}
        transactionCount={recentTransactions.length}
        loaded={!initialLoading}
      />

      {/* Insights — AI tipida avtomatik xulosalar (max 2 ta birinchi navbatda) */}
      <InsightCardsTop insights={insights} />

      {/* KPI Cards (desktop) — endi trend indicator bilan. Mobilda hero karta o'rnini bosadi. */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        <KPICard
          title="Umumiy balans"
          value={stats?.balancesByCurrency?.length
            ? formatBalance(stats.balancesByCurrency[0])
            : formatCurrency(stats?.totalBalance || 0)}
          icon={Wallet}
          color="primary"
          subtitle={stats?.balancesByCurrency && stats.balancesByCurrency.length > 1
            ? stats.balancesByCurrency.slice(1).map(formatBalance).join(' · ')
            : 'barcha hisoblar'}
          style={{ '--i': 0 } as CSSProperties}
        />
        <KPICard
          title="Bu oylik daromad"
          value={formatCurrency(stats?.totalIncome || 0)}
          icon={TrendingUp}
          color="success"
          trend={incomeTrend}
          trendGoodDirection="up"
          subtitle="o'tgan oyga nisbatan"
          style={{ '--i': 1 } as CSSProperties}
        />
        <KPICard
          title="Bu oylik xarajat"
          value={formatCurrency(stats?.totalExpense || 0)}
          icon={TrendingDown}
          color="error"
          trend={expenseTrend}
          trendGoodDirection="down"
          subtitle="o'tgan oyga nisbatan"
          style={{ '--i': 2 } as CSSProperties}
        />
        <KPICard
          title="Jamg'armalar"
          value={formatCurrency(stats?.totalSavings || 0)}
          icon={PiggyBank}
          color="info"
          trend={savingsTrend}
          trendGoodDirection="up"
          subtitle="sof o'sish"
          style={{ '--i': 3 } as CSSProperties}
        />
      </div>

      {/* Secondary Stats */}
      <SecondaryStats stats={stats} />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Income vs Expense Trend - Takes 2 columns + range toggle */}
        <IncomeExpenseTrendChart
          data={formattedMonthlyTrend}
          range={chartRange}
          onRangeChange={setChartRange}
        />

        {/* Expense by Category - Pie Chart with click filter */}
        <ExpenseByCategoryChart
          data={charts?.expenseByCategory}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
        />
      </div>

      {/* Budget & Savings Progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BudgetProgressCard stats={stats} />
        <SavingsProgressCard stats={stats} />
      </div>

      {/* Qo'shimcha insightlar (agar ikkitadan ko'p bo'lsa, qolganlarini ko'rsatish) */}
      <InsightCardsExtra insights={insights} />

      {/* Recent Transactions */}
      <RecentTransactionsCard
        transactions={filteredTransactions}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />

      {/* Quick Links (desktop) — mobilda yuqoridagi tezkor amallar o'rnini bosadi */}
      <div className="hidden surface-card p-5 lg:block">
        <h3 className="mb-4 font-semibold">Tez havolalar</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link to="/transactions" className="btn btn-primary">
            <ArrowLeftRight className="h-4 w-4" />
            Tranzaksiyalar
          </Link>
          <Link to="/reports" className="btn btn-outline">
            <TrendingUp className="h-4 w-4" />
            Hisobotlar
          </Link>
          <Link to="/budget" className="btn btn-outline">
            <Target className="h-4 w-4" />
            Byudjet
          </Link>
        </div>
      </div>
    </div>
  );
}
