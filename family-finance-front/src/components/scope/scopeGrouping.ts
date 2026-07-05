import type { Scope, ScopeRole } from '../../types/scope.types';
import { getScopeTypeMeta } from './scopeTypeMeta';

/**
 * ScopeSwitcher (desktop dropdown) va MobileScopeSwitcher (bottom-sheet)
 * uchun umumiy guruhlash mantig'i va rol metadata — DRY.
 */

export const ROLE_LABEL: Record<ScopeRole, string> = {
  OWNER: 'Egasi',
  ADMIN: 'Admin',
  MEMBER: "A'zo",
  VIEWER: "Ko'ruvchi",
  GUEST: 'Mehmon',
};

export const ROLE_TONE: Record<ScopeRole, string> = {
  OWNER: 'text-amber-400',
  ADMIN: 'text-emerald-400',
  MEMBER: 'text-sky-400',
  VIEWER: 'text-base-content/50',
  GUEST: 'text-violet-400',
};

export interface ScopeGroupData {
  key: string;
  groupName: string | null;
  /** Container turi — sarlavha bezagi uchun ('GROUP' | 'SCHOOL', "Boshqa"da null). */
  groupType: 'GROUP' | 'SCHOOL' | null;
  scopes: Scope[];
}

/**
 * Scope'larni container (GROUP yoki SCHOOL) bo'yicha guruhlash. Container o'zi va
 * uning bevosita farzandlari (HOUSEHOLD, CLASS, h.k.) bir guruhda. Container'siz
 * scope'lar "Boshqa" guruhida.
 */
/** Runtime-xavfsiz GROUP tekshiruvi — legacy 'CLAN' (eski backend/localStorage) ham GROUP sanaladi. */
const isGroupScope = (s: Scope) => getScopeTypeMeta(s.type).type === 'GROUP';

/** Farzand scope'larni o'z ostida guruhlaydigan container'lar: GROUP va SCHOOL. */
const isContainerScope = (s: Scope) => isGroupScope(s) || s.type === 'SCHOOL';

export function groupScopesByGroup(scopes: Scope[]): ScopeGroupData[] {
  if (scopes.length === 0) return [];

  const groups = new Map<string, ScopeGroupData>();
  const groupsById = new Map<number, Scope>();

  // Avval barcha container'larni (GROUP/SCHOOL) topish
  for (const s of scopes) {
    if (isContainerScope(s)) {
      groupsById.set(s.id, s);
      groups.set(`group-${s.id}`, {
        key: `group-${s.id}`,
        groupName: s.name,
        groupType: isGroupScope(s) ? 'GROUP' : 'SCHOOL',
        scopes: [s],
      });
    }
  }

  // Keyin qolganlarini parent bo'yicha taqsimlash
  for (const s of scopes) {
    if (isContainerScope(s)) continue;
    const parentGroup = s.parentScopeId ? groupsById.get(s.parentScopeId) : null;
    if (parentGroup) {
      const group = groups.get(`group-${parentGroup.id}`)!;
      group.scopes.push(s);
    } else {
      const other =
        groups.get('other') ?? { key: 'other', groupName: null, groupType: null, scopes: [] };
      other.scopes.push(s);
      groups.set('other', other);
    }
  }

  return Array.from(groups.values());
}
