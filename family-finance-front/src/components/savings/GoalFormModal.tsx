import { useEffect, useState } from 'react';
import { X, Target } from 'lucide-react';
import clsx from 'clsx';
import { ModalPortal } from '../common/Modal';
import { TextInput } from '../ui/TextInput';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DateInput } from '../ui/DateInput';
import {
  GOAL_COLORS,
  GOAL_ICONS,
  emptyGoalForm,
  type GoalFormState,
} from './savingsHelpers';
import type { SavingsGoal, SavingsGoalRequest } from '../../types';

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tahrirlanayotgan maqsad (null bo'lsa — yangi maqsad). */
  goal: SavingsGoal | null;
  submitting: boolean;
  /** Form valid bo'lsa chaqiriladi; saqlash/yopish page mutation'i orqali kechadi. */
  onSubmit: (payload: SavingsGoalRequest) => void;
}

/**
 * Maqsad qo'shish/tahrirlash modali. Form holatini ichida boshqaradi; modal
 * ochilganda tahrirlanayotgan maqsad bilan to'ldiriladi (DebtFormModal naqshi).
 */
export function GoalFormModal({ isOpen, onClose, goal, submitting, onSubmit }: GoalFormModalProps) {
  const [form, setForm] = useState<GoalFormState>(emptyGoalForm);

  // Modal ochilganda formani to'ldiramiz (tahrir) yoki tozalaymiz (yangi)
  useEffect(() => {
    if (!isOpen) return;
    if (goal) {
      setForm({
        name: goal.name,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline ?? '',
        icon: goal.icon ?? '',
        color: goal.color ?? '',
      });
    } else {
      setForm(emptyGoalForm);
    }
  }, [isOpen, goal]);

  const handleSubmit = () => {
    if (!form.name.trim() || form.targetAmount <= 0) return;
    onSubmit({
      name: form.name.trim(),
      targetAmount: form.targetAmount,
      deadline: form.deadline || undefined,
      icon: form.icon || undefined,
      color: form.color || undefined,
    });
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          {/* Modal header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-semibold">
                {goal ? 'Maqsadni tahrirlash' : 'Yangi maqsad'}
              </h3>
              <p className="text-sm text-base-content/60">
                {goal ? "Ma'lumotlarni o'zgartiring" : "Jamg'arish maqsadingizni belgilang"}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name */}
            <TextInput
              label="Nomi"
              required
              value={form.name}
              onChange={(val) => setForm((prev) => ({ ...prev, name: val }))}
              placeholder="Masalan: Yangi uy uchun"
              leadingIcon={<Target className="h-5 w-5" />}
            />

            {/* Target amount */}
            <CurrencyInput
              label="Maqsad summasi *"
              value={form.targetAmount}
              onChange={(val) => setForm((prev) => ({ ...prev, targetAmount: val }))}
              showQuickButtons
            />

            {/* Deadline */}
            <DateInput
              label="Muddat (ixtiyoriy)"
              value={form.deadline}
              onChange={(val) => setForm((prev) => ({ ...prev, deadline: val }))}
              min={new Date().toISOString().slice(0, 10)}
            />

            {/* Icon picker */}
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Belgi (ixtiyoriy)
              </span>
              <div className="flex flex-wrap gap-2">
                {GOAL_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={clsx(
                      'h-10 w-10 rounded-lg flex items-center justify-center text-lg transition',
                      form.icon === icon
                        ? 'ring-2 ring-primary bg-primary/10'
                        : 'bg-base-200 hover:bg-base-300'
                    )}
                    onClick={() => setForm((prev) => ({ ...prev, icon: prev.icon === icon ? '' : icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </label>

            {/* Color picker */}
            <label className="form-control">
              <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Rang (ixtiyoriy)
              </span>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={clsx(
                      'h-8 w-8 rounded-full transition',
                      form.color === color && 'ring-2 ring-offset-2 ring-primary'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm((prev) => ({ ...prev, color: prev.color === color ? '' : color }))}
                  />
                ))}
              </div>
            </label>
          </div>

          {/* Modal footer */}
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !form.name.trim() || form.targetAmount <= 0}
            >
              {submitting && <span className="loading loading-spinner loading-sm" />}
              {goal ? 'Saqlash' : 'Yaratish'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
