import { X, Phone, Calendar, CreditCard, HandMetal } from 'lucide-react';
import clsx from 'clsx';
import { ModalPortal } from '../common/Modal';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../common/PermissionGate';
import { formatCurrency, formatDate, FAMILY_DEBT_TYPES } from '../../config/constants';
import type { FamilyDebt, DebtPayment } from '../../types';

interface DebtDetailBodyProps {
  debt: FamilyDebt;
  payments: DebtPayment[];
  loadingPayments: boolean;
  onClose: () => void;
  onPay: () => void;
}

/**
 * Detail panel ichki kontenti — desktop inline panel va mobil modal'da qayta
 * ishlatiladi. Tanlangan qarz tafsilotlari, progress, to'lov tugmasi va
 * to'lovlar tarixi.
 */
function DebtDetailBody({ debt, payments, loadingPayments, onClose, onPay }: DebtDetailBodyProps) {
  const paidPercentage = Math.min(Math.round((debt.paidAmount / debt.amount) * 100), 100);

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{debt.personName}</h3>
          <span
            className={clsx(
              'badge badge-sm mt-1',
              debt.type === 'GIVEN' ? 'badge-info' : 'badge-warning'
            )}
          >
            {FAMILY_DEBT_TYPES[debt.type]?.label}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-sm btn-circle"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="surface-soft rounded-lg p-3">
          <p className="text-xs text-base-content/60">Asosiy summa</p>
          <p className="font-semibold">{formatCurrency(debt.amount)}</p>
        </div>
        <div className="surface-soft rounded-lg p-3">
          <p className="text-xs text-base-content/60">To'langan</p>
          <p className="font-semibold text-success">
            {formatCurrency(debt.paidAmount)}
          </p>
        </div>
        <div className="surface-soft rounded-lg p-3 col-span-2">
          <p className="text-xs text-base-content/60">Qoldiq</p>
          <p className="text-xl font-bold text-error">
            {formatCurrency(debt.remainingAmount)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-base-content/60">To'langan</span>
          <span className="font-semibold">{paidPercentage}%</span>
        </div>
        <progress
          className="progress progress-success w-full"
          value={paidPercentage}
          max={100}
        />
      </div>

      {debt.dueDate && (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-base-content/50" />
          <span>Muddat: {formatDate(debt.dueDate)}</span>
          {debt.isOverdue && (
            <span className="badge badge-error badge-sm">O'tgan</span>
          )}
        </div>
      )}

      {debt.personPhone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-base-content/50" />
          <span>{debt.personPhone}</span>
        </div>
      )}

      {debt.description && (
        <div className="text-sm text-base-content/70 border-t border-base-200 pt-3">
          {debt.description}
        </div>
      )}

      {debt.status !== 'PAID' && (
        <PermissionGate permission={PermissionCode.DEBTS_PAY}>
          <button
            className="btn btn-primary w-full"
            onClick={onPay}
          >
            <CreditCard className="h-4 w-4" />
            To'lov qilish
          </button>
        </PermissionGate>
      )}

      {/* Payment History */}
      <div className="border-t border-base-200 pt-4">
        <h4 className="text-sm font-semibold mb-3">To'lovlar tarixi</h4>
        {loadingPayments ? (
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-base-content/50 text-center py-4">
            To'lovlar yo'q
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="surface-soft rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-success">
                    +{formatCurrency(payment.amount)}
                  </span>
                  <span className="text-xs text-base-content/60">
                    {formatDate(payment.paymentDate)}
                  </span>
                </div>
                {payment.note && (
                  <div className="text-xs text-base-content/70 mt-1">
                    {payment.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

interface DebtDetailPanelProps {
  selectedDebt: FamilyDebt | null;
  payments: DebtPayment[];
  loadingPayments: boolean;
  onClose: () => void;
  onPay: () => void;
}

/**
 * Desktop inline detail panel — tanlangan qarz bo'lsa sticky panel, aks holda
 * "qarz tanlang" bo'sh holati.
 */
export function DebtDetailPanel({ selectedDebt, payments, loadingPayments, onClose, onPay }: DebtDetailPanelProps) {
  return (
    <div className="lg:col-span-1">
      {selectedDebt ? (
        <div className="surface-card sticky top-4 space-y-4 p-4">
          <DebtDetailBody
            debt={selectedDebt}
            payments={payments}
            loadingPayments={loadingPayments}
            onClose={onClose}
            onPay={onPay}
          />
        </div>
      ) : (
        <div className="surface-card p-8 text-center text-base-content/50">
          <HandMetal className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Batafsil ko'rish uchun qarzni tanlang</p>
        </div>
      )}
    </div>
  );
}

/**
 * Mobil: qarz tafsilotlari pastki varaq (modal). Faqat tanlangan qarz bo'lsa
 * ochiladi.
 */
export function DebtDetailModal({ selectedDebt, payments, loadingPayments, onClose, onPay }: DebtDetailPanelProps) {
  return (
    <ModalPortal isOpen={!!selectedDebt} onClose={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-base-100 shadow-2xl">
        <div className="max-h-[85vh] space-y-4 overflow-y-auto p-4">
          {selectedDebt && (
            <DebtDetailBody
              debt={selectedDebt}
              payments={payments}
              loadingPayments={loadingPayments}
              onClose={onClose}
              onPay={onPay}
            />
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
