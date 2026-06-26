import { Wallet } from 'lucide-react';

import {
  formatCurrency,
  ACCOUNT_TYPES,
  ACCOUNT_STATUSES,
} from '../../config/constants';
import type { MemberAccountSummary } from '../../types';
import { ACCOUNT_ICON_MAP } from './memberDetailShared';

/**
 * Hisoblar tabidagi bitta hisob kartasi — ikona/turi/holati badge, balans va
 * scope (Oilaviy/Shaxsiy) badge. Original AccountsTab ichidagi karta AYNAN.
 */
export function AccountCard({ account: acc }: { account: MemberAccountSummary }) {
  const Icon = ACCOUNT_ICON_MAP[acc.type] || Wallet;
  const statusInfo = (ACCOUNT_STATUSES as Record<string, { label: string; badge: string }>)[acc.status];
  const typeInfo = (ACCOUNT_TYPES as Record<string, { label: string }>)[acc.type];

  return (
    <div className="surface-card p-4 lg:p-5 transition hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold">{acc.name}</h4>
            <p className="text-xs text-base-content/50">
              {typeInfo?.label || acc.type}
              {acc.accCode && ` · ${acc.accCode}`}
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
}
