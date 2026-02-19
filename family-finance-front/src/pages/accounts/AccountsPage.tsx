import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, CreditCard, PiggyBank, Smartphone, Landmark, Receipt,
  Plus, RefreshCw, Eye, Edit2, Search, Banknote,
} from 'lucide-react';
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

function getStatusBadge(status?: AccountStatus) {
  const s = status || 'ACTIVE';
  const info = ACCOUNT_STATUSES[s];
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
  if (!role) return <span className="text-xs text-base-content/30">—</span>;
  const info = ACCESS_ROLE_MAP[role];
  if (!info) return <span className="badge badge-ghost badge-sm">{role}</span>;
  return <span className={`badge ${info.badge} badge-sm`}>{info.label}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type TabType = 'all' | 'my';

export function AccountsPage() {
  const navigate = useNavigate();

  // Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AccountType | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<AccountStatus | undefined>(undefined);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Highlight
  const [highlightId, setHighlightId] = useState<number | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

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
    }
  }, [activeTab, page, pageSize, search, filterType, filterStatus]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [search, filterType, filterStatus, activeTab]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleRefresh = () => fetchAccounts();

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
      key: 'accCode',
      header: 'Kod',
      className: 'w-32',
      render: (item) => (
        <span className="font-mono text-xs text-base-content/60">
          {item.accCodeFormatted || item.accCode || '—'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Hisob',
      sortable: true,
      render: (item) => {
        const Icon = getAccountIcon(item.type);
        const color = item.color || '#3b82f6';
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-xs text-base-content/50">
                {ACCOUNT_TYPES[item.type]?.label ?? item.type}
                {item.currency && item.currency !== 'UZS' ? ` • ${item.currency}` : ''}
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
      render: (item) => (
        <span className="font-semibold tabular-nums">{formatCurrency(item.balance)}</span>
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
    const color = item.color || '#3b82f6';

    return (
      <div
        className="surface-card p-4 cursor-pointer"
        style={{ borderLeft: `3px solid ${color}` }}
        onClick={() => navigate(`/accounts/${item.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-base-content/50">
                {ACCOUNT_TYPES[item.type]?.label} {item.accCodeFormatted ? `• ${item.accCodeFormatted}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {getAccessRoleBadge(item.myAccessRole)}
            {getStatusBadge(item.status)}
          </div>
        </div>
        <div className="mt-3 text-right">
          <p className="text-lg font-bold">{formatCurrency(item.balance)}</p>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Hisoblar</h1>
            <p className="text-sm text-base-content/60">
              {totalElements} ta hisob
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm btn-square" onClick={handleRefresh} title="Yangilash">
            <RefreshCw className="h-4 w-4" />
          </button>
          <PermissionGate permission={PermissionCode.ACCOUNTS_CREATE}>
            <button className="btn btn-primary btn-sm gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Yangi hisob
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed w-fit">
        <button
          className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Barcha hisoblar
        </button>
        <button
          className={`tab ${activeTab === 'my' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          Mening hisoblarim
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'all' && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/40" />
            <input
              type="text"
              className="input input-bordered input-sm w-full pl-9"
              placeholder="Qidirish (nom yoki kod)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {/* Type filter */}
          <div className="w-44">
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
          <div className="w-40">
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
        </div>
      )}

      {/* Data Table */}
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
      />

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
