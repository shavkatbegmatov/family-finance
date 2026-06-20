import axiosInstance from './axios';
import type {
  ApiResponse,
  BulkOperationResponse,
  PagedResponse,
  Transaction,
  TransactionFilters,
  TransactionRequest,
} from '../types';

export const transactionsApi = {
  getAll: (page = 0, size = 20, filters?: TransactionFilters) => {
    const params: Record<string, unknown> = { page, size };
    if (filters?.type) params.type = filters.type;
    if (filters?.accountId) params.accountId = filters.accountId;
    if (filters?.categoryId) params.categoryId = filters.categoryId;
    if (filters?.memberId) params.memberId = filters.memberId;
    if (filters?.from) params.from = filters.from;
    if (filters?.to) params.to = filters.to;
    if (filters?.search) params.search = filters.search;
    return axiosInstance.get<ApiResponse<PagedResponse<Transaction>>>('/v1/transactions', { params });
  },
  getRecent: () => axiosInstance.get<ApiResponse<Transaction[]>>('/v1/transactions/recent'),
  getById: (id: number) => axiosInstance.get<ApiResponse<Transaction>>(`/v1/transactions/${id}`),
  create: (data: TransactionRequest) => axiosInstance.post<ApiResponse<Transaction>>('/v1/transactions', data),
  update: (id: number, data: TransactionRequest) =>
    axiosInstance.put<ApiResponse<Transaction>>(`/v1/transactions/${id}`, data),
  reverse: (id: number, reason: string) =>
    axiosInstance.post<ApiResponse<Transaction>>(`/v1/transactions/${id}/reverse`, { reason }),
  getByAccount: (accountId: number, page = 0, size = 10) =>
    axiosInstance.get<ApiResponse<PagedResponse<Transaction>>>(`/v1/transactions/account/${accountId}`, {
      params: { page, size },
    }),
  confirm: (id: number) => axiosInstance.patch<ApiResponse<Transaction>>(`/v1/transactions/${id}/confirm`),
  cancel: (id: number, reason: string) =>
    axiosInstance.patch<ApiResponse<Transaction>>(`/v1/transactions/${id}/cancel`, { reason }),
  bulkReverse: (transactionIds: number[], reason: string) =>
    axiosInstance.post<ApiResponse<BulkOperationResponse>>('/v1/transactions/bulk-reverse', { transactionIds, reason }),
  bulkCategorize: (transactionIds: number[], categoryId: number) =>
    axiosInstance.patch<ApiResponse<BulkOperationResponse>>('/v1/transactions/bulk-categorize', { transactionIds, categoryId }),
};
