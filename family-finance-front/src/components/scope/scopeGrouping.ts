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
  clanName: string | null;
  scopes: Scope[];
}

/**
 * Scope'larni Clan bo'yicha guruhlash. CLAN o'zi va uning bevosita farzandlari
 * (HOUSEHOLD, PROJECT, EVENT, h.k.) bir guruhda. Clan'siz scope'lar (PROJECT
 * to'g'ridan-to'g'ri user uchun, ya'ni parentSiz bo'lsa) "Boshqa" guruhida.
 */
export function groupScopesByClan(scopes: Scope[]): ScopeGroupData[] {
  if (scopes.length === 0) return [];

  const groups = new Map<string, ScopeGroupData>();
  const clansById = new Map<number, Scope>();

  // Avval barcha CLAN'larni topish
  for (const s of scopes) {
    if (s.type === 'CLAN') {
      clansById.set(s.id, s);
      groups.set(`clan-${s.id}`, {
        key: `clan-${s.id}`,
        clanName: s.name,
        scopes: [s],
      });
    }
  }

  // Keyin qolganlarini parent bo'yicha taqsimlash
  for (const s of scopes) {
    if (s.type === 'CLAN') continue;
    const parentClan = s.parentScopeId ? clansById.get(s.parentScopeId) : null;
    if (parentClan) {
      const group = groups.get(`clan-${parentClan.id}`)!;
      group.scopes.push(s);
    } else {
      const other = groups.get('other') ?? { key: 'other', clanName: null, scopes: [] };
      other.scopes.push(s);
      groups.set('other', other);
    }
  }

  return Array.from(groups.values());
}
