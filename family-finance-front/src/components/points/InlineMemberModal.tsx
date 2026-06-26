import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import {
  emptyInlineMemberForm,
  type InlineMemberFormState,
} from './pointsParticipantsHelpers';
import type { Gender } from '../../types';

interface InlineMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  submitting: boolean;
  /** Form valid bo'lsa chaqiriladi; yaratish/auto-select page mutation'i orqali kechadi. */
  onSubmit: (form: InlineMemberFormState) => void;
}

/**
 * Link modali ichidan chaqirilgan inline "Yangi oila a'zosi" modali — minimal
 * maydonlar (ism/familiya/jinsi/sana). Yaratilgach, page mutation'i dropdown'da
 * a'zoni avtomatik tanlaydi. Original PointsParticipantsPage markup'i AYNAN.
 */
export function InlineMemberModal({ isOpen, onClose, submitting, onSubmit }: InlineMemberModalProps) {
  const [form, setForm] = useState<InlineMemberFormState>(emptyInlineMemberForm);

  // Modal har ochilganda formani tozalaymiz (original openInlineMemberModal mantig'i)
  useEffect(() => {
    if (isOpen) setForm(emptyInlineMemberForm);
  }, [isOpen]);

  const handleSubmit = () => {
    if (!form.firstName.trim()) return;
    onSubmit(form);
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Tezkor: yangi oila a'zosi</h3>
            <p className="text-xs text-base-content/60 mt-1">
              Yaratilgach, dropdown'da avtomatik tanlanadi
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="form-control">
            <label className="label py-1"><span className="label-text">Ism *</span></label>
            <input
              type="text"
              className="input input-bordered"
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              placeholder="Anvar"
              autoFocus
              maxLength={100}
            />
          </div>
          <div className="form-control">
            <label className="label py-1"><span className="label-text">Familiya</span></label>
            <input
              type="text"
              className="input input-bordered"
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              placeholder="Karimov"
              maxLength={100}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="form-control">
              <label className="label py-1"><span className="label-text">Jinsi</span></label>
              <select
                className="select select-bordered"
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as Gender | '' }))}
              >
                <option value="">Tanlang...</option>
                <option value="MALE">Erkak</option>
                <option value="FEMALE">Ayol</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label py-1"><span className="label-text">Tug'ilgan sana</span></label>
              <input
                type="date"
                className="input input-bordered"
                value={form.birthDate}
                onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={submitting}>
            Bekor qilish
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={!form.firstName.trim() || submitting}
          >
            {submitting && <span className="loading loading-spinner loading-xs" />}
            Yaratish va tanlash
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
