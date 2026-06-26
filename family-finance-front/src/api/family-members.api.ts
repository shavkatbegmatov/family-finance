import type { AxiosResponse } from 'axios';
import axiosInstance from './axios';
import { FamilyMemberRequest } from '../types';
import type {
  ApiResponse,
  PagedResponse,
  FamilyMember,
  MemberFinancialSummary,
  UpdateSelfRequest,
} from '../types';

export const familyMembersApi = {
  getAll: (page = 0, size = 20, search?: string) => {
    const params: Record<string, unknown> = { page, size };
    if (search) params.search = search;
    return axiosInstance.get<ApiResponse<PagedResponse<FamilyMember>>>('/v1/family-members', { params });
  },
  getList: () => axiosInstance.get<ApiResponse<FamilyMember[]>>('/v1/family-members/list'),
  getById: (id: number) => axiosInstance.get<ApiResponse<FamilyMember>>(`/v1/family-members/${id}`),
  create: (data: FamilyMemberRequest) => axiosInstance.post<ApiResponse<FamilyMember>>('/v1/family-members', data),
  update: (id: number, data: FamilyMemberRequest) => axiosInstance.put<ApiResponse<FamilyMember>>(`/v1/family-members/${id}`, data),
  updateSelf: (data: UpdateSelfRequest) => axiosInstance.put<ApiResponse<FamilyMember>>('/v1/family-members/update-self', data),
  delete: (id: number) => axiosInstance.delete<ApiResponse<void>>(`/v1/family-members/${id}`),
  exportExcel: (): Promise<AxiosResponse<Blob>> =>
    axiosInstance.get('/v1/family-members/export/excel', { responseType: 'blob' }),
  exportPdf: (): Promise<AxiosResponse<Blob>> =>
    axiosInstance.get('/v1/family-members/export/pdf', { responseType: 'blob' }),
  getFinancialSummary: (id: number) =>
    axiosInstance.get<ApiResponse<MemberFinancialSummary>>(`/v1/family-members/${id}/financial-summary`),
};
