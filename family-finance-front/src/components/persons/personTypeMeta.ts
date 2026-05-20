import type { ComponentType } from 'react';
import { Baby, KeyRound, ShieldCheck, UserCircle2 } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

import { PermissionCode } from '../../hooks/usePermission';
import type { PersonCapability, PersonType, PersonTypeMeta } from '../../types/persons.types';

/**
 * Har bir capability uchun ko'rsatiladigan kichik badge metadata'si.
 * Badge'lar wizard'da har bir kartochka pastida ko'rinadi.
 */
export const CAPABILITY_META: Record<PersonCapability, { label: string; tone: string }> = {
  FAMILY: { label: 'Oila a\'zosi', tone: 'badge-info' },
  USER: { label: 'Tizimga kiradi', tone: 'badge-primary' },
  POINTS: { label: 'Ball to\'playdi', tone: 'badge-accent' },
};

/**
 * Wizard'da tanlanadigan 4 ta shaxs turi uchun statik metadata.
 * UI shu manbadan rendering qiladi — yangi tur qo'shilsa, faqat shu yer va backend enum yangilanadi.
 */
export const PERSON_TYPE_META: Record<PersonType, PersonTypeMeta & {
  icon: ComponentType<LucideProps>;
  accent: string;
}> = {
  CHILD: {
    type: 'CHILD',
    icon: Baby,
    accent: 'from-sky-500/15 to-sky-500/5 border-sky-500/30',
    label: 'Bola',
    description: 'Oilada va ball tizimida qatnashadi, lekin tizimga kirmaydi.',
    creates: ['FAMILY', 'POINTS'],
    requiredPermissions: [PermissionCode.FAMILY_CREATE, PermissionCode.POINTS_MANAGE],
  },
  ADULT_ACTIVE: {
    type: 'ADULT_ACTIVE',
    icon: UserCircle2,
    accent: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/30',
    label: 'Katta yoshli faol a\'zo',
    description: 'Tizimga kiradi va ball tizimida qatnashadi. To\'liq akkaunt.',
    creates: ['FAMILY', 'USER', 'POINTS'],
    requiredPermissions: [
      PermissionCode.FAMILY_CREATE,
      PermissionCode.USERS_CREATE,
      PermissionCode.POINTS_MANAGE,
    ],
  },
  PASSIVE_MEMBER: {
    type: 'PASSIVE_MEMBER',
    icon: UserCircle2,
    accent: 'from-slate-500/15 to-slate-500/5 border-slate-500/30',
    label: 'Passiv oila a\'zosi',
    description: 'Faqat hisobotlar va shajarada ko\'rinadi. Login va ballar yo\'q.',
    creates: ['FAMILY'],
    requiredPermissions: [PermissionCode.FAMILY_CREATE],
  },
  ADMIN_ONLY: {
    type: 'ADMIN_ONLY',
    icon: ShieldCheck,
    accent: 'from-violet-500/15 to-violet-500/5 border-violet-500/30',
    label: 'Admin / hisobchi',
    description: 'Tizimga kiradi va boshqaradi, lekin ballarda qatnashmaydi.',
    creates: ['FAMILY', 'USER'],
    requiredPermissions: [PermissionCode.FAMILY_CREATE, PermissionCode.USERS_CREATE],
  },
};

/** Wizard kartochkalarining tartibi. */
export const PERSON_TYPE_ORDER: PersonType[] = [
  'CHILD',
  'ADULT_ACTIVE',
  'PASSIVE_MEMBER',
  'ADMIN_ONLY',
];

export { KeyRound };
