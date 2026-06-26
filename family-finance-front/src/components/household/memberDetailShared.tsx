import type { CSSProperties } from 'react';
import {
  Banknote,
  CreditCard,
  PiggyBank,
  Smartphone,
  Landmark,
  Receipt,
} from 'lucide-react';
import clsx from 'clsx';

import {
  FAMILY_ROLES,
  GENDERS,
} from '../../config/constants';
import { CHART_PALETTE } from '../../config/chartColors';

// ========== Constants (MemberDetail bo'ylab umumiy) ==========

export type TabKey = 'overview' | 'transactions' | 'accounts' | 'statistics';

/** Pie/seriya ranglari — original CHART_COLORS = CHART_PALETTE (daisyUI oklch'ga tegilmaydi). */
export const CHART_COLORS = CHART_PALETTE;

export const MONTH_NAMES: Record<string, string> = {
  JANUARY: 'Yanvar', FEBRUARY: 'Fevral', MARCH: 'Mart', APRIL: 'Aprel',
  MAY: 'May', JUNE: 'Iyun', JULY: 'Iyul', AUGUST: 'Avgust',
  SEPTEMBER: 'Sentabr', OCTOBER: 'Oktabr', NOVEMBER: 'Noyabr', DECEMBER: 'Dekabr',
};

export const ACCOUNT_ICON_MAP: Record<string, React.ElementType> = {
  CASH: Banknote, BANK_CARD: CreditCard, SAVINGS: PiggyBank,
  E_WALLET: Smartphone, TERM_DEPOSIT: Landmark, CREDIT: Receipt,
};

// ========== Helpers ==========

export function getGenderGradient(gender?: string) {
  if (gender === 'MALE') return 'from-blue-400 to-blue-600';
  if (gender === 'FEMALE') return 'from-pink-400 to-pink-600';
  return 'from-amber-400 to-amber-600';
}

export const roleLabel = (role: string): string =>
  (FAMILY_ROLES as Record<string, { label: string }>)[role]?.label || role;

export const genderLabel = (gender: string): string =>
  (GENDERS as Record<string, { label: string }>)[gender]?.label || gender;

// ========== Shared presentational helpers ==========

export function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="h-8 w-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-base-content/50" />
      </div>
      <div>
        <span className="text-base-content/50 text-xs">{label}</span>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export function StatCard({
  title, value, icon: Icon, color = 'primary', style,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  style?: CSSProperties;
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  };
  return (
    <div
      className="surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={style}
    >
      <div className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
          </div>
          <div className={clsx('grid h-12 w-12 place-items-center rounded-2xl border', colorMap[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
