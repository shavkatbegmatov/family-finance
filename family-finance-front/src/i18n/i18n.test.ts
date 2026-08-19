import { describe, expect, it } from 'vitest';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

/**
 * Tarjima fayllarining butunligi.
 *
 * <p>Eng tez-tez uchraydigan i18n xatosi — kalitni bir tilga qo'shib, ikkinchisida
 * unutish. `tsc` buni ko'rmaydi (JSON import strukturasi tekshirilmaydi), UI'da esa
 * faqat o'sha ekranga kirilganda ko'rinadi. Shu sabab kalit-butunligi shu yerda
 * qulflanadi.</p>
 *
 * <p>Reja: `docs/i18n-plan.md`. `index.ts` ATAYLAB import qilinmaydi — u
 * `document.documentElement` ga tegadi, test muhiti esa `node` (DOM yo'q).</p>
 */

type Json = { [key: string]: string | Json };

/** Ichma-ich obyektni `a.b.c` ko'rinishidagi tekis kalitlarga yoyadi. */
function flatten(obj: Json, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out.set(path, value);
    } else {
      for (const [k, v] of flatten(value, path)) out.set(k, v);
    }
  }
  return out;
}

const uzKeys = flatten(uz as Json);
const ruKeys = flatten(ru as Json);

describe('tarjima fayllari butunligi', () => {
  it("uz va ru kalitlari AYNAN mos keladi", () => {
    const onlyUz = [...uzKeys.keys()].filter((k) => !ruKeys.has(k));
    const onlyRu = [...ruKeys.keys()].filter((k) => !uzKeys.has(k));

    expect(onlyUz, `faqat uz.json da bor: ${onlyUz.join(', ')}`).toEqual([]);
    expect(onlyRu, `faqat ru.json da bor: ${onlyRu.join(', ')}`).toEqual([]);
  });

  it.each([
    ['uz', uzKeys],
    ['ru', ruKeys],
  ])("%s.json da bo'sh qiymat yo'q", (_lang, keys) => {
    const empty = [...keys.entries()].filter(([, v]) => v.trim().length === 0).map(([k]) => k);
    expect(empty, `bo'sh qiymatli kalitlar: ${empty.join(', ')}`).toEqual([]);
  });

  it('kalitlar soni kutilganidek (tasodifiy yo\'qotishdan himoya)', () => {
    // B0 tozalashidan keyin: 142 -> 125 (purchases/payment/status olib tashlandi,
    // status.completed/cancelled common ga ko'chdi). Kalit qo'shilsa bu son o'sadi —
    // o'shanda shu qiymatni yangilang, KAMAYSA esa nimadir yo'qolgan.
    expect(uzKeys.size).toBeGreaterThanOrEqual(125);
    expect(ruKeys.size).toBe(uzKeys.size);
  });

  it("savdo ilovasidan ko'chirilgan bo'limlar qaytmagan", () => {
    // purchases/payment/status boshqa loyihadan kelgan edi ("Hisob-faktura",
    // "Mahsulotlar", "Qaytarilgan") — qayta qo'shilib qolmasin.
    for (const section of ['purchases', 'payment', 'status']) {
      expect(Object.keys(uz), `${section} qaytib kelgan`).not.toContain(section);
      expect(Object.keys(ru), `${section} qaytib kelgan`).not.toContain(section);
    }
  });
});
