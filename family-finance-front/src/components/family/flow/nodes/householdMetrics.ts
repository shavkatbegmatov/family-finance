import type { ChildDto, PartnerDto, HouseholdNodeDto } from '../../../../types';

/**
 * HouseholdNode o'lchov formulalari — komponent CSS'i bilan SINXRON saqlanadi.
 * useHouseholdLayout ham shu formulalar bilan ishlaydi (edge routing/pozitsiya
 * node renderidan OLDIN hisoblanadi), shuning uchun bitta manba shart.
 */

/** Minimal karta kengligi (px). */
export const NODE_MIN_WIDTH = 280;
/** Karta gorizontal ramkasi: border 2+2 va p-3 padding 12+12. */
const FRAME_X = 28;
/** Bitta farzand chipi kengligi (w-[56px]). */
const CHILD_W = 56;
/** Farzand chiplar orasidagi gap-2. */
const CHILD_GAP = 8;

/** Karta kengligi — farzandlar BIR QATORDA: ko'p bo'lsa karta kengayadi. */
export function nodeWidth(h: HouseholdNodeDto | undefined): number {
  const n = h?.children.length ?? 0;
  if (n === 0) return NODE_MIN_WIDTH;
  return Math.max(NODE_MIN_WIDTH, FRAME_X + n * CHILD_W + (n - 1) * CHILD_GAP);
}

/**
 * Karta balandligi — kontentdan: header (~37) + p-3 (24) + "Ota-ona" label (18)
 * + ota-ona chiplari (44px + 6px oraliq) + farzand qatori (bitta, 54px) + border.
 * ±10px xato zarar qilmaydi — yo'laklar zonasi baribir kartadan pastda.
 */
export function nodeHeight(h: HouseholdNodeDto | undefined): number {
  if (!h) return 200;
  const parents = h.parents.length;
  const parentsBlock = parents > 0 ? parents * 44 + (parents - 1) * 6 : 16;
  const childrenBlock = h.children.length > 0 ? 12 + 18 + 54 : 0;
  return 4 + 37 + 24 + 18 + parentsBlock + childrenBlock;
}

/** i-farzand chipi MARKAZINING karta chap chetidan masofasi (source handle joyi). */
export function childHandleLeft(index: number): number {
  return FRAME_X / 2 + index * (CHILD_W + CHILD_GAP) + CHILD_W / 2;
}

/** Farzand uchun handle ID — edge sourceHandle shu bilan bog'lanadi. */
export function childHandleId(personId: number): string {
  return `child-${personId}`;
}

// ===================== Displey nomlar =====================
// FamilyMember.getDisplayName() backend'da "Familiya Ism Otchestvo" quradi.
// firstName/lastName alohida maydonlar DTO'da bor (yangi backend); eski javob
// uchun fullName'dan ehtiyotkor fallback.

/** Farzand yorlig'i: faqat ISM. */
export function childDisplayName(c: ChildDto): string {
  if (c.firstName && c.firstName.trim()) return c.firstName.trim();
  const parts = c.fullName.trim().split(/\s+/);
  return parts.length >= 2 ? parts[1] : parts[0] ?? c.fullName;
}

/** Ota-ona yorlig'i: "Familiya Ism" (otasining ismi ko'rsatilmaydi). */
export function parentDisplayName(p: PartnerDto): string {
  const first = p.firstName?.trim();
  const last = p.lastName?.trim();
  if (first) return last ? `${last} ${first}` : first;
  const parts = p.fullName.trim().split(/\s+/);
  return parts.slice(0, 2).join(' ') || p.fullName;
}
