/**
 * Multi-level Scope arxitekturasi uchun TypeScript turlar.
 * Backend DTO'lar bilan to'liq mos: family-finance-api/.../dto/{request,response}/Scope*.java
 */

/** Scope turlari — backend ScopeType.java bilan mos. */
export type ScopeType =
  | 'GROUP'
  | 'HOUSEHOLD'
  | 'SCHOOL'
  | 'CLASS'
  | 'PROJECT'
  | 'EVENT'
  | 'FUND'
  | 'TRUSTEE'
  | 'PROPERTY';

/** Membership rollari — backend ScopeRole.java bilan mos. */
export type ScopeRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'GUEST';

/** Membership holatlari — backend MembershipStatus.java bilan mos. */
export type MembershipStatus = 'ACTIVE' | 'LEFT' | 'EXPELLED' | 'PENDING';

// =============================================================================
// Response
// =============================================================================

export interface Scope {
  id: number;
  type: ScopeType;
  name: string;
  parentScopeId?: number;
  parentScopeName?: string;
  ownerUserId?: number;
  ownerUserName?: string;
  uniqueCode?: string;
  /** Inson o'qiy oladigan xonadon raqami (faqat HOUSEHOLD, masalan "278-541"). */
  displayCode?: string;
  metadata?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
  createdAt?: string;
  /** Joriy user'ning shu scope'dagi roli (null bo'lsa membership yo'q). */
  currentUserRole?: ScopeRole;
  /** Aktiv a'zolar soni. */
  memberCount?: number;
}

export interface Membership {
  id: number;
  scopeId: number;
  scopeName?: string;
  scopeType?: ScopeType;
  userId: number;
  userName?: string;
  userFullName?: string;
  role: ScopeRole;
  status: MembershipStatus;
  joinedAt?: string;
  invitedByUserId?: number;
  invitedByName?: string;
}

// =============================================================================
// Request
// =============================================================================

export interface ScopeCreateRequest {
  type: ScopeType;
  name: string;
  /** GROUP dan tashqari hammasida majburiy. */
  parentScopeId?: number;
  metadata?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
}

export interface MembershipInviteRequest {
  userId: number;
  role: ScopeRole;
}

export interface ScopeRoleUpdateRequest {
  role: ScopeRole;
}

export interface SwitchScopeRequest {
  scopeId: number;
  /** True bo'lsa, User.primaryScope ham yangilanadi. */
  persistAsPrimary?: boolean;
}

export interface SwitchScopeResponse {
  accessToken: string;
  tokenType: string;
  activeScopeId: number;
  activeScopeName: string;
  activeScopeType: ScopeType;
  currentUserRole?: ScopeRole;
}

// =============================================================================
// Maktablar (ADR-002 P4)
// =============================================================================

/** Sinfga yozilish holati — backend EnrollmentStatus.java bilan mos. */
export type EnrollmentStatus = 'ENROLLED' | 'LEFT';

/**
 * Farzandning sinfga yozilishi — backend EnrollmentResponse bilan mos.
 * K3 maxfiylik: `realName` faqat o'qituvchi/sinf admini yoki yozgan
 * ota-onaga to'ldiriladi, boshqalarga null.
 */
export interface Enrollment {
  id: number;
  classScopeId: number;
  className?: string;
  familyMemberId: number;
  nickname: string;
  realName?: string;
  status: EnrollmentStatus;
  joinedAt?: string;
}

// =============================================================================
// UI metadata
// =============================================================================

/** Scope turi uchun foydalanuvchiga ko'rsatiladigan ko'rsatkichlar. */
export interface ScopeTypeUiMeta {
  type: ScopeType;
  label: string;
  /** Lucide icon name string (komponentda dynamic import). */
  iconKey: string;
  tone: string;
  description: string;
}
