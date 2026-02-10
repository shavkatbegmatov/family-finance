import axios, { type AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/constants';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Refresh Queue pattern ──────────────────────────────────
// Bir vaqtda 5-6 ta so'rov 401 olsa, faqat BITTA refresh yuboriladi.
// Qolgan so'rovlar navbatda kutib, yangi token bilan qayta yuboriladi.
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  });
  failedQueue = [];
};

const clearAuthAndRedirect = () => {
  if (window.location.pathname !== '/login') {
    toast.error('Sessioningiz tugadi. Qayta kiring.');
    useAuthStore.getState().logoutWithRedirect(1000);
  }
};
// ────────────────────────────────────────────────────────────

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // localStorage mavjud emas (private browsing)
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Refresh endpointining o'zi 401 qaytarsa — loop bo'lmasin
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      let refreshToken: string | null = null;
      try {
        refreshToken = localStorage.getItem('refreshToken');
      } catch {
        // localStorage mavjud emas
      }
      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      // Agar boshqa so'rov allaqachon refresh qilayotgan bo'lsa — navbatga qo'shilish
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` };
          return api(originalRequest);
        });
      }

      // Birinchi 401 — refresh boshlanadi
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/v1/auth/refresh-token`,
          null,
          { params: { refreshToken } }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        try {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        } catch {
          // localStorage mavjud emas
        }

        // Navbatdagi barcha so'rovlarni yangi token bilan qayta yuborish
        processQueue(null, accessToken);

        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${accessToken}` };
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh muvaffaqiyatsiz — barcha navbatdagilarni ham reject qilish
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      const message = error.response?.data?.message || "Sizda bu amalni bajarish uchun ruxsat yo'q";

      toast.error(message, {
        duration: 4000,
        icon: '🔒',
      });
    }

    return Promise.reject(error);
  }
);

export default api;
