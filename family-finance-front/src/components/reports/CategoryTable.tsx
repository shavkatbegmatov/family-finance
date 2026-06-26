import { formatCurrency } from '../../config/constants';
import { CHART_PALETTE as COLORS } from '../../config/chartColors';
import type { CategoryReport } from '../../types';

/**
 * Kategoriya bo'yicha tafsilot jadvali — desktop (table) + mobil (kartalar).
 * Rang nuqtalari {@code CHART_PALETTE} indeks bo'yicha (pie chart bilan mos),
 * tuzilma/format original ReportsPage bilan AYNAN.
 */
export function CategoryTable({
  sortedCategories,
  totalCategoryAmount,
}: {
  sortedCategories: CategoryReport[];
  totalCategoryAmount: number;
}) {
  return (
    <div className="surface-card p-4 lg:p-5">
      <h2 className="mb-4 text-lg font-semibold">Kategoriya bo'yicha tafsilot</h2>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Kategoriya</th>
              <th className="text-right">Summa</th>
              <th className="text-right">Foiz</th>
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((cat, index) => (
              <tr key={cat.categoryId}>
                <td>
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                </td>
                <td className="font-medium">{cat.categoryName}</td>
                <td className="text-right">{formatCurrency(cat.amount)}</td>
                <td className="text-right">{cat.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td></td>
              <td>Jami</td>
              <td className="text-right">{formatCurrency(totalCategoryAmount)}</td>
              <td className="text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-2 sm:hidden">
        {sortedCategories.map((cat, index) => (
          <div
            key={cat.categoryId}
            className="flex items-center gap-3 rounded-xl border border-base-200 p-3"
          >
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{cat.categoryName}</p>
              <p className="text-sm text-base-content/60">
                {formatCurrency(cat.amount)}
                <span className="ml-2 text-base-content/60">{cat.percentage.toFixed(1)}%</span>
              </p>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl bg-base-200/50 px-3 py-2 font-bold">
          <span>Jami</span>
          <span>{formatCurrency(totalCategoryAmount)}</span>
        </div>
      </div>
    </div>
  );
}
