import {
  MONTHS_UZ,
  formatCompactCurrency,
  formatNumber,
  getDateDaysAgo,
} from '../../config/constants';

export const WEEKDAYS_UZ = [
  'yakshanba',
  'dushanba',
  'seshanba',
  'chorshanba',
  'payshanba',
  'juma',
  'shanba',
] as const;

/** D7: valyuta yorlig'i (UZS -> "so'm", boshqa valyuta -> kod, yo'q bo'lsa "so'm"). */
export const currencyLabel = (currency?: string | null): string =>
  !currency || currency === 'UZS' ? "so'm" : currency;

/** To'liq summa + valyuta: 125 000 so'm / 40 USD. */
export const formatAmountWithCurrency = (amount: number, currency?: string | null): string =>
  `${formatNumber(amount)} ${currencyLabel(currency)}`;

/** Ixcham summa + valyuta: 1.2M so'm (stat kartalar uchun). */
export const formatCompactWithCurrency = (amount: number, currency?: string | null): string =>
  `${formatCompactCurrency(amount)} ${currencyLabel(currency)}`;

/** 'YYYY-MM' -> "Avgust 2026". */
export const formatMonthLabel = (cursor: string): string => {
  const [y, m] = cursor.split('-').map(Number);
  return `${MONTHS_UZ[m - 1] ?? cursor} ${y}`;
};

interface SplitPortionLike {
  categoryId: number;
  amount: number;
}

/**
 * Kategoriya filtri faol bo'lganda qator/kun jamida ko'rsatiladigan summa.
 *
 * Split'li tranzaksiya filtrga ulushi orqali tushadi — to'liq summasini ko'rsatish
 * kategoriya taqsimoti jamiga mos kelmay chalg'itardi; shuning uchun faqat shu
 * kategoriyaga tegishli ulush(lar) yig'indisi qaytariladi. Ulush topilmasa (qator
 * to'g'ridan kategoriya orqali mos kelgan — splits boshqa kategoriyalarda bo'lgan
 * nostandart holat) to'liq summa qoladi. Filtrsiz — har doim to'liq summa.
 */
export const expenseAmountForCategory = (
  t: { amount: number; splits?: SplitPortionLike[] | null },
  categoryId?: number
): number => {
  if (categoryId === undefined || !t.splits?.length) return t.amount;
  const portion = t.splits
    .filter((s) => s.categoryId === categoryId)
    .reduce((sum, s) => sum + s.amount, 0);
  return portion > 0 ? portion : t.amount;
};

/**
 * Jurnal kun sarlavhasi: "Bugun · 6-avgust, chorshanba" / "Kecha · ..." /
 * "6-avgust, chorshanba" (boshqa yil bo'lsa yil ham qo'shiladi).
 */
export const formatDayLabel = (date: string, today: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS_UZ[new Date(y, m - 1, d).getDay()];
  const monthName = (MONTHS_UZ[m - 1] ?? '').toLowerCase();
  const base = `${d}-${monthName}, ${weekday}`;
  const withYear = date.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${y}`;

  if (date === today) return `Bugun · ${withYear}`;
  if (date === getDateDaysAgo(1)) return `Kecha · ${withYear}`;
  return withYear;
};
