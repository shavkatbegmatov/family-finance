import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

type Tone = 'primary' | 'success' | 'warning' | 'info' | 'accent' | 'neutral' | 'error';

const TONE_STYLES: Record<Tone, string> = {
  primary: 'bg-primary/12 text-primary border-primary/25',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/12 text-warning border-warning/25',
  info: 'bg-info/12 text-info border-info/25',
  accent: 'bg-accent/12 text-accent border-accent/25',
  neutral: 'bg-base-200 text-base-content border-base-300',
  error: 'bg-error/12 text-error border-error/25',
};

type BadgeVariant = 'primary' | 'success' | 'warning' | 'info' | 'accent' | 'error' | 'neutral' | 'outline';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  info: 'badge-info',
  accent: 'badge-accent',
  error: 'badge-error',
  neutral: 'badge-ghost',
  outline: 'badge-outline',
};

interface PointsPageShellProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
}

export function PointsPageShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
}: PointsPageShellProps) {
  return (
    <div className="space-y-6">
      <section className="points-gradient-bg points-glow relative overflow-hidden rounded-3xl border border-primary/20 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="pill border-primary/30 bg-base-100/80 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Ball tizimi
            </span>
            <div className="flex items-start gap-3">
              {Icon && (
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <div>
                <h1 className="section-title text-balance">{title}</h1>
                <p className="section-subtitle mt-1 max-w-2xl text-sm sm:text-base">{description}</p>
              </div>
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </section>

      {children}
    </div>
  );
}

interface PointsPermissionStateProps {
  message?: string;
}

export function PointsPermissionState({
  message = "Sizda bu sahifani ko'rish huquqi yo'q.",
}: PointsPermissionStateProps) {
  return (
    <div className="surface-card rounded-2xl p-10">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-warning/30 bg-warning/10 text-warning">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="text-base-content/70">{message}</p>
      </div>
    </div>
  );
}

interface PointsLoadingStateProps {
  layout?: 'centered' | 'cards';
  cards?: number;
}

export function PointsLoadingState({
  layout = 'centered',
  cards = 4,
}: PointsLoadingStateProps) {
  if (layout === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, idx) => (
          <div key={idx} className="surface-card animate-pulse rounded-2xl p-4">
            <div className="h-4 w-2/5 rounded bg-base-300/60" />
            <div className="mt-4 h-8 w-3/5 rounded bg-base-300/60" />
            <div className="mt-5 h-3 w-4/5 rounded bg-base-300/50" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex justify-center py-14">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

interface PointsEmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  action?: ReactNode;
}

export function PointsEmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  action,
}: PointsEmptyStateProps) {
  return (
    <div className="surface-card rounded-2xl p-8 sm:p-10">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-base-300 bg-base-200/70 text-base-content/50">
          <Sparkles className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-base-content/60">{description}</p>}
        {action ? action : (actionLabel && actionTo ? (
          <Link to={actionTo} className="btn btn-primary btn-sm mt-2">
            {actionLabel}
          </Link>
        ) : null)}
      </div>
    </div>
  );
}

interface PointsSectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function PointsSectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: PointsSectionCardProps) {
  return (
    <section className={clsx('surface-card rounded-2xl', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-base-200/80 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
          </div>
          {subtitle && <p className="mt-1 text-sm text-base-content/60">{subtitle}</p>}
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
      <div className={clsx('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

interface PointsStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  helperText?: string;
  className?: string;
}

export function PointsStatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  helperText,
  className,
}: PointsStatCardProps) {
  return (
    <article className={clsx('surface-card points-card-hover rounded-2xl p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-base-content/50">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
          {helperText && <p className="mt-1 text-xs text-base-content/60">{helperText}</p>}
        </div>
        <div className={clsx('grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl border', TONE_STYLES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

interface PointsTableShellProps {
  children: ReactNode;
  className?: string;
}

export function PointsTableShell({ children, className }: PointsTableShellProps) {
  return (
    <div className={clsx('overflow-x-auto rounded-2xl border border-base-200/80 bg-base-100/75', className)}>
      {children}
    </div>
  );
}

interface PointsActionBarProps {
  children: ReactNode;
  className?: string;
}

export function PointsActionBar({ children, className }: PointsActionBarProps) {
  return (
    <div className={clsx('surface-soft rounded-2xl p-3 sm:p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">{children}</div>
    </div>
  );
}

interface PointsGamifiedBadgeProps {
  label: ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm';
  className?: string;
}

export function PointsGamifiedBadge({
  label,
  variant = 'neutral',
  size = 'sm',
  className,
}: PointsGamifiedBadgeProps) {
  return (
    <span className={clsx('badge points-badge-glow gap-1', BADGE_STYLES[variant], size === 'xs' && 'badge-xs', className)}>
      {label}
    </span>
  );
}
