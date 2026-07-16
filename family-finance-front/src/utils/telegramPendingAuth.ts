import { TELEGRAM_POLL_TIMEOUT_MS } from '../config/constants';

const STORAGE_KEY = 'telegramAuthPending';

export interface PendingTelegramAuth {
  requestId: string;
  startedAt: number;
}

/**
 * Telegram tasdiqini kutayotgan so'rov. Deep-link Telegram ilovasini ochadi va brauzer tab'i
 * fonda qoladi — tab qayta yuklansa (yoki Chrome uni xotira uchun tashlab yuborsa) modal
 * yo'qolib, polling to'xtardi va bot "Tasdiqlandi" degani bilan kirish davom etmasdi.
 * Shu sabab requestId saqlanadi: sahifaga qaytilganda kirish o'sha joyidan davom etadi.
 *
 * <p>sessionStorage — so'rov shu tab'ga tegishli (boshqa tab'lar aralashmasin) va brauzer
 * yopilganda o'z-o'zidan tozalanadi. Backend TTL 5 daqiqa ({@link TELEGRAM_POLL_TIMEOUT_MS}).</p>
 */
export function savePendingTelegramAuth(requestId: string): PendingTelegramAuth {
  const pending: PendingTelegramAuth = { requestId, startedAt: Date.now() };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // sessionStorage yopiq (private rejim/kvota) — resume ishlamaydi, oqim buzilmaydi
  }
  return pending;
}

/** Muddati o'tmagan kutilayotgan so'rov; yo'q yoki eskirgan bo'lsa null (va tozalanadi). */
export function readPendingTelegramAuth(): PendingTelegramAuth | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  const parsed = parsePending(raw);
  if (!parsed || Date.now() - parsed.startedAt > TELEGRAM_POLL_TIMEOUT_MS) {
    clearPendingTelegramAuth();
    return null;
  }
  return parsed;
}

export function clearPendingTelegramAuth(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // e'tiborsiz — o'qishda ham himoyalangan
  }
}

function parsePending(raw: string): PendingTelegramAuth | null {
  try {
    const value = JSON.parse(raw) as Partial<PendingTelegramAuth>;
    if (typeof value?.requestId !== 'string' || typeof value?.startedAt !== 'number') {
      return null;
    }
    return { requestId: value.requestId, startedAt: value.startedAt };
  } catch {
    return null;
  }
}
