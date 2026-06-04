import type { CSSProperties } from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  HandMetal,
  ArrowLeftRight,
  BarChart3,
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useQuickEntryStore } from '../../store/quickEntryStore';
import { usePermission, PermissionCode } from '../../hooks/usePermission';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { familyDashboardApi } from '../../api/family-dashboard.api';
import { useScopeChangeEffect } from '../../hooks/useScopeChange';
import { formatCurrency, formatCompactCurrency, MONTHS_UZ } from '../../config/constants';
import type {
  FamilyDashboardStats,
  FamilyChartData,
  Transaction,
  MonthlyTrendItem,
  CategoryChartItem,
  BudgetProgressItem,
} from '../../types';
import { useNotificationsStore } from '../../store/notificationsStore';
import { InsightCard, type InsightTone } from '../../components/common/InsightCard';

// Professional rang palitrasi
const COLORS = {
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  secondary: '#8b5cf6',
  chart: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'],
};

// Insight thresholds
const TREND_NEUTRAL_THRESHOLD = 1; // % — bundan kichik o'zgarish trend ko'rsatilmaydi
const SAVINGS_RATE_GOOD = 20; // %
const SAVINGS_RATE_LOW = 5; // %
const BUDGET_WARNING_THRESHOLD = 80; // %

// Chart range options
type ChartRange = '3m' | '6m' | '12m';
const RANGE_LABELS: Record<ChartRange, { short: string; long: string; months: number }> = {
  '3m': { short: '3 oy', long: 'Oxirgi 3 oy', months: 3 },
  '6m': { short: '6 oy', long: 'Oxirgi 6 oy', months: 6 },
  '12m': { short: '12 oy', long: 'Oxirgi 12 oy', months: 12 },
};

interface TrendInfo {
  dir: 'up' | 'down' | 'flat';
  value: string;
}

// Foiz farqi (oldingi davrga nisbatan)
function calcTrend(current: number, previous: number): TrendInfo | null {
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

// KPI karta komponenti — trend indicator bilan
function KPICard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  trend,
  trendGoodDirection = 'up',
  subtitle,
  className,
  style,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  trend?: TrendInfo | null;
  trendGoodDirection?: 'up' | 'down';
  subtitle?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  };

  const trendIsGood = trend && trend.dir !== 'flat' && trend.dir === trendGoodDirection;
  const trendIsBad = trend && trend.dir !== 'flat' && trend.dir !== trendGoodDirection;

  return (
    <div
      className={clsx(
        'surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      style={style}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {trend ? (
                <span
                  className={clsx(
                    'inline-flex items-center gap-0.5 font-semibold',
                    trendIsGood && 'text-success',
                    trendIsBad && 'text-error',
                    trend.dir === 'flat' && 'text-base-content/50'
                  )}
                >
                  {trend.dir === 'up' && '↑'}
                  {trend.dir === 'down' && '↓'}
                  {trend.dir === 'flat' && '→'}
                  {' '}{trend.value}
                </span>
              ) : (
                <span className="text-base-content/40">—</span>
              )}
              {subtitle && (
                <span className="text-base-content/50 truncate">{subtitle}</span>
              )}
            </div>
          </div>
          <div
            className={clsx(
              'grid h-12 w-12 flex-none place-items-center rounded-2xl border',
              colorMap[color]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Chart Card komponenti
function ChartCard({
  title,
  icon: Icon,
  children,
  action,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('surface-card overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-base-200 px-5 py-4">
        <h3 className="flex items-center gap-2 font-semibold">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Recharts tooltip types
interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-base-200 bg-base-100 p-3 shadow-lg">
        <p className="mb-2 font-medium">{label}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Transaction type helpers
const transactionTypeConfig: Record<string, { label: string; color: string; sign: string }> = {
  INCOME: { label: 'Daromad', color: 'text-success', sign: '+' },
  EXPENSE: { label: 'Xarajat', color: 'text-error', sign: '-' },
  TRANSFER: { label: "O'tkazma", color: 'text-info', sign: '' },
};

// Range toggle (chart ustida)
function RangeToggle({ value, onChange }: { value: ChartRange; onChange: (r: ChartRange) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-base-200 bg-base-200/50 p-1">
      {(Object.keys(RANGE_LABELS) as ChartRange[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={clsx(
            'rounded-md px-2.5 py-1 text-xs font-medium transition',
            value === r
              ? 'bg-base-100 text-base-content shadow-sm'
              : 'text-base-content/60 hover:text-base-content'
          )}
        >
          {RANGE_LABELS[r].short}
        </button>
      ))}
    </div>
  );
}

// Generate dashboard insights from data
interface DashboardInsight {
  id: string;
  tone: InsightTone;
  title: string;
  message: React.ReactNode;
}

function generateInsights({
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
      (b) => b.percentage > BUDGET_WARNING_THRESHOLD && b.percentage <= 100
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
            byudjetning {BUDGET_WARNING_THRESHOLD}% dan ko'pini ishlatdi.
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

// ── Mobil: hero balans kartasi ichidagi statistik plitka ──
function HeroStat({
  label,
  value,
  hidden,
  icon: Icon,
}: {
  label: string;
  value: number;
  hidden: boolean;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl bg-white/12 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/75">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="mt-1 truncate text-[15px] font-bold tabular-nums text-white">
        {hidden ? '••••••' : formatCompactCurrency(value)}
        {!hidden && <span className="ml-0.5 text-[11px] font-medium text-white/70">so'm</span>}
      </p>
    </div>
  );
}

// ── Mobil: gradient hero balans kartasi (fintech uslubi) ──
function MobileBalanceHero({
  balance,
  income,
  expense,
  hidden,
  onToggleHidden,
  monthLabel,
}: {
  balance: number;
  income: number;
  expense: number;
  hidden: boolean;
  onToggleHidden: () => void;
  monthLabel: string;
}) {
  return (
    <div className="hero-card rounded-3xl p-5">
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/85">
          <Wallet className="h-4 w-4" />
          <span className="text-[13px] font-medium">Umumiy balans</span>
        </div>
        <button
          type="button"
          onClick={onToggleHidden}
          className="tap-sm grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white"
          aria-label={hidden ? "Balansni ko'rsatish" : 'Balansni yashirish'}
        >
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <p className="relative mt-2.5 font-display text-[30px] font-extrabold leading-none tracking-tight tabular-nums text-white">
        {hidden ? '••• ••• •••' : formatCurrency(balance)}
      </p>
      <p className="relative mt-1.5 text-xs text-white/70">
        {monthLabel ? `${monthLabel} · barcha hisoblar` : 'barcha hisoblar'}
      </p>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        <HeroStat label="Bu oy daromad" value={income} hidden={hidden} icon={ArrowDownLeft} />
        <HeroStat label="Bu oy xarajat" value={expense} hidden={hidden} icon={ArrowUpRight} />
      </div>
    </div>
  );
}

// ── Mobil: tezkor amallar qatori ──
interface QuickAction {
  key: string;
  label: string;
  icon: React.ElementType;
  tile: string;
  to?: string;
  onClick?: () => void;
}

function MobileQuickActions({ canCreate }: { canCreate: boolean }) {
  const openQuickEntry = useQuickEntryStore((s) => s.open);

  const actions: QuickAction[] = [
    ...(canCreate
      ? [
          { key: 'exp', label: 'Xarajat', icon: TrendingDown, tile: 'bg-error/10 text-error', onClick: () => openQuickEntry('EXPENSE') },
          { key: 'inc', label: 'Daromad', icon: TrendingUp, tile: 'bg-success/10 text-success', onClick: () => openQuickEntry('INCOME') },
        ]
      : []),
    { key: 'acc', label: 'Hisoblar', icon: Wallet, tile: 'bg-primary/10 text-primary', to: '/accounts' },
    { key: 'rep', label: 'Hisobot', icon: BarChart3, tile: 'bg-info/10 text-info', to: '/reports' },
    { key: 'bud', label: 'Byudjet', icon: Target, tile: 'bg-secondary/10 text-secondary', to: '/budget' },
    { key: 'sav', label: "Jamg'arma", icon: PiggyBank, tile: 'bg-success/10 text-success', to: '/savings' },
  ].slice(0, 4);

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((a) => {
        const inner = (
          <>
            <span className={clsx('grid h-[52px] w-full place-items-center rounded-2xl', a.tile)}>
              <a.icon className="h-[22px] w-[22px]" />
            </span>
            <span className="text-[11px] font-medium text-base-content/70">{a.label}</span>
          </>
        );
        return a.to ? (
          <Link key={a.key} to={a.to} className="tap-sm flex flex-col items-center gap-1.5">
            {inner}
          </Link>
        ) : (
          <button key={a.key} type="button" onClick={a.onClick} className="tap-sm flex flex-col items-center gap-1.5">
            {inner}
          </button>
        );
      })}
    </div>
  );
}

const HIDE_BALANCE_KEY = 'ff-hide-balance';

export function DashboardPage() {
  const [stats, setStats] = useState<FamilyDashboardStats | null>(null);
  const [charts, setCharts] = useState<FamilyChartData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>('6m');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem(HIDE_BALANCE_KEY) === '1'
  );
  const { notifications } = useNotificationsStore();
  const { hasPermission } = usePermission();
  const canCreateTransaction = hasPermission(PermissionCode.TRANSACTIONS_CREATE);

  const toggleHideBalance = useCallback(() => {
    setHideBalance((prev) => {
      const next = !prev;
      localStorage.setItem(HIDE_BALANCE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) {
        setRefreshing(true);
      }
      const [statsRes, chartsRes, recentRes] = await Promise.all([
        familyDashboardApi.getStats(),
        familyDashboardApi.getCharts(),
        familyDashboardApi.getRecentTransactions(),
      ]);
      const statsData: FamilyDashboardStats = statsRes.data.data;
      const chartsData: FamilyChartData = chartsRes.data.data;
      const recentData: Transaction[] = recentRes.data.data;
      setStats(statsData);
      setCharts(chartsData);
      setRecentTransactions(recentData);
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    if (notifications.length > 0) {
      void loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  // Phase 3: aktiv scope o'zgarganda dashboard ma'lumotlarini qayta yuklash
  // (F5 bosish kerak emas — switching avtomatik refresh qiladi)
  useScopeChangeEffect(() => {
    void loadData();
  });

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

  // Insightlar — ma'lumotdan avtomatik xulosa
  const insights = useMemo(
    () =>
      generateInsights({
        stats,
        monthlyTrend: charts?.monthlyTrend || [],
        expenseTrend,
        incomeTrend,
      }),
    [stats, charts?.monthlyTrend, expenseTrend, incomeTrend]
  );

  // Kategoriya bo'yicha filterlangan tranzaksiyalar
  const filteredTransactions = useMemo(() => {
    if (!categoryFilter) return recentTransactions;
    return recentTransactions.filter((tx) => tx.categoryName === categoryFilter);
  }, [recentTransactions, categoryFilter]);

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48" />
            <div className="skeleton mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-3 h-8 w-32" />
              <div className="skeleton mt-3 h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-3 h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="surface-card p-5 lg:col-span-2">
            <div className="skeleton h-72 w-full" />
          </div>
          <div className="surface-card p-5">
            <div className="skeleton h-72 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="surface-card p-5">
            <div className="skeleton h-48 w-full" />
          </div>
          <div className="surface-card p-5">
            <div className="skeleton h-48 w-full" />
          </div>
        </div>
      </div>
    );
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
    <div className="space-y-6 relative">
      {refreshing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-base-100/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="text-sm font-medium text-base-content/70">Yangilanmoqda...</span>
          </div>
        </div>
      )}

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
      <div className="hidden flex-col gap-4 lg:flex lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Bosh sahifa</h1>
          <p className="mt-1 text-base-content/60">
            Oilaviy moliya boshqaruvi
            {currentMonthLabel && <> · {currentMonthLabel}</>}
          </p>
        </div>
      </div>

      {/* Insights — AI tipida avtomatik xulosalar (max 2 ta birinchi navbatda) */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {insights.slice(0, 2).map((insight, i) => (
            <InsightCard
              key={insight.id}
              tone={insight.tone}
              title={insight.title}
              message={insight.message}
              style={{ '--i': i } as CSSProperties}
            />
          ))}
        </div>
      )}

      {/* KPI Cards (desktop) — endi trend indicator bilan. Mobilda hero karta o'rnini bosadi. */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        <KPICard
          title="Umumiy balans"
          value={formatCurrency(stats?.totalBalance || 0)}
          icon={Wallet}
          color="primary"
          subtitle="barcha hisoblar"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="surface-soft rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2">
              <HandMetal className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Berilgan qarzlar</p>
              <p className="font-bold">{formatCurrency(stats?.totalDebtsGiven || 0)}</p>
            </div>
          </div>
        </div>
        <div className="surface-soft rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-error/10 p-2">
              <HandMetal className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Olingan qarzlar</p>
              <p className="font-bold text-error">{formatCurrency(stats?.totalDebtsTaken || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Income vs Expense Trend - Takes 2 columns + range toggle */}
        <ChartCard
          title="Daromad vs Xarajat"
          icon={TrendingUp}
          className="lg:col-span-2"
          action={<RangeToggle value={chartRange} onChange={setChartRange} />}
        >
          <div className="h-72">
            {formattedMonthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedMonthlyTrend}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.error} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.error} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCompactCurrency(value)}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.2, strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Daromad"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Xarajat"
                    stroke={COLORS.error}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-base-content/50">
                Ma'lumot yetarli emas
              </div>
            )}
          </div>
        </ChartCard>

        {/* Expense by Category - Pie Chart with click filter */}
        <ChartCard
          title="Xarajat kategoriyalari"
          icon={Target}
          action={
            categoryFilter && (
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className="inline-flex items-center gap-1 rounded-full bg-base-200 px-2.5 py-1 text-xs text-base-content/70 hover:bg-base-300"
              >
                <X className="h-3 w-3" />
                {categoryFilter}
              </button>
            )
          }
        >
          <div className="h-72">
            {charts?.expenseByCategory && charts.expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={charts.expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                    label={({ name, percentage }) =>
                      percentage > 5 ? `${name} ${percentage.toFixed(0)}%` : ''
                    }
                    labelLine={false}
                    onClick={(entry: CategoryChartItem) =>
                      setCategoryFilter((cur) => (cur === entry.name ? null : entry.name))
                    }
                    cursor="pointer"
                  >
                    {charts.expenseByCategory.map((entry, index) => {
                      const isActive = !categoryFilter || categoryFilter === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS.chart[index % COLORS.chart.length]}
                          fillOpacity={isActive ? 1 : 0.3}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-base-content/50">
                Ma'lumot mavjud emas
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Budget & Savings Progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Budget Progress */}
        <ChartCard title="Byudjet bajarilishi" icon={Target}>
          {stats?.budgetProgress && stats.budgetProgress.length > 0 ? (
            <div className="space-y-4">
              {stats.budgetProgress.map((item: BudgetProgressItem, index: number) => {
                const percentage = Math.min(item.percentage, 100);
                const isOver = item.percentage > 100;
                return (
                  <div key={index}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{item.categoryName}</span>
                      <span className={clsx('text-xs', isOver ? 'text-error font-semibold' : 'text-base-content/60')}>
                        {formatCompactCurrency(item.spentAmount)} / {formatCompactCurrency(item.budgetAmount)}
                        <span className="ml-1">({item.percentage.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-200">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          isOver ? 'bg-error' : item.percentage > 80 ? 'bg-warning' : 'bg-success'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-base-content/50">
              Byudjet belgilanmagan
            </div>
          )}
        </ChartCard>

        {/* Savings Progress */}
        <ChartCard title="Jamg'arma maqsadlari" icon={PiggyBank}>
          {stats?.savingsProgress && stats.savingsProgress.length > 0 ? (
            <div className="space-y-4">
              {stats.savingsProgress.map((item, index) => {
                const percentage = Math.min(item.percentage, 100);
                const isComplete = item.percentage >= 100;
                return (
                  <div key={index}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{item.goalName}</span>
                      <span className={clsx('text-xs', isComplete ? 'text-success font-semibold' : 'text-base-content/60')}>
                        {formatCompactCurrency(item.currentAmount)} / {formatCompactCurrency(item.targetAmount)}
                        <span className="ml-1">({item.percentage.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-200">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          isComplete ? 'bg-success' : item.percentage > 60 ? 'bg-info' : 'bg-primary'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-base-content/50">
              Jamg'arma maqsadlari yo'q
            </div>
          )}
        </ChartCard>
      </div>

      {/* Qo'shimcha insightlar (agar ikkitadan ko'p bo'lsa, qolganlarini ko'rsatish) */}
      {insights.length > 2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {insights.slice(2).map((insight) => (
            <InsightCard
              key={insight.id}
              tone={insight.tone}
              title={insight.title}
              message={insight.message}
              compact
            />
          ))}
        </div>
      )}

      {/* Recent Transactions */}
      <ChartCard
        title="Oxirgi tranzaksiyalar"
        icon={ArrowLeftRight}
        action={
          categoryFilter && (
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className="inline-flex items-center gap-1 rounded-full bg-base-200 px-2.5 py-1 text-xs text-base-content/70 hover:bg-base-300"
            >
              <X className="h-3 w-3" />
              filter: {categoryFilter}
            </button>
          )
        }
      >
        {filteredTransactions.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Turi</th>
                    <th>Kategoriya</th>
                    <th>Izoh</th>
                    <th className="text-right">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, 5).map((tx) => {
                    const config = transactionTypeConfig[tx.type] || { label: tx.type, color: '', sign: '' };
                    return (
                      <tr key={tx.id} className="hover">
                        <td className="whitespace-nowrap text-sm text-base-content/70">
                          {new Date(tx.transactionDate).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          <span
                            className={clsx(
                              'badge badge-sm',
                              tx.type === 'INCOME' && 'badge-success badge-outline',
                              tx.type === 'EXPENSE' && 'badge-error badge-outline',
                              tx.type === 'TRANSFER' && 'badge-info badge-outline'
                            )}
                          >
                            {config.label}
                          </span>
                        </td>
                        <td className="text-sm">{tx.categoryName || '—'}</td>
                        <td className="max-w-[200px] truncate text-sm text-base-content/60">
                          {tx.description || '—'}
                        </td>
                        <td className={clsx('text-right font-semibold whitespace-nowrap', config.color)}>
                          {config.sign}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="space-y-2 lg:hidden">
              {filteredTransactions.slice(0, 5).map((tx) => {
                const config = transactionTypeConfig[tx.type] || { label: tx.type, color: '', sign: '' };
                return (
                  <div key={tx.id} className="rounded-xl border border-base-200 p-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={clsx(
                          'badge badge-sm',
                          tx.type === 'INCOME' && 'badge-success badge-outline',
                          tx.type === 'EXPENSE' && 'badge-error badge-outline',
                          tx.type === 'TRANSFER' && 'badge-info badge-outline'
                        )}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {new Date(tx.transactionDate).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium">{tx.categoryName || '—'}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="max-w-[60%] truncate text-xs text-base-content/50">
                        {tx.description || '—'}
                      </span>
                      <span className={clsx('font-semibold', config.color)}>
                        {config.sign}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex h-32 items-center justify-center text-base-content/50">
            {categoryFilter
              ? `"${categoryFilter}" kategoriyasi bo'yicha tranzaksiya yo'q`
              : 'Tranzaksiyalar mavjud emas'}
          </div>
        )}
      </ChartCard>

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
