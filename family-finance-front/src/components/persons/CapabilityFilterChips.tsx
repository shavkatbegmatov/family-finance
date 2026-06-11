import { type ComponentType } from 'react';
import { KeyRound, Trophy, Users, type LucideProps } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Types
// =============================================================================

export type CapabilityFilter =
  | 'all'
  | 'has_login'
  | 'no_login'
  | 'has_points'
  | 'no_points';

export interface CapabilityCounts {
  all: number;
  has_login: number;
  no_login: number;
  has_points: number;
  no_points: number;
}

interface ChipDef {
  key: CapabilityFilter;
  label: string;
  icon?: ComponentType<LucideProps>;
  tone: 'neutral' | 'primary' | 'warning';
}

const CHIPS: ChipDef[] = [
  { key: 'all', label: 'Hammasi', icon: Users, tone: 'neutral' },
  { key: 'has_login', label: 'Login bor', icon: KeyRound, tone: 'primary' },
  { key: 'no_login', label: 'Login yo\'q', icon: KeyRound, tone: 'warning' },
  { key: 'has_points', label: 'Ball\'da', icon: Trophy, tone: 'primary' },
  { key: 'no_points', label: 'Ball\'da emas', icon: Trophy, tone: 'warning' },
];

// =============================================================================
// Component
// =============================================================================

interface CapabilityFilterChipsProps {
  value: CapabilityFilter;
  onChange: (value: CapabilityFilter) => void;
  counts?: CapabilityCounts;
  className?: string;
}

/**
 * Inson capability'lari bo'yicha filter chiplar.
 * Joriy sahifa ichida client-side filtrlash uchun. Counts agar berilsa, har
 * chip yonida ko'rsatiladi.
 */
export function CapabilityFilterChips({
  value,
  onChange,
  counts,
  className,
}: CapabilityFilterChipsProps) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-1.5', className)}>
      <span className="text-xs text-base-content/40 mr-1">Tezkor filter:</span>
      {CHIPS.map((chip) => {
        const Icon = chip.icon;
        const isActive = value === chip.key;
        const count = counts?.[chip.key];

        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.key)}
            className={clsx(
              'btn btn-sm gap-1.5 normal-case',
              isActive
                ? chip.tone === 'warning'
                  ? 'btn-warning'
                  : 'btn-primary'
                : 'btn-ghost border border-base-300',
            )}
            aria-pressed={isActive}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{chip.label}</span>
            {count !== undefined && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                  isActive
                    ? 'bg-base-100/30 text-current'
                    : 'bg-base-200 text-base-content/60',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
