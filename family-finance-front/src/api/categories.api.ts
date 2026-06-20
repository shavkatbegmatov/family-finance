import axiosInstance from './axios';
import type { ApiResponse, CategoryType, FinanceCategory, FinanceCategoryRequest, PagedResponse } from '../types';

export const categoriesApi = {
  getAll: (page = 0, size = 50) =>
    axiosInstance.get<ApiResponse<PagedResponse<FinanceCategory>>>('/v1/categories', { params: { page, size } }),
  getByType: (type: CategoryType) =>
    axiosInstance.get<ApiResponse<FinanceCategory[]>>('/v1/categories/by-type', { params: { type } }),
  getTree: (type?: CategoryType) => {
    const params: Record<string, unknown> = {};
    if (type) params.type = type;
    return axiosInstance.get<ApiResponse<FinanceCategory[]>>('/v1/categories/tree', { params });
  },
  getById: (id: number) => axiosInstance.get<ApiResponse<FinanceCategory>>(`/v1/categories/${id}`),
  create: (data: FinanceCategoryRequest) => axiosInstance.post<ApiResponse<FinanceCategory>>('/v1/categories', data),
  update: (id: number, data: FinanceCategoryRequest) =>
    axiosInstance.put<ApiResponse<FinanceCategory>>(`/v1/categories/${id}`, data),
  delete: (id: number) => axiosInstance.delete<ApiResponse<void>>(`/v1/categories/${id}`),
};
