import type { CSSProperties } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Receipt,
  CreditCard,
  Phone,
  Calendar,
  MapPin,
  RefreshCw,
  Banknote,
  PiggyBank,
  Smartphone,
  Landmark,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
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
} from 'recharts';

import { familyMembersApi } from '../../api/family-members.api';
import { transactionsApi } from '../../api/transactions.api';
import { DataTable, type Column } from '../../components/ui/DataTable';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  FAMILY_ROLES,
  GENDERS,
  TRANSACTION_TYPES,
  ACCOUNT_TYPES,
  ACCOUNT_STATUSES,
} from '../../config/constants';
import type {
  MemberFinancialSummary,
  MemberAccountSummary,
  MemberRecentTransaction,
  Transaction,
  ApiResponse,
  PagedResponse,
} from '../../types';

// ========== Constants ==========

type TabKey = 'overview' | 'transactions' | 'accounts' | 'statistics';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Umumiy', icon: User },
  { key: 'transactions', label: 'Tranzaksiyalar', icon: Receipt },
  { key: 'accounts', label: 'Hisoblar', icon: CreditCard },
  { key: 'statistics', label: 'Statistika', icon: BarChart3 },
];

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const MONTH_NAMES: Record<string, string> = {
  JANUARY: 'Yanvar', FEBRUARY: 'Fevral', MARCH: 'Mart', APRIL: 'Aprel',
  MAY: 'May', JUNE: 'Iyun', JULY: 'Iyul', AUGUST: 'Avgust',
  SEPTEMBER: 'Sentabr', OCTOBER: 'Oktabr', NOVEMBER: 'Noyabr', DECEMBER: 'Dekabr',
};

const ACCOUNT_ICON_MAP: Record<string, React.ElementType> = {
  CASH: Banknote, BANK_CARD: CreditCard, SAVINGS: PiggyBank,
  E_WALLET: Smartphone, TERM_DEPOSIT: Landmark, CREDIT: Receipt,
};

// ========== Helpers ==========

function getGenderGradient(gender?: string) {
  if (gender === 'MALE') return 'from-blue-400 to-blue-600';
  if (gender === 'FEMALE') return 'from-pink-400 to-pink-600';
  return 'from-amber-400 to-amber-600';
}

function getAge(birthDate?: string) {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

const roleLabel = (role: string): string =>
  (FAMILY_ROLES as Record<string, { label: string }>)[role]?.label || role;

const genderLabel = (gender: string): string =>
  (GENDERS as Record<string, { label: string }>)[gender]?.label || gender;

// ========== Main Component ==========

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const memberId = Number(id);

  const [data, setData] = useState<MemberFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Transactions tab state
  const [txData, setTxData] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(0);
  const [txTotalElements, setTxTotalElements] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(0);
  const [txTypeFilter, setTxTypeFilter] = useState<string>('');

  // ===== Data Fetching =====

  const loadSummary = useCallback(async () => {
    try {
      const res = await familyMembersApi.getFinancialSummary(memberId);
      setData((res.data as ApiResponse<MemberFinancialSummary>).data);
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const filters: Record<string, unknown> = { memberId };
      if (txTypeFilter) filters.type = txTypeFilter;
      const res = await transactionsApi.getAll(txPage, 15, filters);
      const pageData = (res.data as ApiResponse<PagedResponse<Transaction>>).data;
      setTxData(pageData.content);
      setTxTotalElements(pageData.totalElements);
      setTxTotalPages(pageData.totalPages);
    } catch {
      toast.error("Tranzaksiyalarni yuklashda xatolik");
    } finally {
      setTxLoading(false);
    }
  }, [memberId, txPage, txTypeFilter]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  // ===== Loading State =====

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-base-300" />
          <div className="h-7 w-48 rounded-lg bg-base-300" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-base-300" />)}
        </div>
        <div className="h-64 rounded-xl bg-base-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium text-base-content/60">A'zo topilmadi</p>
        <button className="btn btn-ghost mt-4" onClick={() => navigate('/my-family')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Orqaga qaytish
        </button>
      </div>
    );
  }

  const { profile } = data;
  const age = getAge(profile.birthDate);

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm btn-square" onClick={() => navigate('/my-family')}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getGenderGradient(profile.gender)} text-white font-bold text-lg`}
          >
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.fullName} className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              profile.fullName?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold lg:text-2xl">{profile.fullName}</h1>
              {profile.role && (
                <span className="badge badge-outline badge-sm">{roleLabel(profile.role)}</span>
              )}
              {profile.gender && (
                <span className="badge badge-ghost badge-sm">{genderLabel(profile.gender)}</span>
              )}
            </div>
            <p className="text-xs text-base-content/50">
              {age !== null && `${age} yosh`}
              {age !== null && profile.phone && ' \u00B7 '}
              {profile.phone}
            </p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-square" onClick={loadSummary}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ===== Tabs ===== */}
      <div role="tablist" className="tabs tabs-bordered">
        {TABS.map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            role="tab"
            className={clsx('tab gap-2', activeTab === key && 'tab-active font-semibold')}
            onClick={() => setActiveTab(key)}
          >
            <TabIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ===== Tab Content ===== */}
      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'transactions' && (
        <TransactionsTab
          data={txData}
          loading={txLoading}
          page={txPage}
          totalElements={txTotalElements}
          totalPages={txTotalPages}
          typeFilter={txTypeFilter}
          onPageChange={setTxPage}
          onTypeFilterChange={(val) => { setTxTypeFilter(val); setTxPage(0); }}
        />
      )}
      {activeTab === 'accounts' && <AccountsTab accounts={data.accounts} />}
      {activeTab === 'statistics' && <StatisticsTab data={data} />}
    </div>
  );
}

// ========== Tab 1: Umumiy (Overview) ==========

function OverviewTab({ data }: { data: MemberFinancialSummary }) {
  const { profile } = data;
  const age = getAge(profile.birthDate);

  return (
    <div className="space-y-6">
      {/* Profile + KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="surface-card p-5 lg:col-span-1">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getGenderGradient(profile.gender)} text-white text-2xl font-bold shadow-lg`}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.fullName} className="h-16 w-16 rounded-2xl object-cover" />
              ) : (
                profile.fullName?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold">{profile.firstName}</h3>
              {profile.lastName && <p className="text-sm text-base-content/60">{profile.lastName}</p>}
              {profile.middleName && <p className="text-xs italic text-base-content/40">{profile.middleName}</p>}
            </div>
          </div>
          <div className="space-y-3">
            {profile.birthDate && (
              <InfoRow icon={Calendar} label="Tug'ilgan sana" value={`${formatDate(profile.birthDate)}${age !== null ? ` (${age} yosh)` : ''}`} />
            )}
            {profile.birthPlace && (
              <InfoRow icon={MapPin} label="Tug'ilgan joy" value={profile.birthPlace} />
            )}
            {profile.phone && (
              <InfoRow icon={Phone} label="Telefon" value={profile.phone} />
            )}
            {profile.userName && (
              <InfoRow icon={User} label="Username" value={`@${profile.userName}`} />
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Oylik daromad"
            value={formatCurrency(data.monthlyIncome)}
            icon={TrendingUp}
            color="success"
            style={{ '--i': 0 } as CSSProperties}
          />
          <StatCard
            title="Oylik xarajat"
            value={formatCurrency(data.monthlyExpense)}
            icon={TrendingDown}
            color="error"
            style={{ '--i': 1 } as CSSProperties}
          />
          <StatCard
            title="Sof balans"
            value={formatCurrency(data.netBalance)}
            icon={BarChart3}
            color={data.netBalance >= 0 ? 'primary' : 'warning'}
            style={{ '--i': 2 } as CSSProperties}
          />
          <StatCard
            title="Jami hisob balansi"
            value={formatCurrency(data.totalAccountBalance)}
            icon={Wallet}
            color="info"
            style={{ '--i': 3 } as CSSProperties}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      {data.recentTransactions.length > 0 && (
        <div className="surface-card overflow-hidden">
          <div className="border-b border-base-200 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Receipt className="h-5 w-5 text-primary" />
              Oxirgi tranzaksiyalar
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-base-200/50">
                <tr>
                  <th>Tur</th>
                  <th className="text-right">Summa</th>
                  <th>Kategoriya</th>
                  <th>Tavsif</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((tx) => (
                  <RecentTxRow key={tx.id} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RecentTxRow({ tx }: { tx: MemberRecentTransaction }) {
  const typeInfo = (TRANSACTION_TYPES as Record<string, { label: string; color: string }>)[tx.type];
  return (
    <tr className="hover">
      <td>
        <span className={`text-xs font-medium ${typeInfo?.color || ''}`}>
          {typeInfo?.label || tx.type}
        </span>
      </td>
      <td className="text-right">
        <span className={clsx('font-semibold tabular-nums',
          tx.type === 'INCOME' ? 'text-success' : tx.type === 'EXPENSE' ? 'text-error' : ''
        )}>
          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}{formatCurrency(tx.amount)}
        </span>
      </td>
      <td className="text-sm text-base-content/60">{tx.categoryName || '\u2014'}</td>
      <td className="text-sm truncate max-w-[200px]">{tx.description || '\u2014'}</td>
      <td className="text-xs text-base-content/50">{tx.transactionDate || '\u2014'}</td>
    </tr>
  );
}

// ========== Tab 2: Tranzaksiyalar ==========

function TransactionsTab({
  data, loading, page, totalElements, totalPages, typeFilter,
  onPageChange, onTypeFilterChange,
}: {
  data: Transaction[];
  loading: boolean;
  page: number;
  totalElements: number;
  totalPages: number;
  typeFilter: string;
  onPageChange: (p: number) => void;
  onTypeFilterChange: (v: string) => void;
}) {
  const txColumns: Column<Transaction>[] = [
    {
      key: 'id', header: '#', className: 'w-16',
      render: (t) => <span className="text-xs text-base-content/60">#{t.id}</span>,
    },
    {
      key: 'type', header: 'Tur', className: 'w-24',
      render: (t) => {
        const info = (TRANSACTION_TYPES as Record<string, { label: string; color: string }>)[t.type];
        return <span className={`text-xs font-medium ${info?.color || ''}`}>{info?.label || t.type}</span>;
      },
    },
    {
      key: 'amount', header: 'Summa', className: 'text-right',
      render: (t) => (
        <span className={clsx('font-semibold tabular-nums',
          t.type === 'INCOME' ? 'text-success' : t.type === 'EXPENSE' ? 'text-error' : ''
        )}>
          {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}{formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: 'categoryName', header: 'Kategoriya',
      render: (t) => <span className="text-sm">{t.categoryName || '\u2014'}</span>,
    },
    {
      key: 'description', header: 'Tavsif',
      render: (t) => <span className="text-sm truncate max-w-[200px] block">{t.description || '\u2014'}</span>,
    },
    {
      key: 'status', header: 'Holat', className: 'w-28',
      render: (t) => {
        const s = t.status || 'CONFIRMED';
        const badge = s === 'CONFIRMED' ? 'badge-success' : s === 'PENDING' ? 'badge-warning' : 'badge-error';
        const label = s === 'CONFIRMED' ? 'Tasdiqlangan' : s === 'PENDING' ? 'Kutilmoqda' : 'Bekor';
        return <span className={`badge ${badge} badge-sm`}>{label}</span>;
      },
    },
    {
      key: 'transactionDate', header: 'Sana', className: 'w-36',
      render: (t) => <span className="text-xs text-base-content/60">{formatDateTime(t.transactionDate)}</span>,
    },
  ];

  const renderMobileCard = (t: Transaction) => {
    const info = (TRANSACTION_TYPES as Record<string, { label: string; color: string }>)[t.type];
    return (
      <div className="surface-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${info?.color || ''}`}>{info?.label || t.type}</span>
          <span className={clsx('font-semibold text-sm',
            t.type === 'INCOME' ? 'text-success' : t.type === 'EXPENSE' ? 'text-error' : ''
          )}>
            {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : ''}{formatCurrency(t.amount)}
          </span>
        </div>
        <p className="text-xs text-base-content/60 truncate">{t.categoryName || t.description || '\u2014'}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-content/40">{formatDateTime(t.transactionDate)}</span>
          <span className={`badge badge-sm ${(t.status || 'CONFIRMED') === 'CONFIRMED' ? 'badge-success' : 'badge-warning'}`}>
            {(t.status || 'CONFIRMED') === 'CONFIRMED' ? 'Tasdiqlangan' : 'Kutilmoqda'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          className="select select-bordered select-sm w-40"
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
        >
          <option value="">Barcha turlar</option>
          <option value="INCOME">Daromad</option>
          <option value="EXPENSE">Xarajat</option>
          <option value="TRANSFER">O'tkazma</option>
        </select>
        <span className="text-sm text-base-content/50">Jami: {totalElements}</span>
      </div>

      <div className="surface-card p-5">
        <DataTable<Transaction>
          data={data}
          columns={txColumns}
          keyExtractor={(t) => t.id}
          loading={loading}
          totalElements={totalElements}
          totalPages={totalPages}
          currentPage={page}
          pageSize={15}
          onPageChange={onPageChange}
          renderMobileCard={renderMobileCard}
          emptyTitle="Tranzaksiya topilmadi"
          emptyDescription="Bu a'zoda hali tranzaksiyalar mavjud emas"
        />
      </div>
    </div>
  );
}

// ========== Tab 3: Hisoblar ==========

function AccountsTab({ accounts }: { accounts: MemberAccountSummary[] }) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-base-content/60">
        <Wallet className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">Hisob mavjud emas</p>
        <p className="text-sm mt-1">Bu a'zoda hali hisob ochilmagan</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((acc) => {
        const Icon = ACCOUNT_ICON_MAP[acc.type] || Wallet;
        const statusInfo = (ACCOUNT_STATUSES as Record<string, { label: string; badge: string }>)[acc.status];
        const typeInfo = (ACCOUNT_TYPES as Record<string, { label: string }>)[acc.type];

        return (
          <div key={acc.id} className="surface-card p-5 transition hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{acc.name}</h4>
                  <p className="text-xs text-base-content/50">
                    {typeInfo?.label || acc.type}
                    {acc.accCode && ` \u00B7 ${acc.accCode}`}
                  </p>
                </div>
              </div>
              {statusInfo && (
                <span className={`badge ${statusInfo.badge} badge-sm`}>{statusInfo.label}</span>
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(acc.balance)}</p>
              <span className="text-sm text-base-content/50">{acc.currency || 'UZS'}</span>
            </div>
            <div className="mt-2">
              <span className={`badge badge-xs ${acc.scope === 'FAMILY' ? 'badge-info' : 'badge-ghost'}`}>
                {acc.scope === 'FAMILY' ? 'Oilaviy' : 'Shaxsiy'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========== Tab 4: Statistika ==========

function StatisticsTab({ data }: { data: MemberFinancialSummary }) {
  const trendData = data.monthlyTrend.map((m) => ({
    name: MONTH_NAMES[m.month] || m.month,
    Daromad: m.income,
    Xarajat: m.expense,
  }));

  const hasExpenseData = data.expenseByCategory.length > 0;
  const hasIncomeData = data.incomeByCategory.length > 0;

  return (
    <div className="space-y-6">
      {/* Monthly Trend */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-4">
          6 oylik trend
        </h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis tickFormatter={(v) => formatCompactCurrency(v)} className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--b3))' }}
              />
              <Area type="monotone" dataKey="Daromad" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="Xarajat" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center py-12 text-base-content/40">
            Ma'lumot mavjud emas
          </div>
        )}
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense by Category */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-4">
            Xarajat kategoriya bo'yicha
          </h3>
          {hasExpenseData ? (
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPie>
                <Pie
                  data={data.expenseByCategory.map((c) => ({ name: c.categoryName, value: c.amount }))}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-12 text-base-content/40">
              Xarajat mavjud emas
            </div>
          )}
        </div>

        {/* Income by Category */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/50 mb-4">
            Daromad kategoriya bo'yicha
          </h3>
          {hasIncomeData ? (
            <ResponsiveContainer width="100%" height={280}>
              <RechartsPie>
                <Pie
                  data={data.incomeByCategory.map((c) => ({ name: c.categoryName, value: c.amount }))}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.incomeByCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-12 text-base-content/40">
              Daromad mavjud emas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Shared Components ==========

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="h-8 w-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-base-content/50" />
      </div>
      <div>
        <span className="text-base-content/50 text-xs">{label}</span>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  title, value, icon: Icon, color = 'primary', style,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
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
      className="surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={style}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
          </div>
          <div className={clsx('grid h-12 w-12 place-items-center rounded-2xl border', colorMap[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
