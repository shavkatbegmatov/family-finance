import axiosInstance from './axios';
import { FamilyMemberRequest } from '../types';
import type { ApiResponse, FamilyMember, UpdateSelfRequest } from '../types';

export const familyMembersApi = {
  getAll: (page = 0, size = 20, search?: string) => {
    const params: Record<string, unknown> = { page, size };
    if (search) params.search = search;
    return axiosInstance.get('/v1/family-members', { params });
  },
  getList: () => axiosInstance.get('/v1/family-members/list'),
  getById: (id: number) => axiosInstance.get(`/v1/family-members/${id}`),
  create: (data: FamilyMemberRequest) => axiosInstance.post('/v1/family-members', data),
  update: (id: number, data: FamilyMemberRequest) => axiosInstance.put(`/v1/family-members/${id}`, data),
  updateSelf: (data: UpdateSelfRequest) => axiosInstance.put<ApiResponse<FamilyMember>>('/v1/family-members/update-self', data),
  delete: (id: number) => axiosInstance.delete(`/v1/family-members/${id}`),
  exportExcel: () => axiosInstance.get('/v1/family-members/export/excel', { responseType: 'blob' }),
  exportPdf: () => axiosInstance.get('/v1/family-members/export/pdf', { responseType: 'blob' }),
  getFinancialSummary: (id: number) => axiosInstance.get(`/v1/family-members/${id}/financial-summary`),
};
