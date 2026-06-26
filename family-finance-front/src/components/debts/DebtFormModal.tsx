import { useEffect, useState } from 'react';
import { X, User } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import { TextInput } from '../ui/TextInput';
import { PhoneInput } from '../ui/PhoneInput';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DateInput } from '../ui/DateInput';
import { TextArea } from '../ui/TextArea';
import { Select } from '../ui/Select';
import { getTashkentToday, FAMILY_DEBT_TYPES } from '../../config/constants';
import type { FamilyDebt, FamilyDebtRequest, DebtType } from '../../types';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tahrirlanayotgan qarz (null bo'lsa — yangi qarz). */
  debt: FamilyDebt | null;
  submitting: boolean;
  /** Form valid bo'lsa chaqiriladi; saqlash/yopish page mutation'i orqali kechadi. */
  onSubmit: (payload: FamilyDebtRequest) => void;
}

const EMPTY_FORM: FamilyDebtRequest = {
  type: 'GIVEN',
  personName: '',
  personPhone: '',
  amount: 0,
  dueDate: '',
  description: '',
};

/**
 * Qarz qo'shish/tahrirlash modali. Form holatini ichida boshqaradi; modal
 * ochilganda tahrirlanayotgan qarz bilan to'ldiriladi (FamilyMemberModal naqshi).
 */
export function DebtFormModal({ isOpen, onClose, debt, submitting, onSubmit }: DebtFormModalProps) {
  const [form, setForm] = useState<FamilyDebtRequest>(EMPTY_FORM);

  // Modal ochilganda formani to'ldiramiz (tahrir) yoki tozalaymiz (yangi)
  useEffect(() => {
    if (!isOpen) return;
    if (debt) {
      setForm({
        type: debt.type,
        personName: debt.personName,
        personPhone: debt.personPhone || '',
        amount: debt.amount,
        dueDate: debt.dueDate || '',
        description: debt.description || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, debt]);

  const handleSubmit = () => {
    if (!form.personName.trim() || form.amount <= 0) return;
    onSubmit(form);
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">
                {debt ? 'Qarzni tahrirlash' : 'Yangi qarz'}
              </h3>
              <p className="text-sm text-base-content/60">
                {debt ? 'Qarz ma\'lumotlarini yangilang' : 'Yangi qarz yozuvini kiriting'}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {/* Type */}
            <Select
              label="Qarz turi"
              required
              value={form.type}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, type: (val as DebtType) || 'GIVEN' }))
              }
              options={Object.entries(FAMILY_DEBT_TYPES).map(([key, { label }]) => ({
                value: key,
                label,
              }))}
              placeholder="Turni tanlang"
            />

            {/* Person Name */}
            <TextInput
              label="Shaxs ismi"
              required
              value={form.personName}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, personName: val }))
              }
              placeholder="To'liq ism"
              leadingIcon={<User className="h-5 w-5" />}
            />

            {/* Person Phone */}
            <PhoneInput
              label="Telefon raqami"
              value={form.personPhone || ''}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, personPhone: val }))
              }
            />

            {/* Amount */}
            <CurrencyInput
              label="Summa *"
              value={form.amount}
              onChange={(val) => setForm((prev) => ({ ...prev, amount: val }))}
              min={0}
            />

            {/* Due Date */}
            <DateInput
              label="Muddat"
              value={form.dueDate || ''}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, dueDate: val }))
              }
              min={getTashkentToday()}
            />

            {/* Description */}
            <TextArea
              label="Tavsif"
              value={form.description || ''}
              onChange={(val) =>
                setForm((prev) => ({ ...prev, description: val }))
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
              disabled={submitting || !form.personName.trim() || form.amount <= 0}
            >
              {submitting && <span className="loading loading-spinner loading-sm" />}
              {debt ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
