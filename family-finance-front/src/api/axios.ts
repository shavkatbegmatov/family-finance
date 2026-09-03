import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { authSession } from '../auth/authSession';
import { getAccessToken } from '../auth/tokenStore';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  // Bu jonli serverda env fayldagi domenni, lokalda esa '/api' ni ishlatadi
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // D12-PR5: refresh token httpOnly cookie'da (Path=/api/v1/auth). Prod'da API alohida
  // subdomen (cross-origin, same-site) — cookie faqat withCredentials bilan yuboriladi/qabul
  // qilinadi. Backend CORS allowCredentials=true + aniq origin ro'yxati bilan javob beradi.
  withCredentials: true,
});

type RetryRequestConfig = AxiosRequestConfig & { _retry?: boolean };

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/v1/auth/login',
  '/v1/auth/register',
];

const isRefreshRequest = (url?: string) => {
  return Boolean(url && url.includes('/v1/auth/refresh-token'));
};

const shouldSkipRefresh = (url?: string) => {
  if (!url) {
    return false;
  }
  return AUTH_ENDPOINTS_WITHOUT_REFRESH.some((endpoint) => url.includes(endpoint));
};

const clearAuthAndRedirect = () => {
  if (window.location.pathname !== '/login') {
    toast.error('Sessioningiz tugadi. Qayta kiring.');
    useAuthStore.getState().logoutWithRedirect(1000, { captureCurrentPath: true });
  }
};

api.interceptors.request.use(
  (config) => {
    // D12-PR5: access token faqat xotirada (tokenStore), localStorage'da emas
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshRequest(originalRequest.url)) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      if (shouldSkipRefresh(originalRequest.url)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // 401 bergan token "eski" deb uzatiladi: boshqa tab allaqachon yangilagan bo'lsa,
        // HTTP refresh o'rniga o'sha token olinadi. Parallel 401'lar bitta promise'ni kutadi.
        const staleToken = getAccessToken();
        const accessToken = await authSession.refreshAccessToken(staleToken);
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403) {
      const responseData = error.response.data as { message?: string } | undefined;
      const message =
        responseData?.message || "Sizda bu amalni bajarish uchun ruxsat yo'q";

      toast.error(message, {
        id: 'permission-denied',
        duration: 4000,
        icon: '🔒',
      });
    }

    return Promise.reject(error);
  }
);

export default api;
