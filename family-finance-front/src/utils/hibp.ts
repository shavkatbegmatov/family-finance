/**
 * "Have I Been Pwned" (HIBP) buzilgan-parol tekshiruvi — k-anonymity modeli.
 *
 * Parol HECH QACHON tashqariga yuborilmaydi: SHA-1 hash'ning faqat dastlabki 5 belgisi (prefix)
 * api.pwnedpasswords.com ga so'rov sifatida ketadi; qolgan suffiks javob ichida lokal solishtiriladi.
 *
 * Bu faqat MASLAHAT (advisory) — backend (PwnedPasswordService) baribir majburiy tekshiradi.
 * Tekshiruv imkonsiz bo'lsa (secure-context yo'q, tarmoq, abort) `false` qaytaradi (fail-open).
 */

/** Web Crypto bilan SHA-1 hex (katta harf) — HIBP range API formati. */
async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** HIBP range javobida ("SUFFIX:COUNT" qatorlar) suffiks count>0 bilan bormi. */
export function suffixIsPwned(body: string, suffix: string): boolean {
  const target = suffix.toUpperCase();
  for (const line of body.split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    if (line.slice(0, idx).trim().toUpperCase() === target) {
      const count = line.slice(idx + 1).trim();
      return count !== '' && count !== '0';
    }
  }
  return false;
}

/**
 * Parol HIBP buzilgan-ro'yxatida bormi. Tekshiruv imkonsiz bo'lsa `false` (fail-open).
 *
 * @param signal eski so'rovni bekor qilish uchun (debounce bilan ishlatiladi)
 */
export async function isPasswordPwned(password: string, signal?: AbortSignal): Promise<boolean> {
  if (!password || !crypto?.subtle) return false;
  try {
    const sha1 = await sha1Hex(password);
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal });
    if (!res.ok) return false;

    return suffixIsPwned(await res.text(), suffix);
  } catch {
    // fail-open: tarmoq / abort / secure-context yo'q
    return false;
  }
}
