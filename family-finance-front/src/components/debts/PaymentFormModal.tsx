import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DateInput } from '../ui/DateInput';
import { TextArea } from '../ui/TextArea';
import { formatCurrency, getTashkentToday } from '../../config/constants';
import type { FamilyDebt, DebtPaymentRequest } from '../../types';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** To'lov qilinayotgan qarz (Qoldiq = max chegara). */
  debt: FamilyDebt | null;
  submitting: boolean;
  /** Form valid bo'lsa chaqiriladi; saqlash/yopish page mutation'i orqali kechadi. */
  onSubmit: (payload: DebtPaymentRequest) => void;
}

/**
 * To'lov form modali. Form holatini ichida boshqaradi; to'lov summasi qoldiqdan
 * oshmasligi {@code CurrencyInput} ning {@code max} chegarasi bilan ta'minlanadi.
 */
export function PaymentFormModal({ isOpen, onClose, debt, submitting, onSubmit }: PaymentFormModalProps) {
  const [form, setForm] = useState<DebtPaymentRequest>({
    amount: 0,
    paymentDate: getTashkentToday(),
    note: '',
  });

  // Modal har ochilganda formani tozalaymiz (original handleOpenPaymentModal mantig'i)
  useEffect(() => {
    if (isOpen) {
      setForm({
        amount: 0,
        paymentDate: getTashkentToday(),
        note: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!debt || form.amount <= 0) return;
    onSubmit(form);
  };

  return (
    <ModalPortal isOpen={isOpen && !!debt} onClose={onClose}>
      {debt && (
        <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">To'lov qilish</h3>
                <p className="text-sm text-base-content/60">
                  {debt.personName} - Qoldiq: {formatCurrency(debt.remainingAmount)}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <CurrencyInput
                label="To'lov summasi *"
                value={form.amount}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, amount: val }))
                }
                min={0}
                max={debt.remainingAmount}
                showQuickButtons
              />

              <DateInput
                label="To'lov sanasi"
                required
                value={form.paymentDate}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, paymentDate: val }))
                }
              />

              <TextArea
                label="Izoh"
                value={form.note || ''}
                onChange={(val) =>
                  setForm((prev) => ({ ...prev, note: val }))
                }
                placeholder="Qo'shimcha ma'lumot..."
                rows={2}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || form.amount <= 0}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                To'lash
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
}
