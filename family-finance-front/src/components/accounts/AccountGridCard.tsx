import { Eye, Edit2 } from 'lucide-react';
import clsx from 'clsx';
import type { Account } from '../../types';
import { formatCurrency, ACCOUNT_TYPES } from '../../config/constants';
import { DEFAULT_ENTITY_COLOR } from '../../config/chartColors';
import { getAccountIcon, STATUS_CONFIG, getAccessRoleBadge } from './accountsHelpers';

/**
 * Grid rejimidagi hisob kartasi (desktop). Bosilganda batafsil sahifaga o'tadi;
 * hover'da ko'rish/tahrirlash tugmalari. Ko'rinishi original bilan bir xil.
 */
export function AccountGridCard({
  account, onView, onEdit, canEdit,
}: {
  account: Account;
  onView: () => void;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const Icon = getAccountIcon(account.type);
  const color = account.color || DEFAULT_ENTITY_COLOR;
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
            <p className="text-xs text-base-content/60 mt-0.5">{account.currency}</p>
          )}
        </div>

        {/* Footer: Role + Actions */}
        <div className="flex items-center justify-between">
          {getAccessRoleBadge(account.myAccessRole)}
          <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
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
