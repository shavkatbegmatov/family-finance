import axiosInstance from './axios';
import { AccountRequest } from '../types';

export const accountsApi = {
  getAll: (page = 0, size = 20, search?: string) => {
    const params: Record<string, unknown> = { page, size };
    if (search) params.search = search;
    return axiosInstance.get('/v1/accounts', { params });
  },
  getList: () => axiosInstance.get('/v1/accounts/list'),
  getTotalBalance: () => axiosInstance.get('/v1/accounts/total-balance'),
  getById: (id: number) => axiosInstance.get(`/v1/accounts/${id}`),
  create: (data: AccountRequest) => axiosInstance.post('/v1/accounts', data),
  update: (id: number, data: AccountRequest) => axiosInstance.put(`/v1/accounts/${id}`, data),
  delete: (id: number) => axiosInstance.delete(`/v1/accounts/${id}`),
};
