import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';

/** Backend `ApiResponse.errorCode` qiymatlari (backend `enums/ErrorCode` bilan izchil). */
export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

/**
 * Backend `ApiResponse` xato javobining tanasi (`{ success, message, errorCode, ... }`).
 */
interface ApiErrorBody {
  message?: string;
  errorCode?: string;
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
 * Backend xato kodi (`ApiResponse.errorCode`) — xatoni o'zgaruvchan xabar matniga emas, barqaror
 * kodga tayanib handle qilish uchun (masalan `getApiErrorCode(e) === 'RATE_LIMITED'`).
 * Axios bo'lmasa yoki kod yo'q bo'lsa `undefined`.
 */
export function getApiErrorCode(error: unknown): ApiErrorCode | undefined {
  if (isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (typeof body?.errorCode === 'string') {
      return body.errorCode as ApiErrorCode;
    }
  }
  return undefined;
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
