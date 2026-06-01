import type { CredentialsInfo, FamilyRole, Gender } from './index';

/**
 * Wizard'da tanlanadigan shaxs turlari.
 * Backend'dagi `PersonType` enum bilan mos kelishi shart.
 */
export type PersonType = 'CHILD' | 'ADULT_ACTIVE' | 'PASSIVE_MEMBER' | 'ADMIN_ONLY';

export interface PersonCreateRequest {
  personType: PersonType;
  firstName: string;
  lastName?: string;
  middleName?: string;
  familyRole?: FamilyRole;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  phone?: string;
  /** CHILD / ADULT_ACTIVE uchun ixtiyoriy laqab. */
  nickname?: string;
  /** ADULT_ACTIVE / ADMIN_ONLY uchun ixtiyoriy login (bo'sh bo'lsa ism asosida avto-generatsiya). */
  username?: string;
  /** ADULT_ACTIVE / ADMIN_ONLY uchun ixtiyoriy parol (bo'sh bo'lsa avto-generatsiya). */
  password?: string;
  /** ADULT_ACTIVE / ADMIN_ONLY uchun rol kodi (default "MEMBER"). */
  accountRole?: string;
}

export interface PersonCreateResponse {
  personType: PersonType;
  familyMemberId: number;
  displayName?: string;
  userId?: number;
  credentials?: CredentialsInfo;
  participantId?: number;
  message: string;
}

/**
 * Wizard'da har bir tur uchun ko'rsatiladigan metadata.
 * UI faqat shu metadata'ga tayanadi — biznes logika type bo'yicha.
 */
export interface PersonTypeMeta {
  type: PersonType;
  /** Foydalanuvchiga ko'rinadigan qisqa nom. */
  label: string;
  /** Bir jumla — bu turda kim qo'shiladi. */
  description: string;
  /** Qaysi entity'lar yaratiladi (badge'lar uchun). */
  creates: PersonCapability[];
  /** Talab qilinadigan permission kodlari (yashirish/ko'rsatish uchun). */
  requiredPermissions: string[];
}

export type PersonCapability = 'FAMILY' | 'USER' | 'POINTS';
