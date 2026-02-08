import axiosInstance from './axios';
import { SavingsGoalRequest, GoalContributionRequest } from '../types';

export const savingsApi = {
  getAll: (page = 0, size = 20) => axiosInstance.get('/v1/savings-goals', { params: { page, size } }),
  getById: (id: number) => axiosInstance.get(`/v1/savings-goals/${id}`),
  create: (data: SavingsGoalRequest) => axiosInstance.post('/v1/savings-goals', data),
  update: (id: number, data: SavingsGoalRequest) => axiosInstance.put(`/v1/savings-goals/${id}`, data),
  delete: (id: number) => axiosInstance.delete(`/v1/savings-goals/${id}`),
  addContribution: (goalId: number, data: GoalContributionRequest) =>
    axiosInstance.post(`/v1/savings-goals/${goalId}/contributions`, data),
  getContributions: (goalId: number) => axiosInstance.get(`/v1/savings-goals/${goalId}/contributions`),
};
