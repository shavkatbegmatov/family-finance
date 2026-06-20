import { describe, it, expect } from 'vitest';
import { suffixIsPwned } from './hibp';

/**
 * HIBP javob-parsing (k-anonymity range javobi) uchun toza-mantiq testlari.
 * Backend hamkori: PwnedPasswordServiceTest.ContainsSuffix bilan izchil.
 * SHA-1 / fetch qatlami bu yerda sinalmaydi (brauzer Web Crypto + tarmoq).
 */
describe('suffixIsPwned', () => {
  // "password" SHA-1 ning suffiks qismi
  const SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';
  const body = [
    '0018A45C4D1DEF81644B54AB7F969B88D65:1',
    '00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2',
    `${SUFFIX}:9659365`,
    '011053FD0102E94D6AE2F8B83D76FAF94F6:1',
  ].join('\n');

  it('mavjud suffiks (count>0) -> true', () => {
    expect(suffixIsPwned(body, SUFFIX)).toBe(true);
  });

  it('katta-kichik harfga befarq', () => {
    expect(suffixIsPwned(body, SUFFIX.toLowerCase())).toBe(true);
  });

  it("javobda yo'q suffiks -> false", () => {
    expect(suffixIsPwned(body, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
  });

  it('count=0 (padding qatori) -> false', () => {
    const suffix = 'ABCDEF0123456789ABCDEF0123456789ABC';
    expect(suffixIsPwned(`${suffix}:0`, suffix)).toBe(false);
  });

  it("bo'sh javob -> false", () => {
    expect(suffixIsPwned('', SUFFIX)).toBe(false);
  });
});
