import type { CSSProperties } from 'react';
import type { FamilyRole } from '../../types';

/**
 * Oila a'zolari ro'yxati uchun mayda yordamchilar (DRY — page va sub-komponentlar ulashadi).
 */

/** Ismning birinchi harfini katta harfda qaytaradi (avatar fallback uchun). */
export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

/** Rolga mos avatar fon rangi (Tailwind klassi). */
export function getRoleColor(role: FamilyRole): string {
  switch (role) {
    case 'FATHER':
      return 'bg-blue-500';
    case 'MOTHER':
      return 'bg-pink-500';
    case 'CHILD':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Desktop jadval viewport'i uchun inline-style — auto rejimda hisoblangan
 * balandlikni qo'llaydi, aks holda 100%.
 */
export function tableViewportStyle(
  pageSizeMode: 'auto' | number,
  autoViewportHeight: number | null,
): CSSProperties {
  return {
    height:
      pageSizeMode === 'auto' && autoViewportHeight
        ? `${autoViewportHeight}px`
        : '100%',
    scrollbarGutter: 'stable',
  };
}
