import type { CSSProperties } from 'react';
import clsx from 'clsx';
import type { TrendInfo } from '../../hooks/useTrendCalculations';

/** KPI karta komponenti — trend indicator bilan. */
export function KPICard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  trend,
  trendGoodDirection = 'up',
  subtitle,
  className,
  style,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  trend?: TrendInfo | null;
  trendGoodDirection?: 'up' | 'down';
  subtitle?: string;
  className?: string;
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

  const trendIsGood = trend && trend.dir !== 'flat' && trend.dir === trendGoodDirection;
  const trendIsBad = trend && trend.dir !== 'flat' && trend.dir !== trendGoodDirection;

  return (
    <div
      className={clsx(
        'surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      style={style}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-base-content/60">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {trend ? (
                <span
                  className={clsx(
                    'inline-flex items-center gap-0.5 font-semibold',
                    trendIsGood && 'text-success',
                    trendIsBad && 'text-error',
                    trend.dir === 'flat' && 'text-base-content/50'
                  )}
                >
                  {trend.dir === 'up' && '↑'}
                  {trend.dir === 'down' && '↓'}
                  {trend.dir === 'flat' && '→'}
                  {' '}{trend.value}
                </span>
              ) : (
                <span className="text-base-content/40">—</span>
              )}
              {subtitle && (
                <span className="text-base-content/50 truncate">{subtitle}</span>
              )}
            </div>
          </div>
          <div
            className={clsx(
              'grid h-12 w-12 flex-none place-items-center rounded-2xl border',
              colorMap[color]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
