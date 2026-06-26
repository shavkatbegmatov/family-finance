import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalPortal } from '../common/Modal';
import { emptyForm, type ParticipantFormState } from './pointsParticipantsHelpers';
import type { PointParticipant, PointParticipantRequest } from '../../types/points.types';

interface ParticipantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tahrirlanayotgan ishtirokchi (null bo'lsa — yangi ishtirokchi). */
  participant: PointParticipant | null;
  submitting: boolean;
  /** Form valid bo'lsa chaqiriladi; saqlash/yopish page mutation'i orqali kechadi. */
  onSubmit: (payload: PointParticipantRequest) => void;
}

/**
 * Ishtirokchi qo'shish/tahrirlash modali. Form holatini ichida boshqaradi; modal
 * ochilganda tahrirlanayotgan ishtirokchi bilan to'ldiriladi (GoalFormModal naqshi).
 * Validatsiya (ism majburiy → toast) original PointsParticipantsPage bilan AYNAN.
 */
export function ParticipantFormModal({
  isOpen,
  onClose,
  participant,
  submitting,
  onSubmit,
}: ParticipantFormModalProps) {
  const [form, setForm] = useState<ParticipantFormState>(emptyForm);

  // Modal ochilganda formani to'ldiramiz (tahrir) yoki tozalaymiz (yangi)
  useEffect(() => {
    if (!isOpen) return;
    if (participant) {
      setForm({
        firstName: participant.firstName,
        lastName: participant.lastName ?? '',
        nickname: participant.nickname ?? '',
        birthDate: participant.birthDate ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, participant]);

  const handleSubmit = () => {
    if (!form.firstName.trim()) {
      toast.error('Ism majburiy');
      return;
    }
    onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      nickname: form.nickname.trim() || undefined,
      birthDate: form.birthDate || undefined,
    });
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {participant ? 'Ishtirokchini tahrirlash' : 'Yangi ishtirokchi'}
          </h3>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Ism *</span></label>
            <input
              type="text"
              className="input input-bordered"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Ism"
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Familiya</span></label>
            <input
              type="text"
              className="input input-bordered"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Familiya"
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Laqab</span></label>
            <input
              type="text"
              className="input input-bordered"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              placeholder="Laqab"
            />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Tug'ilgan sana</span></label>
            <input
              type="date"
              className="input input-bordered"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <span className="loading loading-spinner loading-xs" />}
            {participant ? 'Yangilash' : "Qo'shish"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
