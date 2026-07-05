import type { ComponentType } from 'react';
import {
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Coins,
  GraduationCap,
  Heart,
  Home,
  Users2,
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
  // ADR-003: GROUP iste'foda (V60 arxivladi) — meta faqat super admin arxiv
  // qatorlari va eski localStorage skew'i uchun qoladi; UI oqimlarida ishlatilmaydi.
  GROUP: {
    type: 'GROUP',
    label: 'Guruh (arxiv)',
    icon: Users2,
    toneClass: 'text-slate-400 bg-slate-400/10',
    description: "Iste'foga chiqarilgan guruh turi — xonadonlar endi mustaqil",
  },
  HOUSEHOLD: {
    type: 'HOUSEHOLD',
    label: 'Xonadon',
    icon: Home,
    toneClass: 'text-sky-500 bg-sky-500/10',
    description: 'Alohida byudjetli nuklear oila',
  },
  SCHOOL: {
    type: 'SCHOOL',
    label: 'Maktab',
    icon: GraduationCap,
    toneClass: 'text-indigo-500 bg-indigo-500/10',
    description: "Ta'lim muassasasi — sinflar shu yerda ochiladi",
  },
  CLASS: {
    type: 'CLASS',
    label: 'Sinf',
    icon: BookOpen,
    toneClass: 'text-teal-500 bg-teal-500/10',
    description: "Sinf — o'quvchilar ball to'playdigan kontekst (pulga aylanmaydi)",
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

/**
 * Xavfsiz meta lookup — runtime'da `scope.type` TS union kafolatiga ega EMAS:
 * deploy skew oynasida (backend hali eski) yoki eski persisted localStorage'da
 * legacy 'CLAN' kelishi mumkin. To'g'ridan-to'g'ri SCOPE_TYPE_META[type] indexlash
 * unda undefined qaytarib UI'ni crash qildiradi (undefined.icon) — shuning uchun
 * BARCHA meta o'qishlar shu helper orqali bo'lishi shart.
 */
export function getScopeTypeMeta(type: string | null | undefined): ScopeTypeMeta {
  if (type === 'CLAN') return SCOPE_TYPE_META.GROUP; // legacy alias (eski backend/localStorage)
  return SCOPE_TYPE_META[type as ScopeType] ?? SCOPE_TYPE_META.HOUSEHOLD;
}

/** Tartiblash uchun standart tartib (ScopeSwitcher dropdown'da). */
export const SCOPE_TYPE_ORDER: ScopeType[] = [
  'HOUSEHOLD',
  'SCHOOL',
  'CLASS',
  'GROUP',
  'PROJECT',
  'EVENT',
  'FUND',
  'TRUSTEE',
  'PROPERTY',
];
