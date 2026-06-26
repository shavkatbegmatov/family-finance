import {
  Eye, Edit2, Search, Wallet,
  LayoutGrid, LayoutList, Filter, X,
} from 'lucide-react';
import clsx from 'clsx';
import type { Account, AccountType, AccountStatus } from '../../types';
import {
  formatCurrency, ACCOUNT_TYPES, ACCOUNT_STATUSES,
} from '../../config/constants';
import { DataTable, type Column } from '../ui/DataTable';
import { Select } from '../ui/Select';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../common/PermissionGate';
import { DEFAULT_ENTITY_COLOR } from '../../config/chartColors';
import { getAccountIcon, getStatusBadge, getAccessRoleBadge } from './accountsHelpers';
import { AccountGridCard } from './AccountGridCard';
import { AccountMobileCard } from './AccountMobileCard';
import type { AccountsTab, AccountsViewMode } from '../../hooks/useAccountsData';

interface AccountsListViewProps {
  isMobile: boolean;
  // tabs / view
  activeTab: AccountsTab;
  onTabChange: (tab: AccountsTab) => void;
  viewMode: AccountsViewMode;
  onViewModeChange: (mode: AccountsViewMode) => void;
  // filters
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  search: string;
  onSearchClear: () => void;
  filterType: AccountType | undefined;
  onFilterTypeChange: (val: AccountType | undefined) => void;
  filterStatus: AccountStatus | undefined;
  onFilterStatusChange: (val: AccountStatus | undefined) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  // list data
  accounts: Account[];
  allItems: Account[];
  totalElements: number;
  totalPages: number;
  page: number;
  pageSize: number;
  loading: boolean;
  loadingMore: boolean;
  highlightId: number | null;
  onHighlightComplete: () => void;
  // pagination handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onLoadMore: () => void;
  // row actions
  onView: (account: Account) => void;
  onEdit: (account: Account) => void;
}

/**
 * Hisoblar ro'yxati ko'rinishi: tablar (all/my) + filtr UI + filtr chiplari +
 * grid/jadval almashtirgich + pagination. Mobilda doim kompakt karta ro'yxat
 * (grid emas). Xulq original AccountsPage bilan AYNAN bir xil.
 */
export function AccountsListView({
  isMobile,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  searchInput,
  onSearchInputChange,
  search,
  onSearchClear,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onClearFilters,
  accounts,
  allItems,
  totalElements,
  totalPages,
  page,
  pageSize,
  loading,
  loadingMore,
  highlightId,
  onHighlightComplete,
  onPageChange,
  onPageSizeChange,
  onLoadMore,
  onView,
  onEdit,
}: AccountsListViewProps) {
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
        const color = item.color || DEFAULT_ENTITY_COLOR;
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
                {item.currency && item.currency !== 'UZS' ? ` · ${item.currency}` : ''}
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
            onClick={(e) => { e.stopPropagation(); onView(item); }}
            title="Batafsil"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <PermissionGate permission={PermissionCode.ACCOUNTS_UPDATE}>
            <button
              className="btn btn-ghost btn-xs btn-square"
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
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
  // Render
  // -----------------------------------------------------------------------

  return (
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
            onClick={() => onTabChange('all')}
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
            onClick={() => onTabChange('my')}
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
              onClick={onToggleFilters}
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
              onClick={() => onViewModeChange('grid')}
              title="Grid ko'rinish"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              className={clsx(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'table' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/40 hover:text-base-content/60'
              )}
              onClick={() => onViewModeChange('table')}
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
              onChange={(e) => onSearchInputChange(e.target.value)}
            />
          </div>
          {/* Type filter */}
          <div className="w-full sm:w-44">
            <Select
              placeholder="Hisob turi"
              value={filterType || ''}
              onChange={(val) => onFilterTypeChange(val ? val as AccountType : undefined)}
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
              onChange={(val) => onFilterStatusChange(val ? val as AccountStatus : undefined)}
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
              onClick={onClearFilters}
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
              <button className="-m-1 p-1" onClick={onSearchClear}>
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {filterType && (
            <span className="badge badge-sm badge-outline gap-1">
              {ACCOUNT_TYPES[filterType]?.label}
              <button className="-m-1 p-1" onClick={() => onFilterTypeChange(undefined)}>
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {filterStatus && (
            <span className="badge badge-sm badge-outline gap-1">
              {ACCOUNT_STATUSES[filterStatus]?.label}
              <button className="-m-1 p-1" onClick={() => onFilterStatusChange(undefined)}>
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          <button className="text-xs text-primary hover:underline ml-1" onClick={onClearFilters}>
            Barchasini tozalash
          </button>
        </div>
      )}

      {/* Content — mobilda doim kompakt ro'yxat (grid emas) */}
      <div className="p-3 lg:p-5">
        {viewMode === 'grid' && !isMobile ? (
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
                  <button className="btn btn-ghost btn-sm mt-3" onClick={onClearFilters}>
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
                            onView={() => onView(account)}
                            onEdit={() => onEdit(account)}
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
                        onView={() => onView(account)}
                        onEdit={() => onEdit(account)}
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
                      onClick={() => onPageChange(page - 1)}
                    >
                      Oldingi
                    </button>
                    <span className="text-sm text-base-content/60">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => onPageChange(page + 1)}
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
            data={isMobile ? allItems : accounts}
            columns={columns}
            keyExtractor={(item) => item.id}
            loading={loading}
            totalElements={totalElements}
            totalPages={totalPages}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onLoadMore={onLoadMore}
            hasMore={page < totalPages - 1}
            loadingMore={loadingMore}
            onRowClick={(item) => onView(item)}
            renderMobileCard={(item) => (
              <AccountMobileCard account={item} onClick={() => onView(item)} />
            )}
            emptyIcon={<Wallet className="h-12 w-12 text-base-content/20" />}
            emptyTitle="Hisob topilmadi"
            emptyDescription="Filterlarni o'zgartirib ko'ring yoki yangi hisob yarating"
            highlightId={highlightId}
            onHighlightComplete={onHighlightComplete}
            tableId="accounts"
            resizable
          />
        )}
      </div>
    </div>
  );
}
