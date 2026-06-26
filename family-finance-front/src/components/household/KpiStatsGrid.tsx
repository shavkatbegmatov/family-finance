import type { CSSProperties } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Wallet } from 'lucide-react';

import { formatCurrency } from '../../config/constants';
import type { MemberFinancialSummary } from '../../types';
import { StatCard } from './memberDetailShared';

/**
 * Overview tabidagi 4 ta KPI karta (oylik daromad/xarajat, sof balans, jami
 * hisob balansi). Sof balans rangi >= 0 da primary, aks holda warning — original
 * mantiq AYNAN. `--i` stagger style'lari ham saqlangan.
 */
export function KpiStatsGrid({ data }: { data: MemberFinancialSummary }) {
  return (
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
  );
}
