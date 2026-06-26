import {
  Wallet, CreditCard, PiggyBank, Smartphone, Landmark, Receipt, Banknote,
} from 'lucide-react';
import type { AccountType, AccountStatus, CurrencyBalance } from '../../types';
import { formatCompactCurrency } from '../../config/constants';

// ---------------------------------------------------------------------------
// Account icons
// ---------------------------------------------------------------------------

export const ACCOUNT_ICON_MAP: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  CASH: Banknote,
  BANK_CARD: CreditCard,
  SAVINGS: PiggyBank,
  E_WALLET: Smartphone,
  TERM_DEPOSIT: Landmark,
  CREDIT: Receipt,
};

export function getAccountIcon(type: AccountType) {
  return ACCOUNT_ICON_MAP[type] ?? Wallet;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

export const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  ACTIVE: { label: 'Faol', badge: 'badge-success', dot: 'bg-success' },
  FROZEN: { label: 'Muzlatilgan', badge: 'badge-warning', dot: 'bg-warning' },
  CLOSED: { label: 'Yopilgan', badge: 'badge-error', dot: 'bg-error' },
};

export function getStatusBadge(status?: AccountStatus) {
  const s = status || 'ACTIVE';
  const info = STATUS_CONFIG[s];
  if (!info) return <span className="badge badge-ghost badge-sm">{s}</span>;
  return <span className={`badge ${info.badge} badge-sm`}>{info.label}</span>;
}

// ---------------------------------------------------------------------------
// Access role badge
// ---------------------------------------------------------------------------

export const ACCESS_ROLE_MAP: Record<string, { label: string; badge: string }> = {
  OWNER: { label: 'Egasi', badge: 'badge-primary' },
  CO_OWNER: { label: 'Hamkor', badge: 'badge-secondary' },
  VIEWER: { label: 'Kuzatuvchi', badge: 'badge-ghost' },
  FAMILY_MEMBER: { label: 'Oilaviy', badge: 'badge-info' },
};

export function getAccessRoleBadge(role?: string) {
  if (!role) return <span className="text-xs text-base-content/30">&mdash;</span>;
  const info = ACCESS_ROLE_MAP[role];
  if (!info) return <span className="badge badge-ghost badge-sm">{role}</span>;
  return <span className={`badge ${info.badge} badge-sm`}>{info.label}</span>;
}

// ---------------------------------------------------------------------------
// Balance formatting
// ---------------------------------------------------------------------------

/** D7: balansni valyutasi bilan formatlaydi (UZS -> "so'm", boshqa valyuta -> kod). */
export function formatBalance(b?: CurrencyBalance): string {
  if (!b) return "0 so'm";
  const label = b.currency === 'UZS' ? "so'm" : b.currency;
  return `${formatCompactCurrency(b.amount)} ${label}`;
}
