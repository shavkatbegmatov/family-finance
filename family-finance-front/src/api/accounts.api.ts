import axiosInstance from './axios';
import { AccountRequest, CardRequest, AccountAccessRequest } from '../types';

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
  getByAccCode: (accCode: string) => axiosInstance.get(`/v1/accounts/by-code/${accCode}`),

  // Cards
  getCards: (accountId: number) => axiosInstance.get(`/v1/accounts/${accountId}/cards`),
  addCard: (accountId: number, data: CardRequest) => axiosInstance.post(`/v1/accounts/${accountId}/cards`, data),
  updateCard: (cardId: number, data: CardRequest) => axiosInstance.put(`/v1/cards/${cardId}`, data),
  deleteCard: (cardId: number) => axiosInstance.delete(`/v1/cards/${cardId}`),
  revealCard: (cardId: number) => axiosInstance.post(`/v1/cards/${cardId}/reveal`),

  // Access management
  getAccess: (accountId: number) => axiosInstance.get(`/v1/accounts/${accountId}/access`),
  grantAccess: (accountId: number, data: AccountAccessRequest) => axiosInstance.post(`/v1/accounts/${accountId}/access`, data),
  revokeAccess: (accountId: number, userId: number) => axiosInstance.delete(`/v1/accounts/${accountId}/access/${userId}`),
};
