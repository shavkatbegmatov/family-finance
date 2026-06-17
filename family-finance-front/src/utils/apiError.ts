import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';

/**
 * Backend `ApiResponse` xato javobining tanasi (`{ success, message, ... }`).
 * Bizga faqat `message` kerak.
 */
interface ApiErrorBody {
  message?: string;
}

const DEFAULT_ERROR_MESSAGE = 'Xato yuz berdi';

/**
 * Axios (yoki boshqa) xatosidan foydalanuvchiga ko'rsatiladigan xabarni ajratadi.
 *
 * Backend har doim `ApiResponse.error(message)` qaytaradi, shuning uchun
 * `error.response.data.message` — birламchi manba. Tarmoq xatosi yoki axios
 * bo'lmagan xatolarda `fallback` qaytariladi (texnik xabar sizib chiqmasligi uchun).
 *
 * Avval ~20 joyda `error.response?.data?.message || '...'` qo'lda takrorlangan edi
 * (har biri xato tipini ham qo'lda yozardi) — shu util ularning yagona manbasi.
 */
export function getApiErrorMessage(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  if (isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (typeof body?.message === 'string' && body.message.trim().length > 0) {
      return body.message;
    }
  }
  return fallback;
}

/** Axios xatosining HTTP status kodi (axios bo'lmasa `undefined`). */
export function getApiErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

/**
 * Xatoni `toast.error` orqali ko'rsatadi.
 *
 * 403 (ruxsat yo'q) axios response-interceptor'ida (`api/axios.ts`) allaqachon
 * markazlashgan toast qiladi — bu yerda uni o'tkazib yuboramiz, aks holda
 * foydalanuvchi ikki marta bir xil "ruxsat yo'q" toastini ko'radi. Mutatsiya
 * `onError` larida avval har joyda `if (status !== 403) { ... }` qo'lda yozilgan edi.
 */
export function toastApiError(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): void {
  if (getApiErrorStatus(error) === 403) {
    return;
  }
  toast.error(getApiErrorMessage(error, fallback));
}
