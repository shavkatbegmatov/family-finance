import axiosInstance from './axios';
import type { ApiResponse } from '../types';

export interface TagResponse {
  id: number;
  name: string;
  color?: string;
}

export interface TagRequest {
  name: string;
  color?: string;
}

export const tagsApi = {
  getAll: (search?: string) =>
    axiosInstance.get<ApiResponse<TagResponse[]>>('/v1/tags', { params: search ? { search } : {} }),
  create: (data: TagRequest) => axiosInstance.post<ApiResponse<TagResponse>>('/v1/tags', data),
  update: (id: number, data: TagRequest) => axiosInstance.put<ApiResponse<TagResponse>>(`/v1/tags/${id}`, data),
  delete: (id: number) => axiosInstance.delete<ApiResponse<void>>(`/v1/tags/${id}`),
};
