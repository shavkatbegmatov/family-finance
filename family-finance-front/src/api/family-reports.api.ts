import type { AxiosResponse } from 'axios';
import axiosInstance from './axios';
import type {
  ApiResponse,
  CategoryType,
  IncomeExpenseReport,
  CategoryReport,
  MemberReport,
} from '../types';

export type ExportFormat = 'excel' | 'pdf';

const downloadResponseConfig = { responseType: 'blob' as const };

export const familyReportsApi = {
  getIncomeExpense: (from: string, to: string) =>
    axiosInstance.get<ApiResponse<IncomeExpenseReport>>('/v1/reports/income-expense', {
      params: { from, to },
    }),
  getCategoryReport: (type: CategoryType, from: string, to: string) =>
    axiosInstance.get<ApiResponse<CategoryReport[]>>('/v1/reports/category', {
      params: { type, from, to },
    }),
  getMemberReport: (from: string, to: string) =>
    axiosInstance.get<ApiResponse<MemberReport[]>>('/v1/reports/member', {
      params: { from, to },
    }),

  exportIncomeExpense: (from: string, to: string, format: ExportFormat): Promise<AxiosResponse<Blob>> =>
    axiosInstance.get('/v1/reports/income-expense/export', {
      params: { from, to, format },
      ...downloadResponseConfig,
    }),
  exportCategoryReport: (
    type: CategoryType,
    from: string,
    to: string,
    format: ExportFormat,
  ): Promise<AxiosResponse<Blob>> =>
    axiosInstance.get('/v1/reports/category/export', {
      params: { type, from, to, format },
      ...downloadResponseConfig,
    }),
  exportMemberReport: (from: string, to: string, format: ExportFormat): Promise<AxiosResponse<Blob>> =>
    axiosInstance.get('/v1/reports/member/export', {
      params: { from, to, format },
      ...downloadResponseConfig,
    }),
};
