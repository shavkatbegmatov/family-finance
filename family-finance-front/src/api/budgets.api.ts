import axiosInstance from './axios';
import { BudgetRequest } from '../types';

export const budgetsApi = {
  getAll: (page = 0, size = 20) => axiosInstance.get('/v1/budgets', { params: { page, size } }),
  getActive: (date?: string) => {
    const params: Record<string, unknown> = {};
    if (date) params.date = date;
    return axiosInstance.get('/v1/budgets/active', { params });
  },
  getById: (id: number) => axiosInstance.get(`/v1/budgets/${id}`),
  create: (data: BudgetRequest) => axiosInstance.post('/v1/budgets', data),
  update: (id: number, data: BudgetRequest) => axiosInstance.put(`/v1/budgets/${id}`, data),
  delete: (id: number) => axiosInstance.delete(`/v1/budgets/${id}`),
};
