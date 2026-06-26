import { useEffect, useState } from 'react';
import { X, Eye } from 'lucide-react';
import { ModalPortal } from '../common/Modal';
import type { UserDetail, UpdateUserRequest } from '../../api/users.api';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDetail | null;
  onSave: (data: UpdateUserRequest) => void;
  isSaving: boolean;
}

/** Foydalanuvchini tahrirlash — form + "Apply" bilan ochiladigan solishtirish (preview) paneli. */
export function EditUserModal({ isOpen, onClose, user, onSave, isSaving }: EditUserModalProps) {
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    fullName: '',
    email: '',
    phone: '',
  });
  const [showEditPreview, setShowEditPreview] = useState(false);
  const [editPreviewData, setEditPreviewData] = useState<UpdateUserRequest | null>(null);

  // Modal ochilganda tanlangan user bilan formani to'ldiramiz (preview yopiq)
  useEffect(() => {
    if (isOpen && user) {
      setEditForm({
        fullName: user.fullName,
        email: user.email || '',
        phone: user.phone || '',
      });
      setShowEditPreview(false);
      setEditPreviewData(null);
    }
  }, [isOpen, user]);

  const handleEditApply = () => {
    setEditPreviewData({ ...editForm });
    setShowEditPreview(true);
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="modal modal-open" onClick={onClose}>
        <div
          className={`modal-box p-4 transition-all duration-300 sm:p-6 ${showEditPreview ? '!max-w-2xl' : 'max-w-md'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
          <h3 className="mb-4 text-lg font-bold">
            Foydalanuvchini tahrirlash
          </h3>

          <div className={`flex gap-4 ${showEditPreview ? 'flex-row' : 'flex-col'}`}>
            {/* Form fields */}
            <div className={showEditPreview ? 'w-1/2' : 'w-full'}>
              <div className="space-y-3">
                <div>
                  <label className="label">
                    <span className="label-text">To'liq ism *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered input-sm w-full"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Telefon</span>
                  </label>
                  <input
                    type="tel"
                    className="input input-bordered input-sm w-full"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Preview panel */}
            {showEditPreview && editPreviewData && user && (
              <div className="w-1/2 border-l border-base-200 pl-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                    Solishtirish
                  </span>
                  <button
                    className="btn btn-ghost btn-xs btn-square"
                    onClick={() => setShowEditPreview(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Username (o'zgarmaydi) */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-200/50">
                  <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(editPreviewData.fullName || user.fullName).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-mono text-base-content/60">@{user.username}</span>
                </div>

                {/* Diff table */}
                <div className="rounded-xl border border-base-200 bg-base-100 overflow-hidden text-sm">
                  {/* Headers */}
                  <div className="grid grid-cols-2 border-b border-base-200">
                    <div className="px-3 py-1.5 bg-error/10 text-center">
                      <span className="text-xs font-semibold text-error/80 uppercase tracking-wide">Eski</span>
                    </div>
                    <div className="px-3 py-1.5 bg-success/10 text-center border-l border-base-200">
                      <span className="text-xs font-semibold text-success/80 uppercase tracking-wide">Yangi</span>
                    </div>
                  </div>

                  {[
                    { label: 'Ism', old: user.fullName, new: editPreviewData.fullName || '' },
                    { label: 'Email', old: user.email || '-', new: editPreviewData.email || '-' },
                    { label: 'Telefon', old: user.phone || '-', new: editPreviewData.phone || '-' },
                  ].map(({ label, old: oldVal, new: newVal }) => {
                    const changed = oldVal !== newVal;
                    return (
                      <div
                        key={label}
                        className={`grid grid-cols-2 border-b border-base-200 last:border-0 ${changed ? 'bg-warning/5' : ''}`}
                      >
                        <div className={`px-3 py-2 ${changed ? 'bg-error/5' : ''}`}>
                          <p className="text-xs text-base-content/60 mb-0.5">{label}</p>
                          <p className={`truncate ${changed ? 'line-through text-base-content/60' : ''}`}>{oldVal}</p>
                        </div>
                        <div className={`px-3 py-2 border-l border-base-200 ${changed ? 'bg-success/5' : ''}`}>
                          <p className="text-xs text-base-content/60 mb-0.5">{label}</p>
                          <p className={`truncate ${changed ? 'font-medium text-success' : ''}`}>{newVal}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {user.rolesText && (
                  <div className="flex flex-wrap gap-1">
                    {user.rolesText.split(', ').map((role) => (
                      <span key={role} className="badge badge-primary badge-sm">{role}</span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-base-content/60 text-center">
                  Bu faqat ko'rinish - hali saqlanmagan
                </p>
              </div>
            )}
          </div>

          <div className="modal-action">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Bekor qilish
            </button>
            <button
              className="btn btn-outline btn-secondary btn-sm hidden sm:inline-flex"
              onClick={handleEditApply}
              disabled={!editForm.fullName.trim()}
            >
              <Eye className="h-3.5 w-3.5" />
              Apply
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onSave(editForm)}
              disabled={!editForm.fullName.trim() || isSaving}
            >
              {isSaving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : null}
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
