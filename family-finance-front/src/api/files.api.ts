import api from './axios';
import type { ApiResponse } from '../types';

export interface StoredFileResponse {
  /** Absolyut ochiq URL (API host bilan) — `<img src>` da to'g'ridan-to'g'ri ishlatiladi. */
  url: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Fayl (avatar) yuklash — G10: ImgBB o'rniga ilovaning o'z backend'i (`stored_files`).
 * Backend faqat JPEG/PNG/WebP (magic-bytes) va 2 MB gacha qabul qiladi.
 */
export const filesApi = {
  uploadAvatar: async (blob: Blob): Promise<StoredFileResponse> => {
    const formData = new FormData();
    formData.append('file', blob, 'avatar.jpg');
    // DIQQAT: `api` instance'ining default Content-Type'i application/json — axios bu holda
    // FormData'ni JSON'ga aylantirib yuboradi (transformRequest, 2026-09-03 da 500 berdi).
    // 'multipart/form-data' berilsa axios sarlavhani olib tashlab, brauzer boundary bilan o'zi qo'yadi.
    const response = await api.post<ApiResponse<StoredFileResponse>>('/v1/files/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};
