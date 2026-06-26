import { ArrowUpCircle, CreditCard, HandMetal } from 'lucide-react';
import { formatCurrency } from '../../config/constants';
import type { DebtSummary } from '../../hooks/useDebtsData';

interface DebtsStatsViewProps {
  summary: DebtSummary;
  /** Joriy ko'rinadigan sahifadagi muddati o'tgan qarzlar soni. */
  overdueCount: number;
}

/**
 * Statistika tab: jami berilgan/olingan KPI kartalari + muddati o'tganlar soni.
 */
export function DebtsStatsView({ summary, overdueCount }: DebtsStatsViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-soft rounded-xl p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami berilgan</p>
              <p className="text-lg font-bold text-info">
                {formatCurrency(summary.totalGiven)}
              </p>
            </div>
          </div>
        </div>
        <div className="surface-soft rounded-xl p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Jami olingan</p>
              <p className="text-lg font-bold text-warning">
                {formatCurrency(summary.totalTaken)}
              </p>
            </div>
          </div>
        </div>
        <div className="surface-soft rounded-xl p-4 lg:p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-error/10 flex items-center justify-center">
              <HandMetal className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-xs text-base-content/60">Muddati o'tganlar</p>
              <p className="text-lg font-bold text-error">
                {overdueCount} ta
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
