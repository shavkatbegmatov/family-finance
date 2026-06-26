import clsx from 'clsx';
import { CATEGORY_TYPES } from '../../config/constants';
import type { CategoryType } from '../../types';

/**
 * Kategoriya hisoboti turi toggle'i (INCOME / EXPENSE). Tanlov o'zgarganda
 * orchestrator hook'dagi categoryType yangilanadi → queryKey o'zgaradi →
 * kategoriya hisoboti AYNAN qayta yuklanadi.
 */
export function CategoryToggle({
  value,
  onChange,
}: {
  value: CategoryType;
  onChange: (type: CategoryType) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        className={clsx('btn btn-sm', value === 'INCOME' ? 'btn-success' : 'btn-outline')}
        onClick={() => onChange('INCOME')}
      >
        {CATEGORY_TYPES.INCOME.label}
      </button>
      <button
        className={clsx('btn btn-sm', value === 'EXPENSE' ? 'btn-error' : 'btn-outline')}
        onClick={() => onChange('EXPENSE')}
      >
        {CATEGORY_TYPES.EXPENSE.label}
      </button>
    </div>
  );
}
