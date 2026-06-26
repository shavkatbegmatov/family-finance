import type { CSSProperties } from 'react';
import clsx from 'clsx';

/**
 * Hisoblar sahifasi KPI kartasi. Nomi Dashboard {@code KPICard} bilan konflikt
 * bo'lmasligi uchun AccountsKpiCard. Ko'rinishi original bilan bir xil.
 */
export function AccountsKpiCard({
  title, value, subtitle, icon: Icon, color = 'primary', style,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'error' | 'info' | 'warning';
  style?: CSSProperties;
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
  };

  return (
    <div
      className="surface-card group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={style}
    >
      <div className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-base-content/60 lg:text-sm">{title}</p>
            <p className="mt-1.5 truncate text-lg font-bold tracking-tight lg:mt-2 lg:text-2xl">{value}</p>
            {subtitle && <p className="mt-0.5 truncate text-xs text-base-content/50">{subtitle}</p>}
          </div>
          <div className={clsx('grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl border lg:h-12 lg:w-12', colorMap[color])}>
            <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
