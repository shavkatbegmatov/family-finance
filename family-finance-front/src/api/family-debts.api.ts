import axiosInstance from './axios';
import { FamilyDebtRequest, DebtPaymentRequest, DebtType, DebtStatus } from '../types';

export const familyDebtsApi = {
  getAll: (page = 0, size = 20, type?: DebtType, status?: DebtStatus, search?: string) => {
    const params: Record<string, unknown> = { page, size };
    if (type) params.type = type;
    if (status) params.status = status;
    if (search) params.search = search;
    return axiosInstance.get('/v1/debts', { params });
  },
  getSummary: () => axiosInstance.get('/v1/debts/summary'),
  getById: (id: number) => axiosInstance.get(`/v1/debts/${id}`),
  create: (data: FamilyDebtRequest) => axiosInstance.post('/v1/debts', data),
  update: (id: number, data: FamilyDebtRequest) => axiosInstance.put(`/v1/debts/${id}`, data),
  delete: (id: number) => axiosInstance.delete(`/v1/debts/${id}`),
  addPayment: (debtId: number, data: DebtPaymentRequest) =>
    axiosInstance.post(`/v1/debts/${debtId}/payments`, data),
  getPayments: (debtId: number) => axiosInstance.get(`/v1/debts/${debtId}/payments`),
};
