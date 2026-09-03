/**
 * Auth token'lar saqlanish joyi (D12-PR5 cutover).
 *
 * - **Access token faqat XOTIRADA** — localStorage'ga yozilmaydi (XSS bilan o'g'irlab bo'lmaydi).
 *   Sahifa yangilanganda `authSession.bootstrapSession()` uni httpOnly refresh cookie orqali
 *   jimgina tiklaydi.
 * - **Refresh token web'da JS'ga umuman kelmaydi** — u `refresh_token` httpOnly cookie'da
 *   (`Path=/api/v1/auth; SameSite=Strict`), backend `AuthCookies` o'rnatadi.
 * - **Capacitor (APK)** istisno: WebView origin'i (`https://localhost`) API domeni bilan
 *   same-site emas → `SameSite=Strict` cookie yuborilmaydi. Shu sabab native'da refresh token
 *   WebView'ning o'z (ilova-xususiy) localStorage'ida saqlanib, legacy `?refreshToken=` parametri
 *   bilan yuboriladi (backend ikkalasini ham qabul qiladi).
 *
 * Factory + singleton: `createTokenStore()` testlar uchun izolyatsiyalangan nusxa beradi,
 * ilova `tokenStore` singleton'ini ishlatadi.
 */

type TokenListener = (token: string | null) => void;

export interface TokenStore {
  getAccessToken(): string | null;
  /** Xotiradagi tokenni almashtiradi; o'zgargan bo'lsa listener'larni chaqiradi. */
  setAccessToken(token: string | null): boolean;
  onAccessTokenChange(listener: TokenListener): () => void;
  /** Native (Capacitor) uchun saqlangan refresh token; web'da doim `null`. */
  getStoredRefreshToken(): string | null;
  setStoredRefreshToken(token: string | null): void;
  /** Cutover'dan oldingi `accessToken`/`refreshToken` localStorage kalitlarini o'chiradi. */
  clearLegacyTokenStorage(): void;
}

export interface TokenStoreOptions {
  isNative?: () => boolean;
  storage?: () => Storage | null;
}

/** Cutover'gacha ishlatilgan localStorage kalitlari — endi faqat tozalanadi. */
const LEGACY_KEYS = ['accessToken', 'refreshToken'] as const;
/** Native (Capacitor) refresh token kaliti — legacy kalitdan ataylab farq qiladi. */
const NATIVE_REFRESH_TOKEN_KEY = 'ff.native.refreshToken';

/** Capacitor WebView ichida ishlayapmizmi (`window.Capacitor` native runtime'da mavjud). */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // localStorage bloklangan (privacy rejimi) — token saqlanmaydi, ilova baribir ishlaydi
    return null;
  }
}

export function createTokenStore(options: TokenStoreOptions = {}): TokenStore {
  const isNative = options.isNative ?? isNativeApp;
  const storage = options.storage ?? defaultStorage;

  let accessToken: string | null = null;
  const listeners = new Set<TokenListener>();

  return {
    getAccessToken: () => accessToken,

    setAccessToken: (token) => {
      if (token === accessToken) return false;
      accessToken = token;
      listeners.forEach((listener) => listener(token));
      return true;
    },

    onAccessTokenChange: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getStoredRefreshToken: () => {
      if (!isNative()) return null;
      return storage()?.getItem(NATIVE_REFRESH_TOKEN_KEY) ?? null;
    },

    setStoredRefreshToken: (token) => {
      const store = storage();
      if (!store) return;
      if (!isNative() || !token) {
        store.removeItem(NATIVE_REFRESH_TOKEN_KEY);
        return;
      }
      store.setItem(NATIVE_REFRESH_TOKEN_KEY, token);
    },

    clearLegacyTokenStorage: () => {
      const store = storage();
      if (!store) return;
      LEGACY_KEYS.forEach((key) => store.removeItem(key));
    },
  };
}

/** Ilova bo'ylab yagona token saqlagich. */
export const tokenStore: TokenStore = createTokenStore();

export const getAccessToken = (): string | null => tokenStore.getAccessToken();
