import { HandMetal } from 'lucide-react';
import { formatCurrency } from '../../config/constants';
import type { FamilyDashboardStats } from '../../types';

/** Ikkilamchi statistika — berilgan/olingan qarz kartalari. */
export function SecondaryStats({ stats }: { stats: FamilyDashboardStats | null }) {
  return (
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
  );
}
