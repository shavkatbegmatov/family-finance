import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { pointParticipantApi, pointBalanceApi } from '../api/points.api';
import { familyMembersApi } from '../api/family-members.api';
import { useActiveScopeId } from './useScopeChange';
import { getApiErrorMessage } from '../utils/apiError';
import { isReasonValid } from '../components/points/pointsParticipantsHelpers';
import type {
  PointParticipant,
  PointParticipantRequest,
  PointBalance,
} from '../types/points.types';
import type {
  FamilyMember,
  FamilyMemberRequest,
  ApiResponse,
} from '../types';
import type { InlineMemberFormState } from '../components/points/pointsParticipantsHelpers';

/**
 * PointsParticipantsPage uchun butun react-query (ishtirokchilar {@code useQuery}
 * + har isActive ishtirokchi balansi hosil qilingan {@code useQuery}) hamda
 * tanlangan ishtirokchi/link holati va barcha mutation'lar
 * (create/update/deactivate/link/unlink/inline-member).
 *
 * <p>Aktiv scope queryKey ichida (D8 migratsiyasi). queryKey'lar va
 * invalidate/onSuccess mantig'i original PointsParticipantsPage bilan AYNAN
 * bir xil:</p>
 * <ul>
 *   <li>ishtirokchilar — {@code ['point-participants', activeScopeId]}</li>
 *   <li>balanslar — {@code ['point-balances', activeScopeId, <isActive idlar>]},
 *       enabled faqat ishtirokchilar yuklangach; har isActive ishtirokchi uchun
 *       {@code pointBalanceApi.get(id)} (xato bo'lsa null), natija
 *       {@code participantId} bo'yicha map'ga yig'iladi — original mantiq AYNAN</li>
 *   <li>barcha mutation onSuccess → invalidate {@code ['point-participants']}</li>
 *   <li>inline member create → invalidate {@code ['family-members', 'list']} +
 *       yangi a'zoni dropdown'da auto-select</li>
 * </ul>
 */
export function usePointsParticipantsData() {
  const queryClient = useQueryClient();
  const activeScopeId = useActiveScopeId();

  // Tanlangan ishtirokchi (link modal) — id orqali, derived selectedParticipant
  const [linkParticipantId, setLinkParticipantId] = useState<number | null>(null);
  const [linkMemberId, setLinkMemberId] = useState<number | undefined>(undefined);

  // ==================== DATA (react-query) ====================
  // Aktiv scope queryKey'da — scope almashganda avtomatik refetch (D8 migratsiyasi).
  const {
    data: participants = [],
    isLoading: participantsLoading,
    isError: participantsError,
  } = useQuery({
    queryKey: ['point-participants', activeScopeId],
    queryFn: async (): Promise<PointParticipant[]> => {
      const res = await pointParticipantApi.getAll();
      return res.data?.data ?? res.data ?? [];
    },
  });

  useEffect(() => {
    if (participantsError) toast.error('Ishtirokchilarni yuklashda xatolik');
  }, [participantsError]);

  // Har isActive ishtirokchi balansi — original loadParticipants ichidagi
  // Promise.all mantig'i AYNAN: har biri uchun get(id) (xato bo'lsa null),
  // natija bal.participantId bo'yicha map'ga yig'iladi. Ishtirokchilar
  // yuklangach (queryKey ularning isActive id'lariga bog'liq) auto-yuklanadi.
  const activeParticipantIds = useMemo(
    () => participants.filter((p) => p.isActive).map((p) => p.id),
    [participants],
  );

  const { data: balances = {} } = useQuery({
    queryKey: ['point-balances', activeScopeId, activeParticipantIds],
    queryFn: async (): Promise<Record<number, PointBalance>> => {
      const balMap: Record<number, PointBalance> = {};
      const results = await Promise.all(
        activeParticipantIds.map((id) => pointBalanceApi.get(id).catch(() => null)),
      );
      results.forEach((r) => {
        if (r) {
          const bal: PointBalance = r.data?.data ?? r.data;
          if (bal) balMap[bal.participantId] = bal;
        }
      });
      return balMap;
    },
    enabled: activeParticipantIds.length > 0,
  });

  // Link holatidan hosil bo'lgan tanlangan ishtirokchi va transfer mantig'i
  const selectedParticipant = useMemo(
    () => participants.find((p) => p.id === linkParticipantId) ?? null,
    [participants, linkParticipantId],
  );

  const memberLinkedToAnotherParticipant = useMemo(() => {
    if (!linkMemberId || !linkParticipantId) return null;
    return (
      participants.find(
        (p) => p.familyMemberId === linkMemberId && p.id !== linkParticipantId,
      ) ?? null
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

  const linkReasonRequired = Boolean(
    memberLinkedToAnotherParticipant || participantChangingMember,
  );

  // ---------- Mutations ----------
  // Original loadParticipants() har mutation'dan keyin ishtirokchilarni VA
  // balanslarni birga qayta yuklardi — shu xulqni saqlash uchun ikkalasini
  // invalidate qilamiz (balans qiymati o'zgarmagan amallarda ham — ko'rinish AYNAN).
  const invalidateParticipants = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['point-participants'] });
    void queryClient.invalidateQueries({ queryKey: ['point-balances'] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (req: PointParticipantRequest) => pointParticipantApi.create(req),
    onSuccess: () => {
      toast.success("Ishtirokchi qo'shildi");
      invalidateParticipants();
    },
    onError: () => toast.error('Saqlashda xatolik'),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: PointParticipantRequest }) =>
      pointParticipantApi.update(vars.id, vars.req),
    onSuccess: () => {
      toast.success('Ishtirokchi yangilandi');
      invalidateParticipants();
    },
    onError: () => toast.error('Saqlashda xatolik'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => pointParticipantApi.deactivate(id),
    onSuccess: () => {
      toast.success("Ishtirokchi o'chirildi");
      invalidateParticipants();
    },
    onError: () => toast.error("O'chirishda xatolik"),
  });

  const linkMutation = useMutation({
    mutationFn: (vars: {
      id: number;
      familyMemberId: number;
      reason?: string;
      reasonRequired: boolean;
    }) =>
      pointParticipantApi.linkMember(vars.id, {
        familyMemberId: vars.familyMemberId,
        reason: vars.reason,
        forceTransfer: true,
      }),
    onSuccess: (_data, vars) => {
      // Toast original kabi linkReasonRequired (qayta-bog'lash/transfer) bo'yicha tanlanadi
      toast.success(vars.reasonRequired ? "Bog'lanish qayta yangilandi" : "Oila a'zosiga bog'landi");
      invalidateParticipants();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Bog'lashda xatolik")),
  });

  const unlinkMutation = useMutation({
    mutationFn: (vars: { id: number; reason: string }) =>
      pointParticipantApi.unlinkMember(vars.id, { reason: vars.reason }),
    onSuccess: () => {
      toast.success("Bog'lanish uzildi");
      invalidateParticipants();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Bog'lanishni uzishda xatolik")),
  });

  const inlineMemberMutation = useMutation({
    mutationFn: async (formState: InlineMemberFormState): Promise<FamilyMember> => {
      const payload: FamilyMemberRequest = {
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim() || undefined,
        gender: formState.gender || undefined,
        birthDate: formState.birthDate || undefined,
      };
      const res = await familyMembersApi.create(payload);
      return (res.data as ApiResponse<FamilyMember>).data;
    },
    onSuccess: async (created) => {
      // Dropdown qayta o'qisin (original mantiq)
      await queryClient.invalidateQueries({ queryKey: ['family-members', 'list'] });
      // Yangi a'zo avtomatik tanlanadi
      setLinkMemberId(created.id);
      toast.success(`${created.fullName} qo'shildi va tanlandi`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Oila a'zosini qo'shishda xatolik")),
  });

  return {
    // env / scope
    activeScopeId,
    // list data
    participants,
    loading: participantsLoading,
    balances,
    // link selection state
    linkParticipantId,
    setLinkParticipantId,
    linkMemberId,
    setLinkMemberId,
    selectedParticipant,
    // derived transfer logic
    memberLinkedToAnotherParticipant,
    participantChangingMember,
    selectedIsCurrentMember,
    linkReasonRequired,
    // mutations
    createMutation,
    updateMutation,
    deactivateMutation,
    linkMutation,
    unlinkMutation,
    inlineMemberMutation,
    // wizard onCreated refresh — original loadParticipants o'rnida
    invalidateParticipants,
    // helpers re-export for page-level guards (reason ≥10)
    isReasonValid,
  };
}
