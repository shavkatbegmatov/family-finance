import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, UserX, Link as LinkIcon, X } from 'lucide-react';
import clsx from 'clsx';
import { pointParticipantApi, pointBalanceApi } from '../../api/points.api';
import type {
  PointParticipant, PointParticipantRequest, PointBalance,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { ModalPortal } from '../../components/common/Modal';

interface ParticipantFormState {
  firstName: string;
  lastName: string;
  nickname: string;
  birthDate: string;
}

const emptyForm: ParticipantFormState = {
  firstName: '',
  lastName: '',
  nickname: '',
  birthDate: '',
};

export function PointsParticipantsPage() {
  const { canManagePoints, canViewPoints } = usePermission();

  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [balances, setBalances] = useState<Record<number, PointBalance>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<PointParticipant | null>(null);
  const [form, setForm] = useState<ParticipantFormState>(emptyForm);

  // Link member modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkParticipantId, setLinkParticipantId] = useState<number | null>(null);
  const [linkMemberId, setLinkMemberId] = useState('');

  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pointParticipantApi.getAll();
      const parts: PointParticipant[] = res.data?.data ?? res.data ?? [];
      setParticipants(parts);

      // Load balances
      const balMap: Record<number, PointBalance> = {};
      const results = await Promise.all(
        parts.filter((p) => p.isActive).map((p) =>
          pointBalanceApi.get(p.id).catch(() => null)
        )
      );
      results.forEach((r: any) => {
        if (r) {
          const bal: PointBalance = r.data?.data ?? r.data;
          if (bal) balMap[bal.participantId] = bal;
        }
      });
      setBalances(balMap);
    } catch {
      toast.error("Ishtirokchilarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const openCreateModal = () => {
    setEditingParticipant(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (p: PointParticipant) => {
    setEditingParticipant(p);
    setForm({
      firstName: p.firstName,
      lastName: p.lastName ?? '',
      nickname: p.nickname ?? '',
      birthDate: p.birthDate ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) {
      toast.error("Ism majburiy");
      return;
    }
    try {
      setSubmitting(true);
      const req: PointParticipantRequest = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
        birthDate: form.birthDate || undefined,
      };
      if (editingParticipant) {
        await pointParticipantApi.update(editingParticipant.id, req);
        toast.success("Ishtirokchi yangilandi");
      } else {
        await pointParticipantApi.create(req);
        toast.success("Ishtirokchi qo'shildi");
      }
      setShowModal(false);
      loadParticipants();
    } catch {
      toast.error("Saqlashda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("Ishtirokchini o'chirishni tasdiqlaysizmi?")) return;
    try {
      await pointParticipantApi.deactivate(id);
      toast.success("Ishtirokchi o'chirildi");
      loadParticipants();
    } catch {
      toast.error("O'chirishda xatolik");
    }
  };

  const handleLinkMember = async () => {
    if (!linkParticipantId || !linkMemberId) return;
    try {
      await pointParticipantApi.linkMember(linkParticipantId, Number(linkMemberId));
      toast.success("Oila a'zosiga bog'landi");
      setShowLinkModal(false);
      setLinkMemberId('');
      loadParticipants();
    } catch {
      toast.error("Bog'lashda xatolik");
    }
  };

  if (!canViewPoints) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-base-content/60">Sizda bu sahifani ko'rish huquqi yo'q.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ishtirokchilar</h1>
          <p className="text-base-content/60 mt-1">Ball tizimi ishtirokchilari</p>
        </div>
        {canManagePoints && (
          <button className="btn btn-primary btn-sm gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Qo'shish
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center py-16 text-base-content/50">
          Ishtirokchilar topilmadi
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((p) => {
            const bal = balances[p.id];
            return (
              <div
                key={p.id}
                className={clsx(
                  'card bg-base-100 shadow border border-base-200',
                  !p.isActive && 'opacity-50'
                )}
              >
                <div className="card-body p-4">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-12 h-12">
                        <span className="text-lg font-bold">
                          {p.firstName.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.displayName}</p>
                      {p.nickname && (
                        <p className="text-xs text-base-content/50">@{p.nickname}</p>
                      )}
                      {p.familyMemberName && (
                        <p className="text-xs text-info">{p.familyMemberName}</p>
                      )}
                    </div>
                    {!p.isActive && (
                      <span className="badge badge-error badge-xs">Nofaol</span>
                    )}
                  </div>

                  {bal && (
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                      <div className="bg-base-200/50 rounded-lg p-2">
                        <p className="text-xs text-base-content/60">Balans</p>
                        <p className="font-bold text-primary">
                          {bal.currentBalance.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-base-200/50 rounded-lg p-2">
                        <p className="text-xs text-base-content/60">Topilgan</p>
                        <p className="font-bold text-success">
                          {bal.totalEarned.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-base-200/50 rounded-lg p-2">
                        <p className="text-xs text-base-content/60">Streak</p>
                        <p className="font-bold text-warning">{bal.currentStreak}</p>
                      </div>
                    </div>
                  )}

                  {canManagePoints && p.isActive && (
                    <div className="card-actions justify-end mt-3">
                      {!p.familyMemberId && (
                        <button
                          className="btn btn-ghost btn-xs gap-1"
                          onClick={() => {
                            setLinkParticipantId(p.id);
                            setShowLinkModal(true);
                          }}
                        >
                          <LinkIcon className="h-3 w-3" />
                          Bog'lash
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-xs gap-1"
                        onClick={() => openEditModal(p)}
                      >
                        <Edit2 className="h-3 w-3" />
                        Tahrirlash
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-error gap-1"
                        onClick={() => handleDeactivate(p.id)}
                      >
                        <UserX className="h-3 w-3" />
                        O'chirish
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <ModalPortal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingParticipant ? "Ishtirokchini tahrirlash" : "Yangi ishtirokchi"}
            </h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowModal(false)}>
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
            <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <span className="loading loading-spinner loading-xs" />}
              {editingParticipant ? 'Yangilash' : "Qo'shish"}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Link Member Modal */}
      <ModalPortal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Oila a'zosiga bog'lash</h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowLinkModal(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Oila a'zosi ID raqami</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={linkMemberId}
              onChange={(e) => setLinkMemberId(e.target.value)}
              placeholder="ID kiriting"
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowLinkModal(false)}>
              Bekor qilish
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleLinkMember}>
              Bog'lash
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
