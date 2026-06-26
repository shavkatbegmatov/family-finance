import type { MemberFinancialSummary } from '../../types';
import { ProfileSummaryCard } from './ProfileSummaryCard';
import { KpiStatsGrid } from './KpiStatsGrid';
import { RecentTransactionsList } from './RecentTransactionsList';

/**
 * "Umumiy" tab — profil kartasi + KPI grid (3 ustunli layout) hamda (mavjud
 * bo'lsa) oxirgi tranzaksiyalar jadvali. Original OverviewTab kompozitsiyasi AYNAN.
 */
export function OverviewTab({ data }: { data: MemberFinancialSummary }) {
  const { profile } = data;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Profile + KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProfileSummaryCard profile={profile} />
        <KpiStatsGrid data={data} />
      </div>

      {/* Recent Transactions */}
      {data.recentTransactions.length > 0 && (
        <RecentTransactionsList transactions={data.recentTransactions} />
      )}
    </div>
  );
}
