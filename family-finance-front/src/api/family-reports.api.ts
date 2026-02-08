import axiosInstance from './axios';
import { CategoryType } from '../types';

export const familyReportsApi = {
  getIncomeExpense: (from: string, to: string) =>
    axiosInstance.get('/v1/reports/income-expense', { params: { from, to } }),
  getCategoryReport: (type: CategoryType, from: string, to: string) =>
    axiosInstance.get('/v1/reports/category', { params: { type, from, to } }),
  getMemberReport: (from: string, to: string) =>
    axiosInstance.get('/v1/reports/member', { params: { from, to } }),
};
