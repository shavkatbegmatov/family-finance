import api from './axios';
import type { ApiResponse, CredentialsInfo, PagedResponse } from '../types';
import { createExportApi } from './export.utils';

export interface UserActivity {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  description: string;
  changes: Record<string, {old: unknown; new: unknown}> | Record<string, unknown>;
  username: string | null;
  ipAddress: string;
  deviceType: string;
  browser: string;
  timestamp: string;
}

export interface UserDetail {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  active: boolean;
  mustChangePassword?: boolean;
  passwordChangedAt?: string;
  rolesText?: string;
  roleDetails?: { id: number; name: string; code: string }[];
  createdByUsername?: string;
  familyGroupName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserFilters {
  page?: number;
  size?: number;
  search?: string;
  active?: boolean;
}

export interface UpdateUserRequest {
  fullName: string;
  email?: string;
  phone?: string;
}

export interface ChangeUsernameRequest {
  newUsername: string;
}

export const usersApi = {
  /**
   * Search users with pagination and filters
   */
  search: async (filters: UserFilters = {}): Promise<PagedResponse<UserDetail>> => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.active !== undefined) params.append('active', filters.active.toString());

    const response = await api.get<ApiResponse<PagedResponse<UserDetail>>>(`/v1/users/search?${params}`);
    return response.data.data;
  },

  /**
   * Get user details by ID
   */
  getById: async (id: number): Promise<UserDetail> => {
    const response = await api.get<ApiResponse<UserDetail>>(`/v1/users/${id}`);
    return response.data.data;
  },

  /**
   * Update user details
   */
  update: async (id: number, data: UpdateUserRequest): Promise<UserDetail> => {
    const response = await api.put<ApiResponse<UserDetail>>(`/v1/users/${id}`, data);
    return response.data.data;
  },

  /**
   * Reset user password (admin action)
   */
  resetPassword: async (id: number): Promise<CredentialsInfo> => {
    const response = await api.put<ApiResponse<CredentialsInfo>>(`/v1/users/${id}/reset-password`);
    return response.data.data;
  },

  /**
   * Deactivate user account
   */
  deactivate: async (id: number): Promise<void> => {
    await api.put(`/v1/users/${id}/deactivate`);
  },

  /**
   * Activate user account
   */
  activate: async (id: number): Promise<void> => {
    await api.put(`/v1/users/${id}/activate`);
  },

  /**
   * Change user's username (admin action)
   */
  changeUsername: async (id: number, data: ChangeUsernameRequest): Promise<UserDetail> => {
    const response = await api.put<ApiResponse<UserDetail>>(
      `/v1/users/${id}/change-username`,
      data
    );
    return response.data.data;
  },

  /**
   * Check if username is available
   */
  checkUsername: async (username: string): Promise<boolean> => {
    const response = await api.get<ApiResponse<{ available: boolean }>>(
      `/v1/users/check-username?username=${encodeURIComponent(username)}`
    );
    return response.data.data.available;
  },

  /**
   * Get user activity history with pagination and filters
   */
  getUserActivity: async (
    userId: number,
    page: number = 0,
    size: number = 50,
    entityType?: string,
    action?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PagedResponse<UserActivity>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: 'createdAt,desc',
    });

    if (entityType) params.append('entityType', entityType);
    if (action) params.append('action', action);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<ApiResponse<PagedResponse<UserActivity>>>(
      `/v1/users/${userId}/activity?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Export user activity to Excel or PDF
   */
  exportUserActivity: async (
    userId: number,
    format: 'excel' | 'pdf',
    filters?: {
      entityType?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<void> => {
    const params = new URLSearchParams({
      format: format,
    });

    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(
      `/v1/users/${userId}/activity/export?${params.toString()}`,
      {
        responseType: 'blob',
      }
    );

    // Download file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const extension = format === 'excel' ? 'xlsx' : 'pdf';
    link.download = `user_activity_${userId}_${new Date().toISOString().split('T')[0]}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  // Export functionality
  export: createExportApi('/v1/users'),
};
