import axiosInstance from './axios';
import type {
  ApiResponse,
  PagedResponse,
  FamilyDebt,
  FamilyDebtRequest,
  DebtPayment,
  DebtPaymentRequest,
  DebtType,
  DebtStatus,
} from '../types';

/** Qarzlar bo'yicha umumiy xulosa (berilgan/olingan jami). */
export interface DebtSummaryResponse {
  totalGiven: number;
  totalTaken: number;
}

export const familyDebtsApi = {
  getAll: (page = 0, size = 20, type?: DebtType, status?: DebtStatus, search?: string) => {
    const params: Record<string, unknown> = { page, size };
    if (type) params.type = type;
    if (status) params.status = status;
    if (search) params.search = search;
    return axiosInstance.get<ApiResponse<PagedResponse<FamilyDebt>>>('/v1/debts', { params });
  },
  getSummary: () => axiosInstance.get<ApiResponse<DebtSummaryResponse>>('/v1/debts/summary'),
  getById: (id: number) => axiosInstance.get<ApiResponse<FamilyDebt>>(`/v1/debts/${id}`),
  create: (data: FamilyDebtRequest) => axiosInstance.post<ApiResponse<FamilyDebt>>('/v1/debts', data),
  update: (id: number, data: FamilyDebtRequest) => axiosInstance.put<ApiResponse<FamilyDebt>>(`/v1/debts/${id}`, data),
  delete: (id: number) => axiosInstance.delete<ApiResponse<void>>(`/v1/debts/${id}`),
  addPayment: (debtId: number, data: DebtPaymentRequest) =>
    axiosInstance.post<ApiResponse<DebtPayment>>(`/v1/debts/${debtId}/payments`, data),
  getPayments: (debtId: number) =>
    axiosInstance.get<ApiResponse<DebtPayment[]>>(`/v1/debts/${debtId}/payments`),
};
