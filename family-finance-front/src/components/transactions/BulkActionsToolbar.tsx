import { Trash2 } from 'lucide-react';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../common/PermissionGate';

interface BulkActionsToolbarProps {
  selectedCount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onCategorize: () => void;
  onReverse: () => void;
}

/**
 * Bulk tanlov toolbar'i: hammasini tanlash, tanlangan soni, bekor qilish hamda
 * bulk kategoriyalash / storno tugmalari. Original TransactionsPage'dagi xulq AYNAN.
 */
export function BulkActionsToolbar({
  selectedCount,
  isAllSelected,
  onToggleSelectAll,
  onClearSelection,
  onCategorize,
  onReverse,
}: BulkActionsToolbarProps) {
  return (
    <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={isAllSelected}
          onChange={onToggleSelectAll}
          aria-label="Hammasini tanlash"
        />
        <span className="text-sm font-medium">
          <span className="text-primary">{selectedCount}</span> ta tanlangan
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="btn btn-ghost btn-sm"
        >
          Bekor qilish
        </button>
      </div>
      <div className="flex items-center gap-2">
        <PermissionGate permission={PermissionCode.TRANSACTIONS_UPDATE}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCategorize}
          >
            Kategoriyalash
          </button>
        </PermissionGate>
        <PermissionGate permission={PermissionCode.TRANSACTIONS_DELETE}>
          <button
            type="button"
            className="btn btn-warning btn-sm"
            onClick={onReverse}
          >
            <Trash2 className="h-4 w-4" />
            Storno qilish
          </button>
        </PermissionGate>
      </div>
    </div>
  );
}
