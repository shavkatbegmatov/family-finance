import clsx from 'clsx';

/** Dashboard chart/jadval kartasi uchun umumiy o'rov (sarlavha + action + tana). */
export function ChartCard({
  title,
  icon: Icon,
  children,
  action,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('surface-card overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-base-200 px-4 py-4 lg:px-5">
        <h3 className="flex items-center gap-2 font-semibold">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4 lg:p-5">{children}</div>
    </div>
  );
}
