import type { ReactNode } from 'react';
import clsx from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** O'ng tomondagi amallar (tugmalar, toggle'lar). */
  actions?: ReactNode;
  /**
   * true — blok mobilda ham ko'rinadi (sarlavha matni baribir yashirin,
   * faqat `actions` ko'rinadi). Mobilda ham kerakli toggle/amallar bor
   * sahifalar uchun. Default false: butun blok faqat lg+ da ko'rinadi —
   * mobil/planshetda yaratish amalini BottomNav FAB beradi, sahifa
   * sarlavhasini esa sticky Header ko'rsatadi (ikki h1 bo'lmasligi kerak).
   */
  mobileVisible?: boolean;
  className?: string;
}

/** Yagona sahifa sarlavhasi — barcha sahifalar shu komponentdan foydalanadi. */
export function PageHeader({ title, subtitle, actions, mobileVisible = false, className }: PageHeaderProps) {
  return (
    <div
      className={clsx(
        'items-center justify-between gap-3',
        mobileVisible ? 'flex' : 'hidden lg:flex',
        className
      )}
    >
      <div className="hidden min-w-0 lg:block">
        <h1 className="section-title">{title}</h1>
        {subtitle && <p className="section-subtitle mt-0.5 truncate text-sm">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:flex-none">
          {actions}
        </div>
      )}
    </div>
  );
}
