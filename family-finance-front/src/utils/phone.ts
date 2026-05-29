/**
 * Telefon raqamini o'qish uchun qulay (guruhlangan) ko'rinishda formatlaydi.
 *
 * O'zbekiston raqami (998XXYYYYYYY — 12 raqam) → "+998 (XX) YYY-YY-YY".
 * Boshqa uzunlik yoki kod — raqam o'zgartirilmasdan qaytariladi.
 * Bo'sh / null / undefined qiymat uchun bo'sh string qaytaradi
 * (chaqiruvchi kerak bo'lsa `|| '—'` fallback qo'sha oladi).
 *
 * @example formatPhoneDisplay('998974940955') // "+998 (97) 494-09-55"
 */
export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    const code = digits.slice(3, 5);
    const part1 = digits.slice(5, 8);
    const part2 = digits.slice(8, 10);
    const part3 = digits.slice(10, 12);
    return `+998 (${code}) ${part1}-${part2}-${part3}`;
  }
  return phone;
}
