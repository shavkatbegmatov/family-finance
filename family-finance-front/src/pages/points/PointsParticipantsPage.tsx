import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Users, Sparkles } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useFamilyMemberOptions } from '../../hooks/useFamilyMemberOptions';
import { usePointsParticipantsData } from '../../hooks/usePointsParticipantsData';
import { AddPersonWizard } from '../../components/persons';
import { ParticipantCard } from '../../components/points/ParticipantCard';
import { ParticipantFormModal } from '../../components/points/ParticipantFormModal';
import { LinkMemberModal } from '../../components/points/LinkMemberModal';
import { InlineMemberModal } from '../../components/points/InlineMemberModal';
import {
  PointsEmptyState,
  PointsLoadingState,
  PointsPageShell,
  PointsPermissionState,
  PointsSectionCard,
} from '../../components/points/ui';
import type { PointParticipant, PointParticipantRequest } from '../../types/points.types';
import type { InlineMemberFormState } from '../../components/points/pointsParticipantsHelpers';
import { LINK_REASON_MIN_LENGTH } from '../../components/points/pointsParticipantsHelpers';

/**
 * Ball ishtirokchilari sahifasi (orchestrator). Ma'lumot/mutation'lar
 * {@link usePointsParticipantsData} hook'ida (react-query, D8 migratsiyasi); bu
 * komponent faqat UI holati (modal/tanlash) va kompozitsiyani boshqaradi —
 * grid (ParticipantCard) + form/link/inline modal'lar + AddPersonWizard.
 */
export function PointsParticipantsPage() {
  const { canManagePoints, canViewPoints } = usePermission();

  const {
    participants,
    loading,
    balances,
    linkParticipantId,
    setLinkParticipantId,
    linkMemberId,
    setLinkMemberId,
    selectedParticipant,
    memberLinkedToAnotherParticipant,
    selectedIsCurrentMember,
    linkReasonRequired,
    createMutation,
    updateMutation,
    deactivateMutation,
    linkMutation,
    unlinkMutation,
    inlineMemberMutation,
    invalidateParticipants,
  } = usePointsParticipantsData();

  // ---------- UI holati (modal/tanlash) ----------
  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<PointParticipant | null>(null);

  // Link member modal
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Wizard ("Yangi shaxs qo'shish")
  const [showWizard, setShowWizard] = useState(false);

  // Inline member creation (link modal ichidan)
  const [showInlineMemberModal, setShowInlineMemberModal] = useState(false);

  // Oila a'zosi dropdown opsiyalari — tanlangan ishtirokchi (yoki birinchi)ning
  // familyGroupId bo'yicha. Original mantiq AYNAN.
  const currentFamilyGroupId = selectedParticipant?.familyGroupId ?? participants[0]?.familyGroupId;
  const { options: memberOptions } = useFamilyMemberOptions({ familyGroupId: currentFamilyGroupId });

  const submitting = createMutation.isPending || updateMutation.isPending;

  // ---------- Add/Edit modal handlers ----------
  const openCreateModal = () => {
    setEditingParticipant(null);
    setShowModal(true);
  };

  const openEditModal = (p: PointParticipant) => {
    setEditingParticipant(p);
    setShowModal(true);
  };

  const handleSubmit = (payload: PointParticipantRequest) => {
    if (editingParticipant) {
      updateMutation.mutate(
        { id: editingParticipant.id, req: payload },
        { onSuccess: () => setShowModal(false) },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => setShowModal(false) });
    }
  };

  // ---------- Deactivate ----------
  const handleDeactivate = (id: number) => {
    if (!confirm("Ishtirokchini o'chirishni tasdiqlaysizmi?")) return;
    deactivateMutation.mutate(id);
  };

  // ---------- Link modal handlers ----------
  const openLinkModal = (participant: PointParticipant) => {
    setLinkParticipantId(participant.id);
    setLinkMemberId(participant.familyMemberId);
    setShowLinkModal(true);
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setLinkParticipantId(null);
    setLinkMemberId(undefined);
  };

  const handleLinkMember = (reason: string | undefined) => {
    if (!linkParticipantId || !linkMemberId) return;
    if (linkReasonRequired && (reason ?? '').trim().length < LINK_REASON_MIN_LENGTH) {
      toast.error("Qayta bog'lash uchun sabab kamida 10 belgi bo'lishi kerak");
      return;
    }
    linkMutation.mutate(
      { id: linkParticipantId, familyMemberId: linkMemberId, reason, reasonRequired: linkReasonRequired },
      { onSuccess: closeLinkModal },
    );
  };

  const handleUnlinkMember = (reason: string) => {
    if (!linkParticipantId) return;
    if (reason.trim().length < LINK_REASON_MIN_LENGTH) {
      toast.error("Bog'lanishni uzish uchun sabab kamida 10 belgi bo'lishi kerak");
      return;
    }
    unlinkMutation.mutate({ id: linkParticipantId, reason: reason.trim() }, { onSuccess: closeLinkModal });
  };

  // ---------- Inline member handlers ----------
  const handleCreateInlineMember = (form: InlineMemberFormState) => {
    if (!form.firstName.trim()) {
      toast.error('Ism majburiy');
      return;
    }
    inlineMemberMutation.mutate(form, { onSuccess: () => setShowInlineMemberModal(false) });
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-primary btn-sm gap-2"
            onClick={() => setShowWizard(true)}
            title="To'liq wizard — oila a'zosi va akkaunt bilan birga"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Yangi shaxs</span>
            <span className="sm:hidden">Wizard</span>
          </button>
          <button
            className="btn btn-ghost btn-sm gap-2"
            onClick={openCreateModal}
            title="Tezkor — faqat ball ishtirokchisi"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tezkor qo'shish</span>
            <span className="sm:hidden">Tezkor</span>
          </button>
        </div>
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
              {participants.map((p) => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  balance={balances[p.id]}
                  canManage={canManagePoints}
                  onLink={openLinkModal}
                  onEdit={openEditModal}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </div>
          )}
        </PointsSectionCard>
      )}

      {/* Add/Edit Modal */}
      <ParticipantFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        participant={editingParticipant}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      {/* Link Member Modal */}
      <LinkMemberModal
        isOpen={showLinkModal}
        onClose={closeLinkModal}
        selectedParticipant={selectedParticipant}
        linkMemberId={linkMemberId}
        onLinkMemberChange={setLinkMemberId}
        memberOptions={memberOptions}
        memberLinkedToAnotherParticipant={memberLinkedToAnotherParticipant}
        selectedIsCurrentMember={selectedIsCurrentMember}
        linkReasonRequired={linkReasonRequired}
        onLink={handleLinkMember}
        onUnlink={handleUnlinkMember}
        linkPending={linkMutation.isPending}
        unlinkPending={unlinkMutation.isPending}
        onOpenInlineMember={() => setShowInlineMemberModal(true)}
      />

      {/* "Yangi shaxs qo'shish" wizard — to'liq (User + FamilyMember + Participant) */}
      <AddPersonWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={() => invalidateParticipants()}
        defaultType="CHILD"
      />

      {/* Link modal ichidan chaqirilgan inline "Yangi a'zo" modal — minimal maydonlar bilan */}
      <InlineMemberModal
        isOpen={showInlineMemberModal}
        onClose={() => setShowInlineMemberModal(false)}
        submitting={inlineMemberMutation.isPending}
        onSubmit={handleCreateInlineMember}
      />
    </PointsPageShell>
  );
}
