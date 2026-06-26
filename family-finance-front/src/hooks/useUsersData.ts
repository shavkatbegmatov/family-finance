import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users as UsersIcon, Trophy } from 'lucide-react';
import { usersApi } from '../api/users.api';
import { rolesApi } from '../api/roles.api';
import { familyMembersApi } from '../api/family-members.api';
import { pointParticipantApi } from '../api/points.api';
import { PermissionCode, usePermission } from './usePermission';
import { getApiErrorMessage, toastApiError } from '../utils/apiError';
import type { Suggestion } from '../components/persons';
import type { CredentialsInfo, Role, FamilyMember } from '../types';
import type {
  UserDetail,
  UpdateUserRequest,
  ChangeUsernameRequest,
} from '../api/users.api';

export type UsersModalType =
  | 'view'
  | 'edit'
  | 'password'
  | 'roles'
  | 'username'
  | 'family-link'
  | null;

const PAGE_SIZE = 20;

interface UseUsersDataArgs {
  /** Joriy ochiq modal turi — query enabled bayroqlari uchun kerak. */
  modalType: UsersModalType;
  /** Tanlangan foydalanuvchi — user-detail query va invalidation kalitlari uchun. */
  selectedUser: UserDetail | null;
  /** Family-link modalida tanlangan oila a'zosi IDsi (transfer mantig'i uchun). */
  selectedFamilyMemberId: number | null;
  /** Family-link transfer sababi (textarea qiymati). */
  familyLinkReason: string;
  /** Family-link qidiruv kalit so'zi. */
  familySearch: string;
  /** Modal yopish — mutation onSuccess ichida chaqiriladi. */
  closeModal: () => void;
}

/**
 * UsersPage uchun butun react-query (4 query + 9 mutation), qidiruv/filtr/pagination
 * holati, hosila qiymatlar (rollar, oila a'zolari ro'yxati, family-link transfer mantig'i)
 * va barcha mutation handler'lari.
 *
 * <p>queryKey'lar va onSuccess/invalidate mantig'i original UsersPage bilan AYNAN bir xil.</p>
 */
export function useUsersData({
  modalType,
  selectedUser,
  selectedFamilyMemberId,
  familyLinkReason,
  familySearch,
  closeModal,
}: UseUsersDataArgs) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermission();
  const canManagePoints = hasPermission(PermissionCode.POINTS_MANAGE);

  // Search & filter state
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = PAGE_SIZE;

  // ========================
  // Queries
  // ========================

  const activeParam = activeFilter === 'all' ? undefined : activeFilter === 'active';

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ['users', search, activeFilter, page],
    queryFn: () =>
      usersApi.search({ search: search || undefined, active: activeParam, page, size: pageSize }),
  });

  /** Joriy sahifadagi userlar bo'yicha capability bo'shliqlari — banner uchun. */
  const userSuggestions = useMemo<Suggestion[]>(() => {
    if (!usersPage?.content) return [];
    const active = usersPage.content.filter((u) => u.active);
    const withoutFamily = active.filter((u) => !u.linkedFamilyMemberId).length;
    const withoutPoints = active.filter((u) => u.linkedFamilyMemberId && !u.pointParticipantId).length;

    const list: Suggestion[] = [];
    if (withoutFamily > 0) {
      list.push({
        key: 'users-without-family',
        icon: UsersIcon,
        tone: 'warning',
        title: `${withoutFamily} ta foydalanuvchi oila a'zosiga bog'lanmagan`,
        description: 'Bog\'lash uchun ism yonidagi xira "👥+" belgini bosing — oila a\'zolari ro\'yxati ochiladi.',
      });
    }
    if (withoutPoints > 0 && canManagePoints) {
      list.push({
        key: 'users-without-points',
        icon: Trophy,
        tone: 'info',
        title: `${withoutPoints} ta foydalanuvchi ball tizimida emas`,
        description: 'Ishtirokchi sifatida qo\'shish uchun ism yonidagi xira "🏆+" belgini bosing.',
      });
    }
    return list;
  }, [usersPage, canManagePoints]);

  const { data: userDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['user-detail', selectedUser?.id],
    queryFn: () => usersApi.getById(selectedUser!.id),
    enabled: !!selectedUser && (modalType === 'view' || modalType === 'roles'),
  });

  const { data: allRoles } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => rolesApi.getAll(),
    enabled: modalType === 'roles',
  });

  const { data: familyMembersData, isLoading: isLoadingFamilyMembers } = useQuery({
    queryKey: ['family-members-link-candidates'],
    queryFn: () => familyMembersApi.getList(),
    enabled: modalType === 'family-link',
  });

  // ========================
  // Modal-local data state (mutationlar boshqaradi)
  // ========================

  // Password reset natijasi (credentials) — resetPasswordMutation to'ldiradi
  const [credentials, setCredentials] = useState<CredentialsInfo | null>(null);
  // Rol modalida tanlangan yangi rol
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // Parol modali yopilsa/boshqa modal ochilsa — eski credentials'ni tozalaymiz
  // (original UsersPage'da openModal/closeModal har doim setCredentials(null) qilardi).
  useEffect(() => {
    if (modalType !== 'password') {
      setCredentials(null);
    }
  }, [modalType]);

  // ========================
  // Mutations
  // ========================

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foydalanuvchi yangilandi');
      closeModal();
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: usersApi.resetPassword,
    onSuccess: (data) => {
      setCredentials(data);

      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  const activateMutation = useMutation({
    mutationFn: usersApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foydalanuvchi aktivlashtirildi');
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Foydalanuvchi o'chirildi");
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: number; userId: number }) =>
      rolesApi.assignToUser(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rol biriktirildi');
      setSelectedRoleId(null);
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: number; userId: number }) =>
      rolesApi.removeFromUser(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rol olib tashlandi');
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  const changeUsernameMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ChangeUsernameRequest }) =>
      usersApi.changeUsername(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Username o'zgartirildi. Foydalanuvchi qayta kirishi kerak.");
      closeModal();
    },
    onError: (error) => toastApiError(error, 'Xato yuz berdi'),
  });

  const linkFamilyMemberMutation = useMutation({
    mutationFn: ({ id, familyMemberId, reason }: { id: number; familyMemberId: number; reason?: string }) =>
      usersApi.linkFamilyMember(id, { familyMemberId, reason, forceTransfer: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      queryClient.invalidateQueries({ queryKey: ['family-members-link-candidates'] });
      toast.success("Bog'lanish muvaffaqiyatli yangilandi");
      closeModal();
    },
    onError: (error) => toastApiError(error, 'Bog\'lashda xatolik yuz berdi'),
  });

  const unlinkFamilyMemberMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      usersApi.unlinkFamilyMember(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail', selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
      queryClient.invalidateQueries({ queryKey: ['familyTree'] });
      queryClient.invalidateQueries({ queryKey: ['family-members-link-candidates'] });
      toast.success("Bog'lanish uzildi");
      closeModal();
    },
    onError: (error) => toastApiError(error, 'Bog\'lanishni uzishda xatolik yuz berdi'),
  });

  /**
   * Tezkor amal: foydalanuvchining oila a'zosini ball tizimiga qo'shish.
   * Faqat user.linkedFamilyMemberId bo'lganda mavjud.
   * Ism sifatida user.fullName ishlatiladi; admin keyinroq ishtirokchi sahifasida tahrirlashi mumkin.
   */
  const quickAddParticipantMutation = useMutation({
    mutationFn: (targetUser: UserDetail) =>
      pointParticipantApi.create({
        firstName: targetUser.fullName,
        familyMemberId: targetUser.linkedFamilyMemberId!,
      }),
    onSuccess: (_data, targetUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`${targetUser.fullName} ball tizimiga qo'shildi`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Ball tizimiga qo'shishda xatolik")),
  });

  // ========================
  // Handlers
  // ========================

  const handleUpdate = (data: UpdateUserRequest) => {
    if (!selectedUser) return;
    updateMutation.mutate({ id: selectedUser.id, data });
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    resetPasswordMutation.mutate(selectedUser.id);
  };

  const handleChangeUsername = (newUsername: string) => {
    if (!selectedUser) return;
    changeUsernameMutation.mutate({
      id: selectedUser.id,
      data: { newUsername },
    });
  };

  const handleToggleActive = (user: UserDetail) => {
    if (user.active) {
      deactivateMutation.mutate(user.id);
    } else {
      activateMutation.mutate(user.id);
    }
  };

  const handleLinkFamilyMember = () => {
    if (!selectedUser || !selectedFamilyMemberId) return;

    linkFamilyMemberMutation.mutate({
      id: selectedUser.id,
      familyMemberId: selectedFamilyMemberId,
      reason: familyLinkReason.trim() || undefined,
    });
  };

  const handleUnlinkFamilyMember = (familyUnlinkReason: string) => {
    if (!selectedUser) return;

    const reason = familyUnlinkReason.trim();
    if (reason.length < 10) {
      toast.error("Bog'lanishni uzish uchun kamida 10 belgilik sabab kiriting");
      return;
    }

    unlinkFamilyMemberMutation.mutate({
      id: selectedUser.id,
      reason,
    });
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    usersApi.export.exportData(format, {
      search: search || undefined,
      active: activeParam,
    });
  };

  // ========================
  // Derived values
  // ========================

  // Pagination
  const totalPages = usersPage?.totalPages || 0;

  // Available roles for assignment (exclude already assigned)
  const assignedRoleCodes = new Set(userDetails?.roleDetails?.map((r) => r.code) || []);
  const availableRoles = (allRoles || []).filter((r: Role) => !assignedRoleCodes.has(r.code) && r.isActive);

  const familyMembers = ((familyMembersData?.data?.data ?? []) as FamilyMember[])
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const filteredFamilyMembers = familyMembers.filter((member) => {
    const keyword = familySearch.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return (
      member.fullName.toLowerCase().includes(keyword) ||
      member.firstName.toLowerCase().includes(keyword) ||
      (member.lastName ?? '').toLowerCase().includes(keyword)
    );
  });

  const selectedFamilyMember = familyMembers.find((member) => member.id === selectedFamilyMemberId);
  const selectedIsCurrentMember = Boolean(
    selectedUser?.linkedFamilyMemberId &&
    selectedFamilyMemberId &&
    selectedUser.linkedFamilyMemberId === selectedFamilyMemberId
  );
  const targetLinkedToAnotherUser = Boolean(
    selectedFamilyMember?.userId &&
    selectedFamilyMember.userId !== selectedUser?.id
  );
  const willTransfer =
    Boolean(selectedUser?.linkedFamilyMemberId && !selectedIsCurrentMember && selectedFamilyMemberId) ||
    targetLinkedToAnotherUser;
  const linkReasonRequired = willTransfer;
  const linkReason = familyLinkReason.trim();
  const isLinkReasonValid = !linkReasonRequired || linkReason.length >= 10;
  const canSubmitLink = Boolean(
    selectedUser &&
    selectedFamilyMemberId &&
    !selectedIsCurrentMember &&
    isLinkReasonValid &&
    !linkFamilyMemberMutation.isPending
  );

  return {
    // capability
    canManagePoints,
    // search/filter/pagination state
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    pageSize,
    // queries
    usersPage,
    isLoading,
    userSuggestions,
    userDetails,
    isLoadingDetails,
    allRoles,
    isLoadingFamilyMembers,
    // password-reset credentials (mutation natija)
    credentials,
    // role modal selection
    selectedRoleId,
    setSelectedRoleId,
    // derived
    totalPages,
    availableRoles,
    filteredFamilyMembers,
    selectedFamilyMember,
    selectedIsCurrentMember,
    willTransfer,
    linkReasonRequired,
    isLinkReasonValid,
    canSubmitLink,
    // mutations (isPending/mutate bevosita ishlatiladi)
    updateMutation,
    resetPasswordMutation,
    activateMutation,
    deactivateMutation,
    assignRoleMutation,
    removeRoleMutation,
    changeUsernameMutation,
    linkFamilyMemberMutation,
    unlinkFamilyMemberMutation,
    quickAddParticipantMutation,
    // handlers
    handleUpdate,
    handleResetPassword,
    handleChangeUsername,
    handleToggleActive,
    handleLinkFamilyMember,
    handleUnlinkFamilyMember,
    handleExport,
  };
}
