import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, CreditCard, PiggyBank, Smartphone, Landmark, Receipt,
  Plus, RefreshCw, Eye, Edit2, Search, Banknote,
  LayoutGrid, LayoutList, TrendingUp, TrendingDown, ArrowRightLeft,
  Filter, X,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { accountsApi } from '../../api/accounts.api';
import type {
  Account, AccountType, AccountStatus, AccountFilters,
  ApiResponse, PagedResponse,
} from '../../types';
import {
  formatCurrency, ACCOUNT_TYPES, ACCOUNT_STATUSES,
} from '../../config/constants';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Select } from '../../components/ui/Select';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { AccountFormModal } from './AccountFormModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCOUNT_ICON_MAP: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  CASH: Banknote,
  BANK_CARD: CreditCard,
  SAVINGS: PiggyBank,
  E_WALLET: Smartphone,
  TERM_DEPOSIT: Landmark,
  CREDIT: Receipt,
};

function getAccountIcon(type: AccountType) {
  return ACCOUNT_ICON_MAP[type] ?? Wallet;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  ACTIVE: { label: 'Faol', badge: 'badge-success', dot: 'bg-success' },
  FROZEN: { label: 'Muzlatilgan', badge: 'badge-warning', dot: 'bg-warning' },
  CLOSED: { label: 'Yopilgan', badge: 'badge-error', dot: 'bg-error' },
};

function getStatusBadge(status?: AccountStatus) {
  const s = status || 'ACTIVE';
  const info = STATUS_CONFIG[s];
  if (!info) return <span className="badge badge-ghost badge-sm">{s}</span>;
  return <span className={`badge ${info.badge} badge-sm`}>{info.label}</span>;
}

const ACCESS_ROLE_MAP: Record<string, { label: string; badge: string }> = {
  OWNER: { label: 'Egasi', badge: 'badge-primary' },
  CO_OWNER: { label: 'Hamkor', badge: 'badge-secondary' },
  VIEWER: { label: 'Kuzatuvchi', badge: 'badge-ghost' },
  FAMILY_MEMBER: { label: 'Oilaviy', badge: 'badge-info' },
};

function getAccessRoleBadge(role?: string) {
  if (!role) return <span className="text-xs text-base-content/30">&mdash;</span>;
  const info = ACCESS_ROLE_MAP[role];
  if (!info) return <span className="badge badge-ghost badge-sm">{role}</span>;
  return <span className={`badge ${info.badge} badge-sm`}>{info.label}</span>;
}

// Valyuta formatlash (qisqa)
const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
};

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KPICard({
  title, value, icon: Icon, color = 'primary', style,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'error' | 'info' | 'warning';
  style?: CSSProperties;
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
  };

  return (
    <div
      className="surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={style}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight truncate">{value}</p>
          </div>
          <div className={clsx('grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border', colorMap[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account Grid Card
// ---------------------------------------------------------------------------

function AccountGridCard({
  account, onView, onEdit, canEdit,
}: {
  account: Account;
  onView: () => void;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const Icon = getAccountIcon(account.type);
  const color = account.color || '#6366f1';
  const statusInfo = STATUS_CONFIG[account.status || 'ACTIVE'];

  return (
    <div
      className="surface-card group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      onClick={onView}
    >
      {/* Color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[inherit]" style={{ backgroundColor: color }} />

      <div className="p-5 pt-6">
        {/* Header: Icon + Status */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundColor: `${color}12`, borderColor: `${color}25` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
          <div className="flex items-center gap-2">
            {statusInfo && (
              <div className="flex items-center gap-1.5 text-xs">
                <div className={clsx('h-2 w-2 rounded-full', statusInfo.dot)} />
                <span className="text-base-content/60">{statusInfo.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Name + Type */}
        <div className="mb-4">
          <h3 className="font-semibold text-base truncate">{account.name}</h3>
          <p className="text-xs text-base-content/50 mt-0.5">
            {ACCOUNT_TYPES[account.type]?.label ?? account.type}
            {account.accCodeFormatted && (
              <span className="ml-1.5 font-mono">&middot; {account.accCodeFormatted}</span>
            )}
          </p>
        </div>

        {/* Balance */}
        <div className="surface-soft rounded-xl p-3 mb-3">
          <p className="text-xs text-base-content/50 mb-1">Joriy saldo</p>
          <p className={clsx(
            'text-xl font-bold tracking-tight tabular-nums',
            account.balance >= 0 ? 'text-base-content' : 'text-error'
          )}>
            {formatCurrency(account.balance)}
          </p>
          {account.currency && account.currency !== 'UZS' && (
            <p className="text-xs text-base-content/40 mt-0.5">{account.currency}</p>
          )}
        </div>

        {/* Footer: Role + Actions */}
        <div className="flex items-center justify-between">
          {getAccessRoleBadge(account.myAccessRole)}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="btn btn-ghost btn-xs btn-square"
              onClick={(e) => { e.stopPropagation(); onView(); }}
              title="Batafsil"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            {canEdit && (
              <button
                className="btn btn-ghost btn-xs btn-square"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                title="Tahrirlash"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loading
// ---------------------------------------------------------------------------

function AccountsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-8 w-48" />
          <div className="skeleton mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-9" />
          <div className="skeleton h-9 w-32" />
        </div>
      </div>

      {/* KPI skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="skeleton h-4 w-24" />
                <div className="skeleton mt-3 h-8 w-32" />
              </div>
              <div className="skeleton h-12 w-12 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3">
        <div className="skeleton h-12 flex-1" />
        <div className="skeleton h-12 w-44" />
        <div className="skeleton h-12 w-40" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="surface-card p-5 pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="skeleton h-12 w-12 rounded-2xl" />
              <div className="skeleton h-5 w-16" />
            </div>
            <div className="skeleton h-5 w-3/4 mb-1" />
            <div className="skeleton h-3 w-1/2 mb-4" />
            <div className="skeleton h-20 w-full rounded-xl mb-3" />
            <div className="skeleton h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type TabType = 'all' | 'my';
type ViewMode = 'grid' | 'table';

export function AccountsPage() {
  const navigate = useNavigate();

  // Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // KPI
  const [totalBalance, setTotalBalance] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(true);

  // Tabs, View & Filters
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AccountType | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<AccountStatus | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Highlight
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const hasActiveFilters = !!filterType || !!filterStatus || !!search;

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchTotalBalance = useCallback(async () => {
    try {
      setKpiLoading(true);
      const res = await accountsApi.getTotalBalance();
      const data = res.data?.data ?? res.data;
      setTotalBalance(typeof data === 'number' ? data : data?.totalBalance ?? 0);
    } catch {
      // silently fail
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'my') {
        const res = await accountsApi.getMy(page, pageSize);
        const data = res.data as ApiResponse<PagedResponse<Account>>;
        setAccounts(data.data.content);
        setTotalElements(data.data.totalElements);
        setTotalPages(data.data.totalPages);
      } else {
        const filters: AccountFilters = { page, size: pageSize };
        if (search) filters.search = search;
        if (filterType) filters.accountType = filterType;
        if (filterStatus) filters.status = filterStatus;

        const res = await accountsApi.getAll(filters);
        const data = res.data as ApiResponse<PagedResponse<Account>>;
        setAccounts(data.data.content);
        setTotalElements(data.data.totalElements);
        setTotalPages(data.data.totalPages);
      }
    } catch {
      toast.error('Hisoblarni yuklashda xatolik');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [activeTab, page, pageSize, search, filterType, filterStatus]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchTotalBalance();
  }, [fetchTotalBalance]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [search, filterType, filterStatus, activeTab]);

  // -----------------------------------------------------------------------
  // Computed KPI values
  // -----------------------------------------------------------------------

  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE' || !a.status);
  const frozenAccounts = accounts.filter((a) => a.status === 'FROZEN');
  const incomeAccounts = accounts.filter((a) => a.balance > 0);
  const expenseAccounts = accounts.filter((a) => a.balance < 0);
  const positiveSum = incomeAccounts.reduce((sum, a) => sum + a.balance, 0);
  const negativeSum = Math.abs(expenseAccounts.reduce((sum, a) => sum + a.balance, 0));

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleRefresh = () => {
    fetchAccounts();
    fetchTotalBalance();
  };

  const openCreate = () => {
    setEditingAccount(null);
    setShowModal(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    fetchAccounts();
    fetchTotalBalance();
  };

  const clearFilters = () => {
    setFilterType(undefined);
    setFilterStatus(undefined);
    setSearchInput('');
    setSearch('');
  };

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // -----------------------------------------------------------------------
  // Table columns
  // -----------------------------------------------------------------------

  const columns: Column<Account>[] = [
    {
      key: 'name',
      header: 'Hisob',
      sortable: true,
      className: 'w-[220px] max-w-[220px]',
      render: (item) => {
        const Icon = getAccountIcon(item.type);
        const color = item.color || '#6366f1';
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border"
              style={{ backgroundColor: `${color}12`, borderColor: `${color}25` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-xs text-base-content/50">
                {ACCOUNT_TYPES[item.type]?.label ?? item.type}
                {item.currency && item.currency !== 'UZS' ? ` \u00b7 ${item.currency}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'balance',
      header: 'Joriy saldo',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      render: (item) => (
        <span className={clsx(
          'font-semibold tabular-nums',
          item.balance < 0 && 'text-error'
        )}>
          {formatCurrency(item.balance)}
        </span>
      ),
    },
    {
      key: 'accCode',
      header: 'Kod',
      className: 'w-52 min-w-[208px]',
      render: (item) => (
        item.accCodeFormatted || item.accCode ? (
          <span className="badge badge-ghost font-mono text-sm whitespace-nowrap px-2.5 py-2.5">
            {item.accCodeFormatted || item.accCode}
          </span>
        ) : (
          <span className="text-base-content/30">&mdash;</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      className: 'w-28',
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: 'myAccessRole',
      header: 'Ruxsat',
      className: 'w-28',
      render: (item) => getAccessRoleBadge(item.myAccessRole),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      resizable: false,
      render: (item) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            className="btn btn-ghost btn-xs btn-square"
            onClick={(e) => { e.stopPropagation(); navigate(`/accounts/${item.id}`); }}
            title="Batafsil"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <PermissionGate permission={PermissionCode.ACCOUNTS_UPDATE}>
            <button
              className="btn btn-ghost btn-xs btn-square"
              onClick={(e) => { e.stopPropagation(); openEdit(item); }}
              title="Tahrirlash"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  // -----------------------------------------------------------------------
  // Mobile card
  // -----------------------------------------------------------------------

  const renderMobileCard = (item: Account) => {
    const Icon = getAccountIcon(item.type);
    const color = item.color || '#6366f1';

    return (
      <div
        className="surface-card p-4 cursor-pointer relative overflow-hidden"
        onClick={() => navigate(`/accounts/${item.id}`)}
      >
        <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-[inherit]" style={{ backgroundColor: color }} />
        <div className="flex items-start justify-between pl-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border"
              style={{ backgroundColor: `${color}12`, borderColor: `${color}25` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-base-content/50">
                {ACCOUNT_TYPES[item.type]?.label} {item.accCodeFormatted ? `\u00b7 ${item.accCodeFormatted}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {getAccessRoleBadge(item.myAccessRole)}
            {getStatusBadge(item.status)}
          </div>
        </div>
        <div className="mt-3 pl-2 text-right">
          <p className={clsx(
            'text-lg font-bold tabular-nums',
            item.balance < 0 && 'text-error'
          )}>
            {formatCurrency(item.balance)}
          </p>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (initialLoading) {
    return <AccountsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Hisoblar</h1>
          <p className="mt-1 text-base-content/60">
            Barcha moliyaviy hisoblarni boshqarish
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={handleRefresh}
            title="Yangilash"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <PermissionGate permission={PermissionCode.ACCOUNTS_CREATE}>
            <button className="btn btn-primary btn-sm gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Yangi hisob
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Umumiy balans"
          value={kpiLoading ? '...' : formatCompactCurrency(totalBalance) + " so'm"}
          icon={Wallet}
          color="primary"
          style={{ '--i': 0 } as CSSProperties}
        />
        <KPICard
          title="Faol hisoblar"
          value={`${activeAccounts.length} ta`}
          icon={TrendingUp}
          color="success"
          style={{ '--i': 1 } as CSSProperties}
        />
        <KPICard
          title="Ijobiy saldo"
          value={formatCompactCurrency(positiveSum) + " so'm"}
          icon={ArrowRightLeft}
          color="info"
          style={{ '--i': 2 } as CSSProperties}
        />
        <KPICard
          title={frozenAccounts.length > 0 ? 'Muzlatilgan' : 'Salbiy saldo'}
          value={frozenAccounts.length > 0
            ? `${frozenAccounts.length} ta`
            : (negativeSum > 0 ? formatCompactCurrency(negativeSum) + " so'm" : "0 so'm")
          }
          icon={frozenAccounts.length > 0 ? TrendingDown : TrendingDown}
          color={frozenAccounts.length > 0 ? 'warning' : 'error'}
          style={{ '--i': 3 } as CSSProperties}
        />
      </div>

      {/* Tabs + View Toggle + Filters */}
      <div className="surface-card overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-base-200 px-5 py-3">
          <div className="flex items-center gap-1">
            <button
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-base-content/60 hover:bg-base-200/50'
              )}
              onClick={() => setActiveTab('all')}
            >
              Barcha hisoblar
            </button>
            <button
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'my'
                  ? 'bg-primary/10 text-primary'
                  : 'text-base-content/60 hover:bg-base-200/50'
              )}
              onClick={() => setActiveTab('my')}
            >
              Mening hisoblarim
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            {activeTab === 'all' && (
              <button
                className={clsx(
                  'btn btn-ghost btn-sm btn-square',
                  showFilters && 'bg-primary/10 text-primary'
                )}
                onClick={() => setShowFilters(!showFilters)}
                title="Filterlar"
              >
                <Filter className="h-4 w-4" />
              </button>
            )}

            {/* View mode toggle */}
            <div className="hidden sm:flex items-center gap-0.5 rounded-lg bg-base-200/50 p-0.5">
              <button
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/40 hover:text-base-content/60'
                )}
                onClick={() => setViewMode('grid')}
                title="Grid ko'rinish"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                className={clsx(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'table' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/40 hover:text-base-content/60'
                )}
                onClick={() => setViewMode('table')}
                title="Jadval ko'rinish"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>

            {/* Account count */}
            <span className="hidden sm:inline text-sm text-base-content/50">
              {totalElements} ta hisob
            </span>
          </div>
        </div>

        {/* Filters bar */}
        {activeTab === 'all' && showFilters && (
          <div className="flex flex-col sm:flex-row gap-3 px-5 py-3 bg-base-200/30 border-b border-base-200">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/40" />
              <input
                type="text"
                className="w-full h-10 rounded-lg border border-base-300/50 bg-base-100 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                placeholder="Qidirish (nom yoki kod)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            {/* Type filter */}
            <div className="w-full sm:w-44">
              <Select
                placeholder="Hisob turi"
                value={filterType || ''}
                onChange={(val) => setFilterType(val ? val as AccountType : undefined)}
                options={[
                  { value: '', label: 'Barchasi' },
                  ...Object.values(ACCOUNT_TYPES).map((t) => ({ value: t.value, label: t.label })),
                ]}
              />
            </div>
            {/* Status filter */}
            <div className="w-full sm:w-40">
              <Select
                placeholder="Holat"
                value={filterStatus || ''}
                onChange={(val) => setFilterStatus(val ? val as AccountStatus : undefined)}
                options={[
                  { value: '', label: 'Barchasi' },
                  ...Object.values(ACCOUNT_STATUSES).map((s) => ({ value: s.value, label: s.label })),
                ]}
              />
            </div>
            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                className="btn btn-ghost btn-sm gap-1 self-center"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" />
                Tozalash
              </button>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {activeTab === 'all' && hasActiveFilters && !showFilters && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-base-200 bg-base-200/20">
            <span className="text-xs text-base-content/50">Filterlar:</span>
            {search && (
              <span className="badge badge-sm badge-outline gap-1">
                "{search}"
                <button onClick={() => { setSearchInput(''); setSearch(''); }}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterType && (
              <span className="badge badge-sm badge-outline gap-1">
                {ACCOUNT_TYPES[filterType]?.label}
                <button onClick={() => setFilterType(undefined)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterStatus && (
              <span className="badge badge-sm badge-outline gap-1">
                {ACCOUNT_STATUSES[filterStatus]?.label}
                <button onClick={() => setFilterStatus(undefined)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button className="text-xs text-primary hover:underline ml-1" onClick={clearFilters}>
              Barchasini tozalash
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {viewMode === 'grid' ? (
            <>
              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="surface-soft rounded-xl p-5 pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="skeleton h-12 w-12 rounded-2xl" />
                        <div className="skeleton h-5 w-16" />
                      </div>
                      <div className="skeleton h-5 w-3/4 mb-1" />
                      <div className="skeleton h-3 w-1/2 mb-4" />
                      <div className="skeleton h-20 w-full rounded-xl mb-3" />
                      <div className="skeleton h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-base-200/50 mb-4">
                    <Wallet className="h-8 w-8 text-base-content/20" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">Hisob topilmadi</h3>
                  <p className="text-sm text-base-content/50 max-w-sm">
                    {hasActiveFilters
                      ? "Filterlarni o'zgartirib ko'ring yoki tozalang"
                      : "Yangi hisob yaratish uchun tugmani bosing"
                    }
                  </p>
                  {hasActiveFilters && (
                    <button className="btn btn-ghost btn-sm mt-3" onClick={clearFilters}>
                      Filterlarni tozalash
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <PermissionGate
                      permission={PermissionCode.ACCOUNTS_UPDATE}
                      fallback={
                        <>
                          {accounts.map((account) => (
                            <AccountGridCard
                              key={account.id}
                              account={account}
                              onView={() => navigate(`/accounts/${account.id}`)}
                              onEdit={() => openEdit(account)}
                              canEdit={false}
                            />
                          ))}
                        </>
                      }
                    >
                      {accounts.map((account) => (
                        <AccountGridCard
                          key={account.id}
                          account={account}
                          onView={() => navigate(`/accounts/${account.id}`)}
                          onEdit={() => openEdit(account)}
                          canEdit={true}
                        />
                      ))}
                    </PermissionGate>
                  </div>

                  {/* Grid pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                      >
                        Oldingi
                      </button>
                      <span className="text-sm text-base-content/60">
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(page + 1)}
                      >
                        Keyingi
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <DataTable<Account>
              data={accounts}
              columns={columns}
              keyExtractor={(item) => item.id}
              loading={loading}
              totalElements={totalElements}
              totalPages={totalPages}
              currentPage={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
              onRowClick={(item) => navigate(`/accounts/${item.id}`)}
              renderMobileCard={renderMobileCard}
              emptyIcon={<Wallet className="h-12 w-12 text-base-content/20" />}
              emptyTitle="Hisob topilmadi"
              emptyDescription="Filterlarni o'zgartirib ko'ring yoki yangi hisob yarating"
              highlightId={highlightId}
              onHighlightComplete={() => setHighlightId(null)}
              tableId="accounts"
              resizable
            />
          )}
        </div>
      </div>

      {/* Modal */}
      <AccountFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        editingAccount={editingAccount}
      />
    </div>
  );
}
