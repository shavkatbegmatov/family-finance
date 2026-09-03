/**
 * Sessiya koordinatori (D12-PR5): jimgina refresh, tablar orasida token almashish va
 * refresh-rotatsiya poygasidan himoya.
 *
 * Muammo: refresh token har ishlatilganda ROTATSIYA qilinadi (V44 — eski token darhol rad
 * etiladi). Access token endi faqat xotirada, shuning uchun HAR tab (ayniqsa brauzer bir nechta
 * tabni birdan tiklaganda) yuklanishda refresh qilishi kerak. Ikki tab bir vaqtda bitta cookie
 * bilan refresh qilsa, ikkinchisi rotatsiyalangan tokenni yuboradi → 401 → majburiy logout.
 *
 * Yechim (barchasi progressive — API bo'lmasa oddiy refresh'ga tushadi):
 * 1. `BroadcastChannel`: refresh/login'dan keyingi token boshqa tablarga tarqatiladi;
 *    yuklanayotgan tab avval boshqa tablardan tokenni SO'RAYDI (150 ms), topilsa refresh shart emas.
 * 2. `navigator.locks` (Web Locks): refresh faqat bitta tabda ketma-ket bajariladi; lock'ni
 *    kutgan tab lock olgach yana avval boshqa tablardan so'raydi.
 * 3. Bitta tab ichida parallel 401'lar bitta in-flight promise'ni kutadi (axios interceptor).
 *
 * Factory + singleton: `createAuthSession(platform)` testlarda soxta kanal/HTTP bilan ikkita
 * "tab"ni bir jarayonda modellashtirish imkonini beradi; ilova `authSession` ni ishlatadi.
 */
import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import type { ApiResponse, JwtResponse } from '../types';
import { createTokenStore, isNativeApp, tokenStore, type TokenStore } from './tokenStore';

export type AuthMessage = { type: 'token-request' } | { type: 'token'; token: string };

/** BroadcastChannel'ning ishlatiladigan qismi — testlarda soxta nusxa bilan almashtiriladi. */
export interface AuthChannel {
  postMessage(message: AuthMessage): void;
  addEventListener(type: 'message', listener: (event: { data: AuthMessage }) => void): void;
  removeEventListener(type: 'message', listener: (event: { data: AuthMessage }) => void): void;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken?: string | null;
}

export interface AuthSessionPlatform {
  tokenStore: TokenStore;
  /** `null` — kanal yo'q (eski brauzer/SSR): tablar o'zaro gaplashmaydi. */
  createChannel: () => AuthChannel | null;
  /** Web Locks; `null` bo'lsa lock'siz ishlaydi. Vazifa yangi access tokenni qaytaradi. */
  requestLock: ((name: string, task: () => Promise<string>) => Promise<string>) | null;
  /** HTTP refresh chaqiruvi (native'da `refreshToken` parametr bilan, web'da cookie orqali). */
  refreshRequest: (refreshToken: string | null) => Promise<RefreshResult>;
  /** Best-effort server logout (cookie tozalash + sessiyani bekor qilish). */
  revokeRequest: (accessToken: string) => Promise<void>;
  isNative: () => boolean;
  now: () => number;
}

export interface AuthSession {
  /** Login/switch-scope'dan kelgan tokenni xotiraga oladi va boshqa tablarga tarqatadi. */
  adoptAccessToken(token: string): void;
  /**
   * Yangi access token oladi. `staleToken` — 401 bergan token (yoki boot'da `null`):
   * boshqa tabdan kelgan token undan farq qilsa, HTTP refresh qilinmaydi.
   * Parallel chaqiruvlar bitta promise'ni bo'lishadi.
   */
  refreshAccessToken(staleToken?: string | null): Promise<string>;
  /** Ilova yuklanishida: xotirada token bo'lmasa refresh; `false` — sessiya tiklanmadi. */
  bootstrapSession(): Promise<boolean>;
  /** Client-side logout yo'llari uchun (idle, cross-tab, sessiya monitori): xato yutiladi. */
  revokeServerSession(accessToken: string): void;
  /** Kanal/listener'larni yopadi (testlar). */
  dispose(): void;
}

const CHANNEL_NAME = 'family-finance-auth';
const REFRESH_LOCK_NAME = 'family-finance-auth-refresh';
/** Boshqa tablardan token kutish — ular xotiradan darhol javob beradi. */
const TOKEN_REQUEST_TIMEOUT_MS = 150;
/** Muddati shunchalik yaqin token boshqa tabga taklif qilinmaydi (soat farqi/tarmoq zaxirasi). */
const TOKEN_MIN_REMAINING_MS = 30_000;
const MS_PER_SECOND = 1000;
const JWT_PAYLOAD_INDEX = 1;
const JWT_PARTS = 3;

/** JWT `exp` (soniya) — imzo tekshirilmaydi, faqat "hali yaroqlimi" uchun. */
export function readJwtExpiryMs(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== JWT_PARTS) return null;
  try {
    const base64 = parts[JWT_PAYLOAD_INDEX].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * MS_PER_SECOND : null;
  } catch {
    return null;
  }
}

function isTokenUsable(token: string, now: number): boolean {
  const expiry = readJwtExpiryMs(token);
  // exp o'qilmasa (test/noodatiy token) — ishlatiladi; server baribir tekshiradi
  return expiry === null || expiry - now > TOKEN_MIN_REMAINING_MS;
}

function defaultCreateChannel(): AuthChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME) as unknown as AuthChannel;
  } catch {
    return null;
  }
}

function defaultRequestLock(): AuthSessionPlatform['requestLock'] {
  if (typeof navigator === 'undefined' || !navigator.locks) return null;
  // Lock callback tugaguncha ushlab turiladi; natija tashqariga o'zgaruvchi orqali chiqariladi
  // (lib.dom `request` generik'i Promise qaytaruvchi callback'ni Promise<Promise<T>> deb tiplaydi).
  return async (name, task) => {
    let result: string | undefined;
    await navigator.locks.request(name, async () => {
      result = await task();
    });
    if (result === undefined) {
      throw new Error('Refresh lock vazifasi natija bermadi');
    }
    return result;
  };
}

async function defaultRefreshRequest(refreshToken: string | null): Promise<RefreshResult> {
  const response = await axios.post<ApiResponse<JwtResponse>>(
    `${API_BASE_URL}/v1/auth/refresh-token`,
    null,
    {
      // Web: httpOnly cookie ketadi (cross-origin API uchun withCredentials shart)
      withCredentials: true,
      // Native: cookie same-site emas → legacy parametr
      params: refreshToken ? { refreshToken } : undefined,
    },
  );
  const data = response.data?.data;
  if (!data?.accessToken) {
    throw new Error('Refresh javobida accessToken yoʻq');
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken ?? null };
}

async function defaultRevokeRequest(accessToken: string): Promise<void> {
  // fetch + keepalive: logout'dan keyingi darhol navigatsiyada ham so'rov yetib boradi
  await fetch(`${API_BASE_URL}/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
    keepalive: true,
  });
}

export function createAuthSession(platform: AuthSessionPlatform): AuthSession {
  const { tokenStore: tokens } = platform;
  const channel = platform.createChannel();
  let inflight: Promise<string> | null = null;

  const publishToken = (token: string) => {
    channel?.postMessage({ type: 'token', token });
  };

  const onChannelMessage = (event: { data: AuthMessage }) => {
    const message = event.data;
    if (message?.type === 'token-request') {
      const token = tokens.getAccessToken();
      if (token && isTokenUsable(token, platform.now())) publishToken(token);
      return;
    }
    if (message?.type === 'token' && message.token) {
      // Boshqa tab yangilagan/kirgan token — qayta tarqatilmaydi (aks-sado yo'q)
      tokens.setAccessToken(message.token);
    }
  };
  channel?.addEventListener('message', onChannelMessage);

  const requestTokenFromTabs = (): Promise<string | null> => {
    if (!channel) return Promise.resolve(null);
    return new Promise((resolve) => {
      const finish = (token: string | null) => {
        clearTimeout(timer);
        channel.removeEventListener('message', listener);
        resolve(token);
      };
      const listener = (event: { data: AuthMessage }) => {
        if (event.data?.type === 'token' && event.data.token) finish(event.data.token);
      };
      const timer = setTimeout(() => finish(null), TOKEN_REQUEST_TIMEOUT_MS);
      channel.addEventListener('message', listener);
      channel.postMessage({ type: 'token-request' });
    });
  };

  const isFreshReplacement = (candidate: string | null, staleToken: string | null): candidate is string =>
    Boolean(candidate) && candidate !== staleToken && isTokenUsable(candidate as string, platform.now());

  const refreshUnderLock = async (staleToken: string | null): Promise<string> => {
    // Lock kutayotganimizda boshqa tab tokenni tarqatgan bo'lishi mumkin
    const current = tokens.getAccessToken();
    if (isFreshReplacement(current, staleToken)) return current;

    const shared = await requestTokenFromTabs();
    if (isFreshReplacement(shared, staleToken)) {
      tokens.setAccessToken(shared);
      return shared;
    }

    const storedRefresh = platform.isNative() ? tokens.getStoredRefreshToken() : null;
    if (platform.isNative() && !storedRefresh) {
      throw new Error('Native: saqlangan refresh token yoʻq');
    }
    const result = await platform.refreshRequest(storedRefresh);
    if (platform.isNative() && result.refreshToken) {
      tokens.setStoredRefreshToken(result.refreshToken);
    }
    tokens.setAccessToken(result.accessToken);
    publishToken(result.accessToken);
    return result.accessToken;
  };

  const refreshAccessToken = (staleToken: string | null = tokens.getAccessToken()): Promise<string> => {
    if (!inflight) {
      const task = () => refreshUnderLock(staleToken);
      const run = platform.requestLock ? platform.requestLock(REFRESH_LOCK_NAME, task) : task();
      inflight = run.finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };

  return {
    adoptAccessToken: (token) => {
      tokens.setAccessToken(token);
      publishToken(token);
    },

    refreshAccessToken,

    bootstrapSession: async () => {
      if (tokens.getAccessToken()) return true;
      try {
        await refreshAccessToken(null);
        return true;
      } catch {
        return false;
      }
    },

    revokeServerSession: (accessToken) => {
      platform.revokeRequest(accessToken).catch(() => {
        // Best-effort: token allaqachon yaroqsiz yoki tarmoq yo'q — logout baribir davom etadi
      });
    },

    dispose: () => {
      channel?.removeEventListener('message', onChannelMessage);
    },
  };
}

/** Brauzer uchun standart platforma (ilova va testlar `createAuthSession` orqali almashtira oladi). */
export function createBrowserPlatform(store: TokenStore = createTokenStore()): AuthSessionPlatform {
  return {
    tokenStore: store,
    createChannel: defaultCreateChannel,
    requestLock: defaultRequestLock(),
    refreshRequest: defaultRefreshRequest,
    revokeRequest: defaultRevokeRequest,
    isNative: isNativeApp,
    now: () => Date.now(),
  };
}

/** Ilova bo'ylab yagona sessiya koordinatori (singleton `tokenStore` bilan). */
export const authSession: AuthSession = createAuthSession(createBrowserPlatform(tokenStore));
