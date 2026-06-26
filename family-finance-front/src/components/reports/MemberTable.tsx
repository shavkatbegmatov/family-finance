import { formatCurrency } from '../../config/constants';
import { CHART_PALETTE as COLORS } from '../../config/chartColors';
import type { MemberReport } from '../../types';

/**
 * Oila a'zolari bo'yicha tafsilot jadvali — desktop (table) + mobil (kartalar,
 * avatar dumaloq ranglari {@code CHART_PALETTE} indeks bo'yicha). Jami xarajat
 * footer'da. Tuzilma/format original ReportsPage bilan AYNAN.
 */
export function MemberTable({ members }: { members: MemberReport[] }) {
  const totalExpense = members.reduce((sum, m) => sum + m.totalExpense, 0);

  return (
    <div className="surface-card p-4 lg:p-5">
      <h2 className="mb-4 text-lg font-semibold">Oila a'zolari bo'yicha tafsilot</h2>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>A'zo ismi</th>
              <th className="text-right">Jami xarajat</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr key={member.memberId}>
                <td>{index + 1}</td>
                <td className="font-medium">{member.memberName}</td>
                <td className="text-right">{formatCurrency(member.totalExpense)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td></td>
              <td>Jami</td>
              <td className="text-right">{formatCurrency(totalExpense)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-2 sm:hidden">
        {members.map((member, index) => (
          <div
            key={member.memberId}
            className="flex items-center gap-3 rounded-xl border border-base-200 p-3"
          >
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-content"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            >
              {member.memberName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{member.memberName}</p>
              <p className="text-sm text-base-content/60">{formatCurrency(member.totalExpense)}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl bg-base-200/50 px-3 py-2 font-bold">
          <span>Jami</span>
          <span>{formatCurrency(totalExpense)}</span>
        </div>
      </div>
    </div>
  );
}
