import type { GraphTheme } from '../types';

/**
 * 3D "galaktika" ko'rinishi uchun professional deep-space palitra.
 *
 * Ranglar DOIMO chuqur kosmik fonda ishlaydi va daisyUI mavzusidan MUSTAQIL.
 * Sabablari:
 *  1) Force-graf node glow, particle va depth (chuqurlik) effektlari faqat to'q
 *     fonda professional ko'rinadi — Obsidian Graph / Neo4j Bloom uslubi.
 *  2) daisyUI v4 ranglarni `oklch(...)` formatda saqlaydi. Mavzu rangini DOM
 *     orqali o'qish (getComputedStyle → oklch) WebGL uchun mo'rt edi: oklch
 *     hue qiymati (≈265) ko'k kanaliga aylanib, butun fon yorqin ko'k (#0000ff)
 *     bo'lib ketardi. Qattiq kodlangan hex palitra bu sinfdagi xatolarni
 *     butunlay yo'q qiladi (WebGL faqat aniq sRGB hex tushunadi).
 */

// Jins ranglari 2D daraxt bilan izchil (personCardUtils.getGenderGradient).
const GENDER = { male: '#3b82f6', female: '#ec4899', unknown: '#f59e0b' } as const;

const GALAXY_THEME: GraphTheme = {
  background: '#0a0e1a', // chuqur kosmik navy — node ranglari porlab ajraladi
  nodeDefault: '#2dd4bf', // teal (primary), to'q fonda yorqin
  root: '#2dd4bf',
  link: '#7c8aa8', // slate-blue — nozik, lekin ko'rinadigan ulanish chiziqlari
  label: '#e8edf7', // deyarli oq — ism yorliqlari aniq o'qiladi
  male: GENDER.male,
  female: GENDER.female,
  unknown: GENDER.unknown,
  isDark: true, // 3D galaktika ko'rinishi doimo to'q estetikada
};

/**
 * 3D graf mavzusi — galaktika estetikasi (barqaror, mavzudan mustaqil).
 * Konstanta obyekt qaytaradi: referensi barqaror, shu sabab quyi `useMemo`'lar
 * behuda qayta hisoblanmaydi.
 */
export function useGraphTheme(): GraphTheme {
  return GALAXY_THEME;
}
