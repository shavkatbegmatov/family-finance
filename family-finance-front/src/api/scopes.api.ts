import axiosInstance from './axios';
import type { ApiResponse, FinancialOverview } from '../types';
import type {
  Membership,
  MembershipInviteRequest,
  Scope,
  ScopeCreateRequest,
  ScopeRoleUpdateRequest,
  SwitchScopeRequest,
  SwitchScopeResponse,
} from '../types/scope.types';

/**
 * Multi-level Scope (Clan + Household + Project + Event + Fund + Trustee + Property)
 * va Membership boshqaruvi uchun REST klient.
 *
 * Backend: ScopeController (/v1/scopes/*) va AuthController (/v1/auth/switch-scope).
 */
export const scopesApi = {
  // ===== Scopes =====

  /** Joriy user a'zo bo'lgan barcha scope'lar (ScopeSwitcher uchun). */
  getMyScopes: () =>
    axiosInstance.get<ApiResponse<Scope[]>>('/v1/scopes/my'),

  /** SUPER_ADMIN — platformadagi barcha scope'lar (oilalar nazorati). */
  getAllScopes: () =>
    axiosInstance.get<ApiResponse<Scope[]>>('/v1/scopes/all'),

  /** SUPER_ADMIN — tanlangan oilaning read-only moliyaviy ko'rinishi (drill-down). */
  getFinancialOverview: (scopeId: number) =>
    axiosInstance.get<ApiResponse<FinancialOverview>>(`/v1/scopes/${scopeId}/financial-overview`),

  getById: (id: number) =>
    axiosInstance.get<ApiResponse<Scope>>(`/v1/scopes/${id}`),

  create: (data: ScopeCreateRequest) =>
    axiosInstance.post<ApiResponse<Scope>>('/v1/scopes', data),

  /**
   * Xonadonni guruhga biriktirish yoki uzish (ADR-001 decoupling UX).
   * parentScopeId = guruh ID (biriktirish) yoki null (guruhdan chiqarish).
   */
  setParent: (scopeId: number, parentScopeId: number | null) =>
    axiosInstance.put<ApiResponse<Scope>>(`/v1/scopes/${scopeId}/parent`, {
      parentScopeId,
    }),

  deactivate: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/v1/scopes/${id}`),

  // ===== Memberships =====

  listMemberships: (scopeId: number) =>
    axiosInstance.get<ApiResponse<Membership[]>>(`/v1/scopes/${scopeId}/memberships`),

  inviteMember: (scopeId: number, data: MembershipInviteRequest) =>
    axiosInstance.post<ApiResponse<Membership>>(
      `/v1/scopes/${scopeId}/memberships`,
      data,
    ),

  updateMemberRole: (scopeId: number, userId: number, data: ScopeRoleUpdateRequest) =>
    axiosInstance.put<ApiResponse<Membership>>(
      `/v1/scopes/${scopeId}/memberships/${userId}`,
      data,
    ),

  removeMember: (scopeId: number, userId: number) =>
    axiosInstance.delete<ApiResponse<void>>(
      `/v1/scopes/${scopeId}/memberships/${userId}`,
    ),

  // ===== Switch scope (auth endpoint) =====

  /**
   * Aktiv scope'ni o'zgartirish — yangi JWT token qaytaradi.
   * authStore'da setAuth() bilan token'ni yangilash kerak.
   */
  switchScope: (data: SwitchScopeRequest) =>
    axiosInstance.post<ApiResponse<SwitchScopeResponse>>(
      '/v1/auth/switch-scope',
      data,
    ),

  // ===== Invite codes (Phase 4.A) =====

  /** Scope owner/admin uchun joriy taklif kodi. */
  getInviteCode: (scopeId: number) =>
    axiosInstance.get<ApiResponse<{ inviteCode: string }>>(
      `/v1/scopes/${scopeId}/invite-code`,
    ),

  /** Eski kodni bekor qilib yangi kod yaratish. */
  regenerateInviteCode: (scopeId: number) =>
    axiosInstance.post<ApiResponse<{ inviteCode: string }>>(
      `/v1/scopes/${scopeId}/invite-code/regenerate`,
    ),

  /** Kod bo'yicha scope ma'lumotlarini ko'rish (preview). */
  lookupByCode: (code: string) =>
    axiosInstance.get<ApiResponse<Scope>>('/v1/scopes/lookup', {
      params: { code },
    }),

  // ===== Pending invitations (Phase 4.B) =====

  /** Joriy user uchun kutilayotgan barcha taklif. */
  getPendingInvitations: () =>
    axiosInstance.get<ApiResponse<Membership[]>>('/v1/scopes/invitations/pending'),

  acceptInvitation: (membershipId: number) =>
    axiosInstance.post<ApiResponse<Membership>>(
      `/v1/scopes/invitations/${membershipId}/accept`,
    ),

  declineInvitation: (membershipId: number) =>
    axiosInstance.post<ApiResponse<void>>(
      `/v1/scopes/invitations/${membershipId}/decline`,
    ),

  // ===== Leave / Join by code (Phase 4.C) =====

  leaveScope: (scopeId: number) =>
    axiosInstance.post<ApiResponse<void>>(`/v1/scopes/${scopeId}/leave`),

  /**
   * Login qilingan user invite code orqali boshqa oilaga qo'shiladi.
   * archiveOldGroup=true bo'lsa, eski bo'sh guruh/xonadon arxivlanadi.
   */
  joinByCode: (inviteCode: string, archiveOldGroup: boolean = false) =>
    axiosInstance.post<ApiResponse<Membership>>('/v1/scopes/join-by-code', {
      inviteCode,
      archiveOldGroup,
    }),
};
