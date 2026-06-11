import clsx from 'clsx';

/**
 * Yangilash (refresh) holatining bloklamaydigan indikatori.
 *
 * Eski naqsh butun sahifani blur-overlay bilan yopib, kontent bilan ishlashni
 * to'xtatib qo'yardi. Standart: birinchi yuklash = skeleton, refresh = shu pill
 * (kontent interaktiv qoladi). Ota konteyner `relative` bo'lishi kerak.
 */
export function RefreshingPill({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-2',
        'rounded-full border border-base-200 bg-base-100/95 px-3 py-1.5 shadow-md',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="loading loading-spinner loading-xs text-primary" />
      <span className="text-xs font-medium text-base-content/70">Yangilanmoqda…</span>
    </div>
  );
}
