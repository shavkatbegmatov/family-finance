/**
 * Markaziy chart/identitet rang palitrasi — brend teal'dan boshlanadi.
 *
 * Kontekst: daisyUI temasi (tailwind.config.js): primary #0f766e (teal),
 * secondary #ea580c (orange), accent #84cc16 (lime). Avval sahifalar indigo
 * #6366f1 ni "primary" sifatida nusxalab ishlatgan — brendga zid edi.
 *
 * Recharts SVG'lari uchun hex qiymatlar (daisyUI oklch token'lari SVG fill'da
 * to'g'ridan-to'g'ri ishlamaydi). WebGL/three.js (graph3d) O'Z palitrasiga ega
 * (components/family/graph3d/color/) — unga tegilmaydi (V1.6.5 qoidasi).
 */

/** Semantik chart ranglari — daisyUI temasiga vizual mos hex'lar. */
export const CHART_COLORS = {
  /** Brend teal (tema primary #0f766e) — urg'u/fallback uchun. */
  primary: '#0f766e',
  /** Yorqinroq brend teal (teal-500) — chart seriyalari uchun (dark fonda ham o'qiladi). */
  teal: '#14b8a6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  /** Axborot ko'ki — indigo emas, sky (brend bilan to'qnashmaydi). */
  info: '#0ea5e9',
  /** Tema secondary (orange-600). */
  secondary: '#ea580c',
  /** Tema accent (lime-500). */
  accent: '#84cc16',
} as const;

/**
 * Kategorik seriyalar palitrasi — birinchi rang har doim brend teal.
 * Qo'shni ranglar hue bo'yicha kontrast (teal→orange→sky→lime→violet...).
 */
export const CHART_PALETTE: string[] = [
  CHART_COLORS.teal,
  CHART_COLORS.secondary,
  CHART_COLORS.info,
  CHART_COLORS.accent,
  '#8b5cf6', // violet — to'ldiruvchi kontrast
  CHART_COLORS.warning,
  '#ec4899', // pink — to'ldiruvchi kontrast
  CHART_COLORS.success,
];

export const getChartColor = (index: number): string =>
  CHART_PALETTE[index % CHART_PALETTE.length];

/** Hisob/kategoriya rangi berilmaganda ishlatiladigan brend fallback. */
export const DEFAULT_ENTITY_COLOR = CHART_COLORS.primary;

/**
 * Byudjet progress chegaralari — YAGONA manba (backend budget_alerts
 * WARNING=80%/EXCEEDED=100% bilan mos). Avval BudgetPage (60/80) va
 * Dashboard (80/100) har xil mantiq ishlatib, bir xil byudjet ikki sahifada
 * ikki xil rangda ko'rinardi.
 */
export const BUDGET_THRESHOLDS = { warning: 80, over: 100 } as const;

export type BudgetTone = 'success' | 'warning' | 'error';

export const getBudgetTone = (percentage: number): BudgetTone => {
  if (percentage >= BUDGET_THRESHOLDS.over) return 'error';
  if (percentage >= BUDGET_THRESHOLDS.warning) return 'warning';
  return 'success';
};

/** Tailwind klass xaritalari — dinamik `bg-${tone}` ishlamaydi (purge). */
export const BUDGET_TONE_BG: Record<BudgetTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

export const BUDGET_TONE_TEXT: Record<BudgetTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};
