import type { ComponentType } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  Coins,
  Heart,
  Home,
  TreePine,
  type LucideProps,
} from 'lucide-react';
import type { ScopeType } from '../../types/scope.types';

interface ScopeTypeMeta {
  type: ScopeType;
  label: string;
  /** Lucide icon component. */
  icon: ComponentType<LucideProps>;
  /** Tailwind class — chip/badge ranggi uchun. */
  toneClass: string;
  /** Qisqa tavsif (tooltip). */
  description: string;
}

/**
 * Har bir scope turi uchun UI metadata.
 * ScopeSwitcher va boshqa joylarda foydalanish uchun.
 */
export const SCOPE_TYPE_META: Record<ScopeType, ScopeTypeMeta> = {
  CLAN: {
    type: 'CLAN',
    label: 'Urug\'',
    icon: TreePine,
    toneClass: 'text-emerald-500 bg-emerald-500/10',
    description: 'Katta oila / urug\' — eng yuqori daraja',
  },
  HOUSEHOLD: {
    type: 'HOUSEHOLD',
    label: 'Xonadon',
    icon: Home,
    toneClass: 'text-sky-500 bg-sky-500/10',
    description: 'Alohida byudjetli nuklear oila',
  },
  PROJECT: {
    type: 'PROJECT',
    label: 'Loyiha',
    icon: Briefcase,
    toneClass: 'text-violet-500 bg-violet-500/10',
    description: 'Oilaviy biznes yoki investitsiya',
  },
  EVENT: {
    type: 'EVENT',
    label: 'Voqea',
    icon: Calendar,
    toneClass: 'text-amber-500 bg-amber-500/10',
    description: 'To\'y, hajj kabi vaqtinchalik byudjet',
  },
  FUND: {
    type: 'FUND',
    label: 'Fond',
    icon: Coins,
    toneClass: 'text-rose-500 bg-rose-500/10',
    description: 'Maqsadli to\'plash (ta\'lim, tibbiyot)',
  },
  TRUSTEE: {
    type: 'TRUSTEE',
    label: 'Vasiylik',
    icon: Heart,
    toneClass: 'text-pink-500 bg-pink-500/10',
    description: 'Kimningdir nomidan moliya boshqarish',
  },
  PROPERTY: {
    type: 'PROPERTY',
    label: 'Mulk',
    icon: Building2,
    toneClass: 'text-slate-500 bg-slate-500/10',
    description: 'Ulushli mulk (kvartira, yer, avtomobil)',
  },
};

/** Tartiblash uchun standart tartib (ScopeSwitcher dropdown'da). */
export const SCOPE_TYPE_ORDER: ScopeType[] = [
  'CLAN',
  'HOUSEHOLD',
  'PROJECT',
  'EVENT',
  'FUND',
  'TRUSTEE',
  'PROPERTY',
];
