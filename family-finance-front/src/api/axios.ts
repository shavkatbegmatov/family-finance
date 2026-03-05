import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/constants';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryRequestConfig = AxiosRequestConfig & { _retry?: boolean };

interface RefreshResponsePayload {
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/v1/auth/login',
  '/v1/auth/register',
];

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
      return;
    }
    reject(error);
  });
  failedQueue = [];
};

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
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (config.headers?.Authorization) {
        delete config.headers.Authorization;
      }
    } catch {
      // localStorage may be unavailable
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

      let refreshToken: string | null = null;
      try {
        refreshToken = localStorage.getItem('refreshToken');
      } catch {
        // localStorage may be unavailable
      }

      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<RefreshResponsePayload>(
          `${API_BASE_URL}/v1/auth/refresh-token`,
          null,
          { params: { refreshToken } }
        );

        const accessToken = refreshResponse.data?.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.data?.refreshToken;

        if (!accessToken || !newRefreshToken) {
          throw new Error('Invalid refresh token response');
        }

        try {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        } catch {
          // localStorage may be unavailable
        }

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      const responseData = error.response.data as { message?: string } | undefined;
      const message =
        responseData?.message || "Sizda bu amalni bajarish uchun ruxsat yo'q";

      toast.error(message, {
        duration: 4000,
        icon: '🔒',
      });
    }

    return Promise.reject(error);
  }
);

export default api;
