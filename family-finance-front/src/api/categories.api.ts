import axiosInstance from './axios';
import { FinanceCategoryRequest, CategoryType } from '../types';

export const categoriesApi = {
  getAll: (page = 0, size = 50) => axiosInstance.get('/v1/categories', { params: { page, size } }),
  getByType: (type: CategoryType) => axiosInstance.get('/v1/categories/by-type', { params: { type } }),
  getTree: (type?: CategoryType) => {
    const params: Record<string, unknown> = {};
    if (type) params.type = type;
    return axiosInstance.get('/v1/categories/tree', { params });
  },
  getById: (id: number) => axiosInstance.get(`/v1/categories/${id}`),
  create: (data: FinanceCategoryRequest) => axiosInstance.post('/v1/categories', data),
  update: (id: number, data: FinanceCategoryRequest) => axiosInstance.put(`/v1/categories/${id}`, data),
  delete: (id: number) => axiosInstance.delete(`/v1/categories/${id}`),
};
