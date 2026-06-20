import axiosInstance from './axios';
import type {
  Account,
  AccountAccessEntry,
  AccountAccessRequest,
  AccountBalanceSummary,
  AccountFilters,
  AccountRequest,
  AccountStatus,
  ApiResponse,
  Card,
  CardRequest,
  PagedResponse,
} from '../types';

export const accountsApi = {
  getAll: (filters: AccountFilters = {}) => {
    const params: Record<string, unknown> = {
      page: filters.page ?? 0,
      size: filters.size ?? 20,
    };
    if (filters.search) params.search = filters.search;
    if (filters.accountType) params.accountType = filters.accountType;
    if (filters.status) params.status = filters.status;
    return axiosInstance.get<ApiResponse<PagedResponse<Account>>>('/v1/accounts', { params });
  },
  getMy: (page = 0, size = 20) =>
    axiosInstance.get<ApiResponse<PagedResponse<Account>>>('/v1/accounts/my', { params: { page, size } }),
  getList: () => axiosInstance.get<ApiResponse<Account[]>>('/v1/accounts/list'),
  getTotalBalance: () => axiosInstance.get<ApiResponse<number>>('/v1/accounts/total-balance'),
  getById: (id: number) => axiosInstance.get<ApiResponse<Account>>(`/v1/accounts/${id}`),
  create: (data: AccountRequest) => axiosInstance.post<ApiResponse<Account>>('/v1/accounts', data),
  update: (id: number, data: AccountRequest) => axiosInstance.put<ApiResponse<Account>>(`/v1/accounts/${id}`, data),
  delete: (id: number) => axiosInstance.delete<ApiResponse<void>>(`/v1/accounts/${id}`),
  getByAccCode: (accCode: string) => axiosInstance.get<ApiResponse<Account>>(`/v1/accounts/by-code/${accCode}`),
  changeStatus: (id: number, status: AccountStatus) =>
    axiosInstance.patch<ApiResponse<Account>>(`/v1/accounts/${id}/status`, null, { params: { status } }),
  getBalanceSummary: (id: number, dateFrom?: string, dateTo?: string) => {
    const params: Record<string, unknown> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return axiosInstance.get<ApiResponse<AccountBalanceSummary>>(`/v1/accounts/${id}/balance-summary`, { params });
  },

  // Cards
  getCards: (accountId: number) => axiosInstance.get<ApiResponse<Card[]>>(`/v1/accounts/${accountId}/cards`),
  addCard: (accountId: number, data: CardRequest) =>
    axiosInstance.post<ApiResponse<Card>>(`/v1/accounts/${accountId}/cards`, data),
  updateCard: (cardId: number, data: CardRequest) => axiosInstance.put<ApiResponse<Card>>(`/v1/cards/${cardId}`, data),
  deleteCard: (cardId: number) => axiosInstance.delete<ApiResponse<void>>(`/v1/cards/${cardId}`),
  revealCard: (cardId: number) => axiosInstance.post<ApiResponse<Card>>(`/v1/cards/${cardId}/reveal`),

  // Access management
  getAccess: (accountId: number) =>
    axiosInstance.get<ApiResponse<AccountAccessEntry[]>>(`/v1/accounts/${accountId}/access`),
  grantAccess: (accountId: number, data: AccountAccessRequest) =>
    axiosInstance.post<ApiResponse<AccountAccessEntry>>(`/v1/accounts/${accountId}/access`, data),
  revokeAccess: (accountId: number, userId: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/v1/accounts/${accountId}/access/${userId}`),
};
