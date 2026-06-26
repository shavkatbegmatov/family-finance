import clsx from 'clsx';
import { SearchInput } from '../ui/SearchInput';
import { CapabilityFilterChips } from '../persons';
import type { CapabilityFilter, CapabilityCounts } from '../persons';

interface FamilyMembersToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  totalElements: number;
  page: number;
  setPage: (updater: (p: number) => number) => void;
  pageSize: number;
  pageSizeMode: 'auto' | number;
  setPageSizeMode: (mode: 'auto' | number) => void;
  autoPageSize: number;
  capFilter: CapabilityFilter;
  onCapFilterChange: (value: CapabilityFilter) => void;
  capCounts: CapabilityCounts;
}

/**
 * Ro'yxat ko'rinishi toolbar'i: qidiruv + jami + sahifa o'lchami tanlagich +
 * pagination + capability filter chiplari.
 */
export function FamilyMembersToolbar({
  searchQuery,
  onSearchChange,
  loading,
  totalElements,
  page,
  setPage,
  pageSize,
  pageSizeMode,
  setPageSizeMode,
  autoPageSize,
  capFilter,
  onCapFilterChange,
  capCounts,
}: FamilyMembersToolbarProps) {
  return (
    <>
      {/* Search + Pagination toolbar */}
      <div className="surface-card p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <SearchInput
          value={searchQuery}
          onValueChange={(val) => {
            onSearchChange(val);
            setPage(() => 0);
          }}
          placeholder="Ism, familiya yoki telefon bo'yicha qidirish..."
          hideLabel
          ariaLabel="Qidirish"
          className="flex-1 min-w-0"
        />

        {/* Right side controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Total count */}
          {!loading && (
            <span className="text-sm text-base-content/60 whitespace-nowrap">
              Jami: <strong className="text-base-content/70">{totalElements}</strong> ta
            </span>
          )}

          {/* Separator */}
          <div className="h-5 w-px bg-base-300" />

          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-base-content/60 whitespace-nowrap">Ko'rsatish:</span>
            <div className="flex gap-0.5 bg-base-200 rounded-lg p-0.5">
              {(['auto', 10, 20, 50, 100] as const).map((size) => (
                <button
                  key={size}
                  className={clsx(
                    'btn btn-sm min-w-[2.5rem]',
                    pageSizeMode === size ? 'btn-primary' : 'btn-ghost'
                  )}
                  onClick={() => {
                    setPageSizeMode(size);
                    setPage(() => 0);
                  }}
                >
                  {size === 'auto' ? (
                    <span className="flex items-center gap-0.5">
                      Auto
                      {pageSizeMode === 'auto' && (
                        <span className="opacity-60">({autoPageSize})</span>
                      )}
                    </span>
                  ) : (
                    size
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          {totalElements > pageSize && <div className="h-5 w-px bg-base-300" />}

          {/* Pagination controls */}
          {totalElements > pageSize && (
            <div className="flex items-center gap-1">
              <button
                className="btn btn-sm btn-ghost"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              <span className="text-xs text-base-content/50 px-1 whitespace-nowrap">
                {page + 1} / {Math.ceil(totalElements / pageSize)}
              </span>
              <button
                className="btn btn-sm btn-ghost"
                disabled={(page + 1) * pageSize >= totalElements}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Capability filter chips — joriy sahifa ichida filtrlash */}
      <CapabilityFilterChips
        value={capFilter}
        onChange={onCapFilterChange}
        counts={capCounts}
      />
    </>
  );
}
