import clsx from 'clsx';
import type { Account } from '../../types';
import { formatCurrency, ACCOUNT_TYPES } from '../../config/constants';
import { DEFAULT_ENTITY_COLOR } from '../../config/chartColors';
import { getAccountIcon, STATUS_CONFIG, getAccessRoleBadge } from './accountsHelpers';

/**
 * Mobil kompakt hisob kartasi (DataTable renderMobileCard). Ko'rinishi va xulqi
 * original bilan bir xil — bosilganda {@code onClick} ishga tushadi.
 */
export function AccountMobileCard({
  account, onClick,
}: {
  account: Account;
  onClick: () => void;
}) {
  const Icon = getAccountIcon(account.type);
  const color = account.color || DEFAULT_ENTITY_COLOR;
  const statusInfo = STATUS_CONFIG[account.status || 'ACTIVE'];

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-base-200 bg-base-100 p-3"
      onClick={onClick}
    >
      <span
        className="grid h-11 w-11 flex-none place-items-center rounded-2xl border"
        style={{ backgroundColor: `${color}14`, borderColor: `${color}28` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {statusInfo && <span className={clsx('h-2 w-2 flex-none rounded-full', statusInfo.dot)} />}
            <p className="truncate text-sm font-semibold">{account.name}</p>
          </div>
          <span
            className={clsx(
              'flex-none text-sm font-bold tabular-nums',
              account.balance < 0 && 'text-error'
            )}
          >
            {formatCurrency(account.balance)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-base-content/55">
            {ACCOUNT_TYPES[account.type]?.label ?? account.type}
            {account.accCodeFormatted ? ` · ${account.accCodeFormatted}` : ''}
          </p>
          <span className="flex-none">{getAccessRoleBadge(account.myAccessRole)}</span>
        </div>
      </div>
    </div>
  );
}
