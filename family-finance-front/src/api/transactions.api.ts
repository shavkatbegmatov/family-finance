import axiosInstance from './axios';
import { TransactionRequest, TransactionFilters } from '../types';

export const transactionsApi = {
  getAll: (page = 0, size = 20, filters?: TransactionFilters) => {
    const params: Record<string, unknown> = { page, size };
    if (filters?.type) params.type = filters.type;
    if (filters?.accountId) params.accountId = filters.accountId;
    if (filters?.categoryId) params.categoryId = filters.categoryId;
    if (filters?.memberId) params.memberId = filters.memberId;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;
    return axiosInstance.get('/v1/transactions', { params });
  },
  getRecent: () => axiosInstance.get('/v1/transactions/recent'),
  getById: (id: number) => axiosInstance.get(`/v1/transactions/${id}`),
  create: (data: TransactionRequest) => axiosInstance.post('/v1/transactions', data),
  update: (id: number, data: TransactionRequest) => axiosInstance.put(`/v1/transactions/${id}`, data),
  reverse: (id: number, reason: string) => axiosInstance.post(`/v1/transactions/${id}/reverse`, { reason }),
};
