import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DateInput } from '../ui/DateInput';
import { TextArea } from '../ui/TextArea';
import { createEmptyContribForm, type ContributionFormState } from './savingsHelpers';
import type { GoalContributionRequest } from '../../types';

interface ContributionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Hissa qo'shilayotgan maqsad nomi (sarlavha osti uchun). */
  goalName: string;
  submitting: boolean;
  /** Form valid bo'lsa chaqiriladi; saqlash/yopish page mutation'i orqali kechadi. */
  onSubmit: (payload: GoalContributionRequest) => void;
}

/**
 * Maqsadga pul (hissa) qo'shish modali. Form holatini ichida boshqaradi; modal
 * ochilganda boshlang'ich holatga tozalanadi (DebtFormModal naqshi).
 */
export function ContributionFormModal({
  isOpen,
  onClose,
  goalName,
  submitting,
  onSubmit,
}: ContributionFormModalProps) {
  const [form, setForm] = useState<ContributionFormState>(createEmptyContribForm);

  // Modal ochilganda formani boshlang'ich holatga tozalaymiz (sana — bugun)
  useEffect(() => {
    if (isOpen) setForm(createEmptyContribForm());
  }, [isOpen]);

  const handleSubmit = () => {
    if (form.amount <= 0) return;
    onSubmit({
      amount: form.amount,
      contributionDate: form.contributionDate,
      note: form.note || undefined,
    });
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Modal header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-semibold">Pul qo'shish</h3>
              <p className="text-sm text-base-content/60">
                {goalName} ga pul qo'shish
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Amount */}
            <CurrencyInput
              label="Summa *"
              value={form.amount}
              onChange={(val) => setForm((prev) => ({ ...prev, amount: val }))}
              showQuickButtons
            />

            {/* Date */}
            <DateInput
              label="Sana"
              required
              value={form.contributionDate}
              onChange={(val) => setForm((prev) => ({ ...prev, contributionDate: val }))}
            />

            {/* Note */}
            <TextArea
              label="Izoh (ixtiyoriy)"
              value={form.note}
              onChange={(val) => setForm((prev) => ({ ...prev, note: val }))}
              placeholder="Qo'shimcha ma'lumot..."
              rows={2}
            />
          </div>

          {/* Modal footer */}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || form.amount <= 0}
            >
              {submitting && <span className="loading loading-spinner loading-sm" />}
              Qo'shish
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
