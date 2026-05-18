import type { CSSProperties } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export type InsightTone = 'positive' | 'negative' | 'warning' | 'neutral';

const TONE_CONFIG: Record<InsightTone, {
  icon: typeof Sparkles;
  iconBg: string;
  iconColor: string;
  border: string;
  bg: string;
  label: string;
  labelColor: string;
}> = {
  positive: {
    icon: TrendingUp,
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    border: 'border-success/20',
    bg: 'bg-gradient-to-br from-success/10 via-transparent to-transparent',
    label: 'Yaxshi yangilik',
    labelColor: 'text-success',
  },
  negative: {
    icon: TrendingDown,
    iconBg: 'bg-error/15',
    iconColor: 'text-error',
    border: 'border-error/20',
    bg: 'bg-gradient-to-br from-error/10 via-transparent to-transparent',
    label: 'Diqqat',
    labelColor: 'text-error',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
    border: 'border-warning/20',
    bg: 'bg-gradient-to-br from-warning/10 via-transparent to-transparent',
    label: 'Ogohlantirish',
    labelColor: 'text-warning',
  },
  neutral: {
    icon: Sparkles,
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    border: 'border-primary/20',
    bg: 'bg-gradient-to-br from-primary/10 via-transparent to-transparent',
    label: 'Maslahat',
    labelColor: 'text-primary',
  },
};

export interface InsightCardProps {
  tone?: InsightTone;
  title?: string;
  message: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
}

export function InsightCard({
  tone = 'neutral',
  title,
  message,
  action,
  className,
  style,
  compact = false,
}: InsightCardProps) {
  const config = TONE_CONFIG[tone];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'surface-card relative overflow-hidden border',
        config.border,
        compact ? 'p-3' : 'p-5',
        className
      )}
      style={style}
    >
      <div className={clsx('absolute inset-0 pointer-events-none', config.bg)} />
      <div className="relative flex items-start gap-3">
        <div
          className={clsx(
            'grid flex-none place-items-center rounded-xl',
            config.iconBg,
            compact ? 'h-9 w-9' : 'h-11 w-11'
          )}
        >
          <Icon className={clsx(config.iconColor, compact ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={clsx('text-xs font-semibold uppercase tracking-wider', config.labelColor)}>
            {title || config.label}
          </p>
          <div
            className={clsx(
              'mt-1 text-base-content/80',
              compact ? 'text-sm leading-snug' : 'text-sm leading-relaxed'
            )}
          >
            {message}
          </div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
