import { describe, it, expect } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRONG_SCORE,
  evaluatePasswordStrength,
  isPasswordAcceptable,
  isPasswordStrong,
  generateStrongPassword,
} from './password';

/**
 * Parol siyosatining yagona manbasi (`password.ts`) uchun toza-mantiq testlari.
 *
 * Bu xavfsizlik-kritik va backend bilan izchil bo'lishi shart (PASSWORD_MIN_LENGTH=10,
 * generate tarkibi UserService.generateTemporaryPassword bilan bir xil). Node muhiti,
 * DOM yoki tarmoqsiz — `crypto.getRandomValues` Node 18+ globalThis'dan keladi.
 */

// Aniq min-uzunlikdagi yordamchilar (belgi turini saqlab, minLength mezonini qondiradi).
const lowerOnly = 'abcdefghij'; // 10 belgi, faqat kichik harf
const lowerNum = 'abcdefghi1'; // 10 belgi, kichik + raqam
const full = 'Abcdefghi1'; // 10 belgi, katta + kichik + raqam

describe('evaluatePasswordStrength', () => {
  it("bo'sh parol -> score 0, 'Juda zaif', qabul qilinmaydi", () => {
    const s = evaluatePasswordStrength('');
    expect(s.score).toBe(0);
    expect(s.label).toBe('Juda zaif');
    expect(s.isAcceptable).toBe(false);
    expect(s.isStrong).toBe(false);
    expect(s.requirements).toHaveLength(4);
    expect(s.requirements.every((r) => !r.met)).toBe(true);
  });

  it("faqat kichik harf (min uzunlik) -> score 2, 'Zaif', qabul qilinadi lekin kuchsiz", () => {
    const s = evaluatePasswordStrength(lowerOnly);
    expect(s.score).toBe(2); // minLength + lowercase
    expect(s.label).toBe('Zaif');
    expect(s.isAcceptable).toBe(true);
    expect(s.isStrong).toBe(false);
  });

  it("kichik+raqam+uzunlik (score 3) -> 'Yaxshi' va kuchli", () => {
    const s = evaluatePasswordStrength(lowerNum);
    expect(s.score).toBe(3);
    expect(s.label).toBe('Yaxshi');
    expect(s.isStrong).toBe(true); // score >= PASSWORD_STRONG_SCORE (3)
  });

  it("katta+kichik+raqam+uzunlik (score 4) -> 'Kuchli'", () => {
    const s = evaluatePasswordStrength(full);
    expect(s.score).toBe(4);
    expect(s.label).toBe('Kuchli');
    expect(s.isStrong).toBe(true);
  });

  it('textColorClass colorClass-dan olinadi (bg- -> text-)', () => {
    const s = evaluatePasswordStrength(full);
    expect(s.colorClass).toBe('bg-success');
    expect(s.textColorClass).toBe('text-success');
  });

  it("qisqa parol (< min) minLength mezonini qondirmaydi", () => {
    const s = evaluatePasswordStrength('Ab1'); // 3 belgi
    expect(s.requirements.find((r) => r.key === 'minLength')?.met).toBe(false);
    expect(s.isAcceptable).toBe(false);
  });

  it(`aynan ${PASSWORD_MIN_LENGTH - 1} belgi hali minLength'ni qondirmaydi (chegara)`, () => {
    const justUnder = 'Aa1'.padEnd(PASSWORD_MIN_LENGTH - 1, 'a'); // min-1 uzunlik
    expect(justUnder.length).toBe(PASSWORD_MIN_LENGTH - 1);
    const s = evaluatePasswordStrength(justUnder);
    expect(s.requirements.find((r) => r.key === 'minLength')?.met).toBe(false);
    expect(s.isAcceptable).toBe(false);
  });
});

describe('isPasswordAcceptable', () => {
  it(`< ${PASSWORD_MIN_LENGTH} belgi -> false`, () => {
    expect(isPasswordAcceptable('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false);
  });

  it(`>= ${PASSWORD_MIN_LENGTH} belgi -> true`, () => {
    expect(isPasswordAcceptable('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true);
  });
});

describe('isPasswordStrong', () => {
  it('zaif parolni rad etadi', () => {
    expect(isPasswordStrong(lowerOnly)).toBe(false); // score 2
    expect(isPasswordStrong('abc')).toBe(false);
  });

  it('kuchli parolni qabul qiladi', () => {
    expect(isPasswordStrong(full)).toBe(true); // score 4
    expect(isPasswordStrong(lowerNum)).toBe(true); // score 3 (chegara)
  });
});

describe('generateStrongPassword', () => {
  it('default uzunlik kamida 10', () => {
    expect(generateStrongPassword().length).toBeGreaterThanOrEqual(10);
  });

  it(`so'ralgan uzunlik ${PASSWORD_MIN_LENGTH} dan kam bo'lsa minimalga ko'tariladi`, () => {
    expect(generateStrongPassword(4).length).toBe(PASSWORD_MIN_LENGTH);
  });

  it('har doim kuchli: katta+kichik+raqam mavjud (100 marta tekshiruv)', () => {
    for (let i = 0; i < 100; i++) {
      const pwd = generateStrongPassword(12);
      expect(pwd.length).toBe(12);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
      expect(isPasswordStrong(pwd)).toBe(true);
    }
  });

  it("PASSWORD_STRONG_SCORE = 3 (siyosat o'zgarmaganini qulflaydi)", () => {
    expect(PASSWORD_STRONG_SCORE).toBe(3);
  });
});
