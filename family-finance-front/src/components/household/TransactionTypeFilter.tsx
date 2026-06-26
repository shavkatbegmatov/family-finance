/**
 * Tranzaksiyalar tabidagi tur filtri (select) + jami soni. Original
 * TransactionsTab ichidagi filtr bloki AYNAN: barcha/INCOME/EXPENSE/TRANSFER.
 */
export function TransactionTypeFilter({
  value,
  onChange,
  totalElements,
}: {
  value: string;
  onChange: (v: string) => void;
  totalElements: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <select
        className="select select-bordered select-sm w-40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Barcha turlar</option>
        <option value="INCOME">Daromad</option>
        <option value="EXPENSE">Xarajat</option>
        <option value="TRANSFER">O'tkazma</option>
      </select>
      <span className="text-sm text-base-content/50">Jami: {totalElements}</span>
    </div>
  );
}
