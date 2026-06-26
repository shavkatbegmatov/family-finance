import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  BarChart3,
  Receipt,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

import { calculateAge } from '../../config/constants';
import { formatPhoneDisplay } from '../../utils/phone';
import { useMemberDetailData } from '../../hooks/useMemberDetailData';
import {
  type TabKey,
  getGenderGradient,
  roleLabel,
  genderLabel,
} from '../../components/household/memberDetailShared';
import { OverviewTab } from '../../components/household/OverviewTab';
import { MemberTransactionsTab } from '../../components/household/MemberTransactionsTab';
import { AccountsList } from '../../components/household/AccountsList';
import { MemberStatisticsTab } from '../../components/household/MemberStatisticsTab';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Umumiy', icon: User },
  { key: 'transactions', label: 'Tranzaksiyalar', icon: Receipt },
  { key: 'accounts', label: 'Hisoblar', icon: CreditCard },
  { key: 'statistics', label: 'Statistika', icon: BarChart3 },
];

/**
 * Oila a'zosi moliyaviy tafsilot sahifasi (orchestrator). Ma'lumot/pagination/
 * filtr/mobil load-more {@link useMemberDetailData} hook'ida (react-query, D8
 * migratsiyasi — summary/transactions queryKey scope-aware, tranzaksiyalar lazy).
 * Bu komponent faqat route param (memberId), tab holati, header/back va tab
 * dispatcher'ni boshqaradi. Tab kontenti household komponentlarida.
 */
export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const memberId = Number(id);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const {
    data,
    loading,
    refreshSummary,
    txItems,
    txLoading,
    txLoadingMore,
    txPage,
    setTxPage,
    txTotalElements,
    txTotalPages,
    txTypeFilter,
    changeTypeFilter,
    handleTxLoadMore,
    hasMore,
  } = useMemberDetailData(memberId, activeTab);

  // ===== Loading State =====

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6 animate-pulse">
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
  const age = calculateAge(profile.birthDate);

  return (
    <div className="space-y-4 lg:space-y-6">
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
              {age !== null && profile.phone && ' · '}
              {formatPhoneDisplay(profile.phone)}
            </p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-square" onClick={refreshSummary}>
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
        <MemberTransactionsTab
          data={txItems}
          loading={txLoading}
          page={txPage}
          totalElements={txTotalElements}
          totalPages={txTotalPages}
          typeFilter={txTypeFilter}
          onPageChange={setTxPage}
          onTypeFilterChange={changeTypeFilter}
          onLoadMore={handleTxLoadMore}
          hasMore={hasMore}
          loadingMore={txLoadingMore}
        />
      )}
      {activeTab === 'accounts' && <AccountsList accounts={data.accounts} />}
      {activeTab === 'statistics' && <MemberStatisticsTab data={data} />}
    </div>
  );
}
