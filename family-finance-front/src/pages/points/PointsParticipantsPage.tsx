import { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, UserX, Link as LinkIcon, Users, X } from 'lucide-react';
import clsx from 'clsx';
import { pointParticipantApi, pointBalanceApi } from '../../api/points.api';
import type {
  PointParticipant, PointParticipantRequest, PointBalance,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { ModalPortal } from '../../components/common/Modal';
import { ComboBox } from '../../components/ui/ComboBox';
import { useFamilyMemberOptions } from '../../hooks/useFamilyMemberOptions';
import {
  PointsEmptyState,
  PointsLoadingState,
  PointsPageShell,
  PointsPermissionState,
  PointsSectionCard,
} from '../../components/points/ui';

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
  const [linkMemberId, setLinkMemberId] = useState<number | undefined>(undefined);
  const [linkReason, setLinkReason] = useState('');
  const [unlinkReason, setUnlinkReason] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [unlinkSubmitting, setUnlinkSubmitting] = useState(false);

  const { options: memberOptions } = useFamilyMemberOptions();

  const selectedParticipant = useMemo(
    () => participants.find((p) => p.id === linkParticipantId) ?? null,
    [participants, linkParticipantId],
  );

  const memberLinkedToAnotherParticipant = useMemo(() => {
    if (!linkMemberId || !linkParticipantId) return null;
    return (
      participants.find((p) => p.familyMemberId === linkMemberId && p.id !== linkParticipantId) ?? null
    );
  }, [participants, linkMemberId, linkParticipantId]);

  const participantChangingMember = Boolean(
    selectedParticipant?.familyMemberId &&
    linkMemberId &&
    selectedParticipant.familyMemberId !== linkMemberId,
  );
  const selectedIsCurrentMember = Boolean(
    selectedParticipant?.familyMemberId &&
    linkMemberId &&
    selectedParticipant.familyMemberId === linkMemberId,
  );

  const linkReasonRequired = Boolean(memberLinkedToAnotherParticipant || participantChangingMember);
  const canSubmitLink = Boolean(
    linkParticipantId &&
    linkMemberId &&
    !selectedIsCurrentMember &&
    (!linkReasonRequired || linkReason.trim().length >= 10) &&
    !linkSubmitting,
  );

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
      results.forEach((r) => {
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
    if (linkReasonRequired && linkReason.trim().length < 10) {
      toast.error("Qayta bog'lash uchun sabab kamida 10 belgi bo'lishi kerak");
      return;
    }
    try {
      setLinkSubmitting(true);
      await pointParticipantApi.linkMember(linkParticipantId, {
        familyMemberId: linkMemberId,
        reason: linkReason.trim() || undefined,
        forceTransfer: true,
      });
      toast.success(linkReasonRequired ? "Bog'lanish qayta yangilandi" : "Oila a'zosiga bog'landi");
      closeLinkModal();
      loadParticipants();
    } catch {
      toast.error("Bog'lashda xatolik");
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleUnlinkMember = async () => {
    if (!linkParticipantId) return;
    if (unlinkReason.trim().length < 10) {
      toast.error("Bog'lanishni uzish uchun sabab kamida 10 belgi bo'lishi kerak");
      return;
    }
    try {
      setUnlinkSubmitting(true);
      await pointParticipantApi.unlinkMember(linkParticipantId, { reason: unlinkReason.trim() });
      toast.success("Bog'lanish uzildi");
      closeLinkModal();
      loadParticipants();
    } catch {
      toast.error("Bog'lanishni uzishda xatolik");
    } finally {
      setUnlinkSubmitting(false);
    }
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setLinkParticipantId(null);
    setLinkMemberId(undefined);
    setLinkReason('');
    setUnlinkReason('');
    setLinkSubmitting(false);
    setUnlinkSubmitting(false);
  };

  const openLinkModal = (participant: PointParticipant) => {
    setLinkParticipantId(participant.id);
    setLinkMemberId(participant.familyMemberId);
    setLinkReason('');
    setUnlinkReason('');
    setShowLinkModal(true);
  };

  if (!canViewPoints) {
    return <PointsPermissionState />;
  }

  return (
    <PointsPageShell
      title="Ishtirokchilar"
      description="Ball tizimiga ulangan a'zolarni boshqaring va ularning natijalarini kuzating."
      icon={Users}
      actions={canManagePoints ? (
        <button className="btn btn-primary btn-sm gap-2" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Qo'shish
        </button>
      ) : undefined}
    >
      {loading ? (
        <PointsLoadingState layout="cards" />
      ) : (
        <PointsSectionCard
          title="Ishtirokchilar ro'yxati"
          subtitle={`${participants.length} ta ishtirokchi`}
        >
          {participants.length === 0 ? (
            <PointsEmptyState
              title="Ishtirokchilar topilmadi"
              description="Yangi ishtirokchi qo'shib ball tizimini ishga tushiring."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map((p) => {
                const bal = balances[p.id];
                return (
                  <div
                    key={p.id}
                    className={clsx(
                      'points-card-hover surface-soft rounded-xl p-4',
                      !p.isActive && 'opacity-55'
                    )}
                  >
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
                        <div className="bg-base-100/85 rounded-lg p-2">
                          <p className="text-xs text-base-content/60">Balans</p>
                          <p className="font-bold text-primary">
                            {bal.currentBalance.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-base-100/85 rounded-lg p-2">
                          <p className="text-xs text-base-content/60">Topilgan</p>
                          <p className="font-bold text-success">
                            {bal.totalEarned.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-base-100/85 rounded-lg p-2">
                          <p className="text-xs text-base-content/60">Streak</p>
                          <p className="font-bold text-warning">{bal.currentStreak}</p>
                        </div>
                      </div>
                    )}

                    {canManagePoints && p.isActive && (
                      <div className="card-actions justify-end mt-3">
                        <button
                          className="btn btn-ghost btn-xs gap-1"
                          onClick={() => openLinkModal(p)}
                        >
                          <LinkIcon className="h-3 w-3" />
                          {p.familyMemberId ? "Bog'lanish" : "Bog'lash"}
                        </button>
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
                );
              })}
            </div>
          )}
        </PointsSectionCard>
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
      <ModalPortal isOpen={showLinkModal} onClose={closeLinkModal}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Oila a'zosiga bog'lash</h3>
              <p className="text-xs text-base-content/60 mt-1">
                {selectedParticipant?.displayName ?? "Ishtirokchi tanlanmagan"}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={closeLinkModal}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-base-200 bg-base-200/30 p-3 text-sm">
              {selectedParticipant?.familyMemberName ? (
                <>
                  <p className="text-base-content/60">Hozir bog'langan:</p>
                  <p className="font-medium text-info">{selectedParticipant.familyMemberName}</p>
                </>
              ) : (
                <p className="text-base-content/60">Hozircha oila a'zosiga bog'lanmagan</p>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Oila a'zosini tanlang</span>
              </label>
              <ComboBox
                value={linkMemberId}
                onChange={(val) => setLinkMemberId(val as number | undefined)}
                options={memberOptions}
                placeholder="Oila a'zosini tanlang..."
                searchPlaceholder="Ism yoki familiya bo'yicha qidiring..."
                allowClear
                size="md"
              />
              {selectedIsCurrentMember && (
                <p className="mt-1 text-xs text-base-content/60">
                  Tanlangan oila a'zosi allaqachon shu ishtirokchiga bog'langan.
                </p>
              )}
            </div>

            {memberLinkedToAnotherParticipant && (
              <div className="alert alert-warning text-sm">
                <span>
                  Tanlangan a'zo hozir <strong>{memberLinkedToAnotherParticipant.displayName}</strong> ga bog'langan.
                  Davom etsangiz bog'lanish transfer qilinadi.
                </span>
              </div>
            )}

            {linkReasonRequired && (
              <div>
                <label className="label">
                  <span className="label-text">Qayta bog'lash sababi (kamida 10 belgi) *</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={linkReason}
                  onChange={(e) => setLinkReason(e.target.value)}
                  placeholder="Nega bog'lanish o'zgartirilayotganini yozing..."
                />
                {linkReason.trim().length > 0 && linkReason.trim().length < 10 && (
                  <p className="mt-1 text-xs text-error">Kamida 10 belgi kiriting</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={closeLinkModal}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleLinkMember}
              disabled={!canSubmitLink}
            >
              {linkSubmitting && <span className="loading loading-spinner loading-xs" />}
              Bog'lash
            </button>
          </div>

          {selectedParticipant?.familyMemberId && (
            <div className="mt-5 border-t border-base-200 pt-4">
              <h4 className="text-sm font-semibold text-error">Bog'lanishni uzish</h4>
              <p className="text-xs text-base-content/60 mt-1">
                Ushbu amal audit logga yoziladi.
              </p>
              <textarea
                className="textarea textarea-bordered textarea-sm w-full mt-3"
                rows={2}
                value={unlinkReason}
                onChange={(e) => setUnlinkReason(e.target.value)}
                placeholder="Bog'lanishni uzish sababini yozing (kamida 10 belgi)"
              />
              {unlinkReason.trim().length > 0 && unlinkReason.trim().length < 10 && (
                <p className="mt-1 text-xs text-error">Kamida 10 belgi kiriting</p>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  className="btn btn-outline btn-error btn-sm"
                  onClick={handleUnlinkMember}
                  disabled={unlinkSubmitting}
                >
                  {unlinkSubmitting && <span className="loading loading-spinner loading-xs" />}
                  Bog'lanishni uzish
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalPortal>
    </PointsPageShell>
  );
}
