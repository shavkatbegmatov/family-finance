import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, Plus, RefreshCw,
  TrendingUp, TrendingDown, ArrowRightLeft,
} from 'lucide-react';
import clsx from 'clsx';
import type { Account } from '../../types';
import { formatCompactCurrency } from '../../config/constants';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAccountsData } from '../../hooks/useAccountsData';
import { formatBalance } from '../../components/accounts/accountsHelpers';
import { AccountsKpiCard } from '../../components/accounts/AccountsKpiCard';
import { AccountsSkeleton } from '../../components/accounts/AccountsSkeleton';
import { AccountsListView } from '../../components/accounts/AccountsListView';
import { AccountFormModal } from './AccountFormModal';

export function AccountsPage() {
  const navigate = useNavigate();
  const data = useAccountsData();

  const viewAccount = (account: Account) => navigate(`/accounts/${account.id}`);

  if (data.initialLoading) {
    return <AccountsSkeleton />;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <PageHeader
        title="Hisoblar"
        subtitle="Barcha moliyaviy hisoblarni boshqarish"
        actions={
          <>
            <button
              className="tap-sm grid h-10 w-10 place-items-center rounded-xl border border-base-200 text-base-content/60"
              onClick={data.handleRefresh}
              title="Yangilash"
              aria-label="Yangilash"
            >
              <RefreshCw className={clsx('h-4 w-4', data.loading && 'animate-spin')} />
            </button>
            <PermissionGate permission={PermissionCode.ACCOUNTS_CREATE}>
              <button className="btn btn-primary btn-sm gap-1.5" onClick={data.openCreate}>
                <Plus className="h-4 w-4" />
                Yangi hisob
              </button>
            </PermissionGate>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <AccountsKpiCard
          title="Umumiy balans"
          value={data.kpiLoading ? '...' : formatBalance(data.balances[0])}
          subtitle={!data.kpiLoading && data.balances.length > 1
            ? data.balances.slice(1).map(formatBalance).join(' · ')
            : undefined}
          icon={Wallet}
          color="primary"
          style={{ '--i': 0 } as CSSProperties}
        />
        <AccountsKpiCard
          title="Faol hisoblar"
          value={`${data.activeAccounts.length} ta`}
          icon={TrendingUp}
          color="success"
          style={{ '--i': 1 } as CSSProperties}
        />
        <AccountsKpiCard
          title="Ijobiy saldo"
          value={formatCompactCurrency(data.positiveSum) + " so'm"}
          icon={ArrowRightLeft}
          color="info"
          style={{ '--i': 2 } as CSSProperties}
        />
        <AccountsKpiCard
          title={data.frozenAccounts.length > 0 ? 'Muzlatilgan' : 'Salbiy saldo'}
          value={data.frozenAccounts.length > 0
            ? `${data.frozenAccounts.length} ta`
            : (data.negativeSum > 0 ? formatCompactCurrency(data.negativeSum) + " so'm" : "0 so'm")
          }
          icon={data.frozenAccounts.length > 0 ? TrendingDown : TrendingDown}
          color={data.frozenAccounts.length > 0 ? 'warning' : 'error'}
          style={{ '--i': 3 } as CSSProperties}
        />
      </div>

      {/* Tabs + View Toggle + Filters + List */}
      <AccountsListView
        isMobile={data.isMobile}
        activeTab={data.activeTab}
        onTabChange={data.setActiveTab}
        viewMode={data.viewMode}
        onViewModeChange={data.setViewMode}
        searchInput={data.searchInput}
        onSearchInputChange={data.setSearchInput}
        search={data.search}
        onSearchClear={() => { data.setSearchInput(''); data.setSearch(''); }}
        filterType={data.filterType}
        onFilterTypeChange={data.setFilterType}
        filterStatus={data.filterStatus}
        onFilterStatusChange={data.setFilterStatus}
        showFilters={data.showFilters}
        onToggleFilters={() => data.setShowFilters(!data.showFilters)}
        hasActiveFilters={data.hasActiveFilters}
        onClearFilters={data.clearFilters}
        accounts={data.accounts}
        allItems={data.allItems}
        totalElements={data.totalElements}
        totalPages={data.totalPages}
        page={data.page}
        pageSize={data.pageSize}
        loading={data.loading}
        loadingMore={data.loadingMore}
        highlightId={data.highlightId}
        onHighlightComplete={() => data.setHighlightId(null)}
        onPageChange={data.setPage}
        onPageSizeChange={(size) => { data.setPageSize(size); data.setPage(0); }}
        onLoadMore={data.handleLoadMore}
        onView={viewAccount}
        onEdit={data.openEdit}
      />

      {/* Modal */}
      <AccountFormModal
        isOpen={data.showModal}
        onClose={() => data.setShowModal(false)}
        onSuccess={data.handleModalSuccess}
        editingAccount={data.editingAccount}
      />
    </div>
  );
}
