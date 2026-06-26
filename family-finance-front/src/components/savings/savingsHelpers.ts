// Jamg'arma sahifasi uchun umumiy yordamchilar, konstantalar va form tiplari.
// SavingsPage refaktorida ajratildi (D10 naqshi) — xulq AYNAN bir xil.

/**
 * Progress bar rangini foiz bo'yicha tanlaydi (4-darajali). Original
 * SavingsPage mantig'i bilan AYNAN bir xil — chegaralar 100/60/30.
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-success';
  if (percentage >= 60) return 'bg-primary';
  if (percentage >= 30) return 'bg-info';
  return 'bg-warning';
}

/** Maqsad uchun tanlash mumkin bo'lgan ranglar palitrasi. */
export const GOAL_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

/** Maqsad uchun tanlash mumkin bo'lgan belgilar (emoji). */
export const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '📱', '💻', '🎓', '💍', '🏥', '🎁'];

// ---------- Form tiplari ----------

export interface GoalFormState {
  name: string;
  targetAmount: number;
  deadline: string;
  icon: string;
  color: string;
}

export interface ContributionFormState {
  amount: number;
  contributionDate: string;
  note: string;
}

export const emptyGoalForm: GoalFormState = {
  name: '',
  targetAmount: 0,
  deadline: '',
  icon: '',
  color: '',
};

/** Yangi hissa formasi uchun boshlang'ich holat (sana — bugun). */
export function createEmptyContribForm(): ContributionFormState {
  return {
    amount: 0,
    contributionDate: new Date().toISOString().slice(0, 10),
    note: '',
  };
}
