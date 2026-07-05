import type { Scope, ScopeRole } from '../../types/scope.types';

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
  /** Container turi — sarlavha bezagi uchun (ADR-003'dan keyin faqat 'SCHOOL', "Boshqa"da null). */
  groupType: 'SCHOOL' | null;
  scopes: Scope[];
}

/**
 * Scope'larni container (SCHOOL) bo'yicha guruhlash: maktab o'zi va uning sinflari
 * (CLASS) bir guruhda. Qolgan scope'lar (xonadonlar — ADR-003'dan beri har doim
 * mustaqil) "Boshqa" guruhida tekis ro'yxat bo'ladi.
 */
const isContainerScope = (s: Scope) => s.type === 'SCHOOL';

export function groupScopesByGroup(scopes: Scope[]): ScopeGroupData[] {
  if (scopes.length === 0) return [];

  const groups = new Map<string, ScopeGroupData>();
  const groupsById = new Map<number, Scope>();

  // Avval barcha container'larni (SCHOOL) topish
  for (const s of scopes) {
    if (isContainerScope(s)) {
      groupsById.set(s.id, s);
      groups.set(`group-${s.id}`, {
        key: `group-${s.id}`,
        groupName: s.name,
        groupType: 'SCHOOL',
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
