import { X, Search } from 'lucide-react';
import { Select } from '../ui/Select';
import { FilterSheet } from '../common/FilterSheet';
import { DateRangePicker, type DateRangePreset, type DateRange } from '../common/DateRangePicker';
import type { Account, FinanceCategory, FamilyMember } from '../../types';

interface TransactionsFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  /** Har bir filtr o'zgarganda desktop sahifani 0 ga qaytarish uchun. */
  onPageReset: () => void;
  // search
  filterSearch: string;
  setFilterSearch: (val: string) => void;
  // date range
  datePreset: DateRangePreset;
  customDateRange: DateRange;
  setDatePreset: (preset: DateRangePreset) => void;
  setCustomDateRange: (range: DateRange) => void;
  // selects
  filterAccountId: number | undefined;
  setFilterAccountId: (val: number | undefined) => void;
  filterCategoryId: number | undefined;
  setFilterCategoryId: (val: number | undefined) => void;
  filterMemberId: number | undefined;
  setFilterMemberId: (val: number | undefined) => void;
  // reference data
  accounts: readonly Account[];
  categories: readonly FinanceCategory[];
  members: readonly FamilyMember[];
}

/**
 * Tranzaksiyalar filtri: qidiruv / davr / hisob / kategoriya / a'zo.
 * Har bir o'zgarishda {@code onPageReset} chaqiriladi — original xulq AYNAN.
 */
export function TransactionsFilter({
  isOpen,
  onClose,
  onClear,
  hasActiveFilters,
  onPageReset,
  filterSearch,
  setFilterSearch,
  datePreset,
  customDateRange,
  setDatePreset,
  setCustomDateRange,
  filterAccountId,
  setFilterAccountId,
  filterCategoryId,
  setFilterCategoryId,
  filterMemberId,
  setFilterMemberId,
  accounts,
  categories,
  members,
}: TransactionsFilterProps) {
  return (
    <FilterSheet
      isOpen={isOpen}
      onClose={onClose}
      onClear={onClear}
      hasActiveFilters={hasActiveFilters}
    >
      {/* Text search */}
      <div className="flex flex-col gap-1.5 lg:w-64">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          Qidiruv
        </span>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40 pointer-events-none" />
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => {
              setFilterSearch(e.target.value);
              onPageReset();
            }}
            placeholder="Tavsif bo'yicha..."
            className="input input-bordered w-full pl-10 pr-9 h-12"
            maxLength={100}
          />
          {filterSearch && (
            <button
              type="button"
              onClick={() => {
                setFilterSearch('');
                onPageReset();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-square"
              aria-label="Qidiruvni tozalash"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Date range picker */}
      <div className="flex flex-col gap-1.5 lg:w-64">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          Davr
        </span>
        <DateRangePicker
          value={datePreset}
          customRange={customDateRange}
          onChange={(preset, range) => {
            setDatePreset(preset);
            if (range) setCustomDateRange(range);
            onPageReset();
          }}
        />
      </div>

      {/* Account filter */}
      <Select
        value={filterAccountId}
        onChange={(val) => {
          setFilterAccountId(val ? Number(val) : undefined);
          onPageReset();
        }}
        options={[
          { value: '', label: 'Barcha hisoblar' },
          ...accounts.map((a) => ({ value: a.id, label: a.name })),
        ]}
        placeholder="Barcha hisoblar"
        className="lg:w-44"
      />

      {/* Category filter */}
      <Select
        value={filterCategoryId}
        onChange={(val) => {
          setFilterCategoryId(val ? Number(val) : undefined);
          onPageReset();
        }}
        options={[
          { value: '', label: 'Barcha kategoriyalar' },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
        placeholder="Barcha kategoriyalar"
        className="lg:w-44"
      />

      {/* Member filter */}
      <Select
        value={filterMemberId}
        onChange={(val) => {
          setFilterMemberId(val ? Number(val) : undefined);
          onPageReset();
        }}
        options={[
          { value: '', label: "Barcha a'zolar" },
          ...members.map((m) => ({ value: m.id, label: m.fullName })),
        ]}
        placeholder="Barcha a'zolar"
        className="lg:w-44"
      />
    </FilterSheet>
  );
}
