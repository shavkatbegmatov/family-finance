import { X } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { Select } from '../ui/Select';
import type { FinanceCategory } from '../../types';

interface BulkCategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  categories: readonly FinanceCategory[];
  categoryId: number | undefined;
  onCategoryChange: (val: number | undefined) => void;
  processing: boolean;
  onConfirm: () => void;
}

/**
 * Bulk kategoriyalash modali — kategoriya tanlash + saqlash. Original
 * TransactionsPage'dagi xulq AYNAN saqlangan.
 */
export function BulkCategorizeModal({
  isOpen,
  onClose,
  selectedCount,
  categories,
  categoryId,
  onCategoryChange,
  processing,
  onConfirm,
}: BulkCategorizeModalProps) {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold">
              {selectedCount} ta tranzaksiyaga kategoriya o'rnatish
            </h3>
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-4">
            <Select
              label="Yangi kategoriya"
              value={categoryId}
              onChange={(val) => onCategoryChange(val ? Number(val) : undefined)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Kategoriyani tanlang"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              onClick={onClose}
              disabled={processing}
            >
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={onConfirm}
              disabled={processing || !categoryId}
            >
              {processing && <span className="loading loading-spinner loading-sm" />}
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
