import axiosInstance from './axios';
import type {
  ApiResponse,
  GoalContribution,
  GoalContributionRequest,
  PagedResponse,
  SavingsGoal,
  SavingsGoalRequest,
} from '../types';

export const savingsApi = {
  getAll: (page = 0, size = 20) =>
    axiosInstance.get<ApiResponse<PagedResponse<SavingsGoal>>>('/v1/savings-goals', { params: { page, size } }),
  getById: (id: number) => axiosInstance.get<ApiResponse<SavingsGoal>>(`/v1/savings-goals/${id}`),
  create: (data: SavingsGoalRequest) => axiosInstance.post<ApiResponse<SavingsGoal>>('/v1/savings-goals', data),
  update: (id: number, data: SavingsGoalRequest) =>
    axiosInstance.put<ApiResponse<SavingsGoal>>(`/v1/savings-goals/${id}`, data),
  delete: (id: number) => axiosInstance.delete<ApiResponse<void>>(`/v1/savings-goals/${id}`),
  addContribution: (goalId: number, data: GoalContributionRequest) =>
    axiosInstance.post<ApiResponse<GoalContribution>>(`/v1/savings-goals/${goalId}/contributions`, data),
  getContributions: (goalId: number) =>
    axiosInstance.get<ApiResponse<GoalContribution[]>>(`/v1/savings-goals/${goalId}/contributions`),
};
