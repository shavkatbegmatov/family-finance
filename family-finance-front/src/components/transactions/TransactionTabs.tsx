import {
  ArrowLeftRight,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';
import clsx from 'clsx';
import type { TabType } from '../../hooks/useTransactionsData';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'ALL', label: 'Barchasi', icon: ArrowLeftRight },
  { id: 'INCOME', label: 'Daromad', icon: TrendingUp },
  { id: 'EXPENSE', label: 'Xarajat', icon: TrendingDown },
  { id: 'TRANSFER', label: "O'tkazma", icon: ArrowRightLeft },
];

interface TransactionTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * 4 ta tab (Barchasi/Daromad/Xarajat/O'tkazma) + filtr toggle tugmasi.
 * Xulq original TransactionsPage bilan bir xil.
 */
export function TransactionTabs({
  activeTab,
  onTabChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
}: TransactionTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-base-200 p-2">
      <div className="scrollbar-hide flex flex-1 items-center gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'tap-sm flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/60 hover:bg-base-200'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter toggle */}
      <button
        className={clsx(
          'tap-sm relative grid h-9 w-9 flex-none place-items-center rounded-xl border transition-colors',
          showFilters || hasActiveFilters
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-base-200 text-base-content/60 hover:bg-base-200'
        )}
        onClick={onToggleFilters}
        aria-label="Filtr"
      >
        <Filter className="h-4 w-4" />
        {hasActiveFilters && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-base-100" />
        )}
      </button>
    </div>
  );
}
