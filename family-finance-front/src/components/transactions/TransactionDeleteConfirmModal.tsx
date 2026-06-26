import { X, Trash2 } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { formatCurrency, formatDate } from '../../config/constants';
import { renderTypeBadge } from './transactionsUtils';
import type { Transaction } from '../../types';

interface TransactionDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Storno qilinayotgan tranzaksiya. */
  transaction: Transaction | null;
  submitting: boolean;
  onConfirm: () => void;
}

/**
 * Storno (reverse) tasdiq modali — sabab izohi bilan. Original TransactionsPage'dagi
 * o'chirish modali xulqi AYNAN saqlangan.
 */
export function TransactionDeleteConfirmModal({
  isOpen,
  onClose,
  transaction,
  submitting,
  onConfirm,
}: TransactionDeleteConfirmModalProps) {
  return (
    <ModalPortal isOpen={isOpen && !!transaction} onClose={onClose}>
      {transaction && (
        <div className="w-full max-w-sm bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-error" />
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-lg font-semibold mb-2">Tranzaksiyani storno qilish</h3>
            <p className="text-sm text-base-content/60 mb-1">
              Quyidagi tranzaksiyani storno qilishni xohlaysizmi?
            </p>
            <div className="surface-soft rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                {renderTypeBadge(transaction.type)}
                <span className="font-semibold">
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              <div className="text-sm text-base-content/60 mt-1">
                {transaction.accountName} &middot;{' '}
                {formatDate(transaction.transactionDate)}
              </div>
              {transaction.description && (
                <div className="text-xs text-base-content/50 mt-1">
                  {transaction.description}
                </div>
              )}
            </div>
            <p className="text-xs text-warning/80 mb-4">
              Storno qilish teskari tranzaksiya yaratadi. Asl tranzaksiya saqlanib qoladi.
            </p>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-warning"
                onClick={onConfirm}
                disabled={submitting}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                Storno qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
}
