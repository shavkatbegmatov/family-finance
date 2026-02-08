import type { CSSProperties } from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  HandMetal,
  ArrowLeftRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
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
import { formatCurrency, MONTHS_UZ } from '../../config/constants';
import type { FamilyDashboardStats, FamilyChartData, Transaction } from '../../types';
import { useNotificationsStore } from '../../store/notificationsStore';

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

// Valyuta formatlash (qisqa)
const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
};

// KPI karta komponenti
function KPICard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  className,
  style,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
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
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
          </div>
          <div
            className={clsx(
              'grid h-12 w-12 place-items-center rounded-2xl border',
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
      <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">
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

export function DashboardPage() {
  const [stats, setStats] = useState<FamilyDashboardStats | null>(null);
  const [charts, setCharts] = useState<FamilyChartData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { notifications } = useNotificationsStore();

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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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

  // Oylik trend uchun oxirgi 6 oyni formatlash
  const formattedMonthlyTrend = (charts?.monthlyTrend || []).slice(-6).map((item) => {
    const [, monthStr] = item.month.split('-');
    const monthIndex = parseInt(monthStr, 10) - 1;
    return {
      ...item,
      monthLabel: MONTHS_UZ[monthIndex] || item.month,
    };
  });

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

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Bosh sahifa</h1>
          <p className="mt-1 text-base-content/60">
            Oilaviy moliya boshqaruvi
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Umumiy balans"
          value={formatCurrency(stats?.totalBalance || 0)}
          icon={Wallet}
          color="primary"
          style={{ '--i': 0 } as CSSProperties}
        />
        <KPICard
          title="Bu oylik daromad"
          value={formatCurrency(stats?.totalIncome || 0)}
          icon={TrendingUp}
          color="success"
          style={{ '--i': 1 } as CSSProperties}
        />
        <KPICard
          title="Bu oylik xarajat"
          value={formatCurrency(stats?.totalExpense || 0)}
          icon={TrendingDown}
          color="error"
          style={{ '--i': 2 } as CSSProperties}
        />
        <KPICard
          title="Jamg'armalar"
          value={formatCurrency(stats?.totalSavings || 0)}
          icon={PiggyBank}
          color="info"
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
        {/* Income vs Expense Trend - Takes 2 columns */}
        <ChartCard
          title="Daromad vs Xarajat"
          icon={TrendingUp}
          className="lg:col-span-2"
          action={
            <span className="text-xs text-base-content/50">
              Oxirgi 6 oy
            </span>
          }
        >
          <div className="h-72">
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
                <Tooltip content={<CustomTooltip />} />
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
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Expense by Category - Pie Chart */}
        <ChartCard title="Xarajat kategoriyalari" icon={Target}>
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
                  >
                    {charts.expenseByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || COLORS.chart[index % COLORS.chart.length]}
                      />
                    ))}
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
              {stats.budgetProgress.map((item, index) => {
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

      {/* Recent Transactions */}
      <ChartCard title="Oxirgi tranzaksiyalar" icon={ArrowLeftRight}>
        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
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
                {recentTransactions.slice(0, 5).map((tx) => {
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
        ) : (
          <div className="flex h-32 items-center justify-center text-base-content/50">
            Tranzaksiyalar mavjud emas
          </div>
        )}
      </ChartCard>

      {/* Quick Links */}
      <div className="surface-card p-5">
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
