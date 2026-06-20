import axiosInstance from './axios';
import type { ApiResponse, Budget, BudgetRequest, PagedResponse } from '../types';

export const budgetsApi = {
  getAll: (page = 0, size = 20) =>
    axiosInstance.get<ApiResponse<PagedResponse<Budget>>>('/v1/budgets', { params: { page, size } }),
  getActive: (date?: string) => {
    const params: Record<string, unknown> = {};
    if (date) params.date = date;
    return axiosInstance.get<ApiResponse<Budget[]>>('/v1/budgets/active', { params });
  },
  getById: (id: number) => axiosInstance.get<ApiResponse<Budget>>(`/v1/budgets/${id}`),
  create: (data: BudgetRequest) => axiosInstance.post<ApiResponse<Budget>>('/v1/budgets', data),
  update: (id: number, data: BudgetRequest) => axiosInstance.put<ApiResponse<Budget>>(`/v1/budgets/${id}`, data),
  delete: (id: number) => axiosInstance.delete<ApiResponse<void>>(`/v1/budgets/${id}`),
};
