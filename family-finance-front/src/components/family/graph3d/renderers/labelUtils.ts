/**
 * Uzun ismni 3D canvas-yorlig'i uchun qisqartiradi (tartibsizlik/ustma-ust
 * tushishni kamaytirish uchun). To'liq ism hover-tooltip va qidiruvда qoladi.
 */
export function shortLabel(name: string, max = 18): string {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
