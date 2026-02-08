import axiosInstance from './axios';

export const familyDashboardApi = {
  getStats: () => axiosInstance.get('/v1/dashboard/stats'),
  getCharts: () => axiosInstance.get('/v1/dashboard/charts'),
  getRecentTransactions: () => axiosInstance.get('/v1/dashboard/recent-transactions'),
};
