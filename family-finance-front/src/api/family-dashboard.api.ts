import axiosInstance from './axios';
import type {
  ApiResponse,
  FamilyDashboardStats,
  FamilyChartData,
  Transaction,
} from '../types';

export const familyDashboardApi = {
  getStats: () => axiosInstance.get<ApiResponse<FamilyDashboardStats>>('/v1/dashboard/stats'),
  getCharts: () => axiosInstance.get<ApiResponse<FamilyChartData>>('/v1/dashboard/charts'),
  getRecentTransactions: () =>
    axiosInstance.get<ApiResponse<Transaction[]>>('/v1/dashboard/recent-transactions'),
};
