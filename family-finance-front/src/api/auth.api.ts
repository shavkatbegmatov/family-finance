import api from './axios';
import type { ApiResponse, ChangePasswordRequest, JwtResponse, LoginRequest, RegisterRequest, TelegramCompleteRequest, TelegramStatusResponse, User } from '../types';

export const authApi = {
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/v1/auth/register', data);
    return response.data.data;
  },

  login: async (data: LoginRequest): Promise<JwtResponse> => {
    const response = await api.post<ApiResponse<JwtResponse>>('/v1/auth/login', data);
    return response.data.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/v1/auth/me');
    return response.data.data;
  },

  refreshToken: async (refreshToken: string): Promise<JwtResponse> => {
    const response = await api.post<ApiResponse<JwtResponse>>(
      '/v1/auth/refresh-token',
      null,
      { params: { refreshToken } }
    );
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post<ApiResponse<void>>('/v1/auth/logout');
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await api.post<ApiResponse<void>>('/v1/auth/change-password', data);
  },

  // ===== Telegram deep-link auth (Blok B) =====

  telegramInit: async (): Promise<{ requestId: string }> => {
    const response = await api.post<ApiResponse<{ requestId: string }>>('/v1/auth/telegram/init');
    return response.data.data;
  },

  telegramStatus: async (requestId: string): Promise<TelegramStatusResponse> => {
    const response = await api.get<ApiResponse<TelegramStatusResponse>>('/v1/auth/telegram/status', {
      params: { requestId },
    });
    return response.data.data;
  },

  telegramComplete: async (data: TelegramCompleteRequest): Promise<JwtResponse> => {
    const response = await api.post<ApiResponse<JwtResponse>>('/v1/auth/telegram/complete', data);
    return response.data.data;
  },
};
