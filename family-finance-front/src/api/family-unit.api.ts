import axiosInstance from './axios';
import type {
  CreateFamilyUnitRequest,
  UpdateFamilyUnitRequest,
  AddPartnerRequest,
  AddChildRequest,
} from '../types';
import type { FamilyMemberRequest } from '../types';

export const familyUnitApi = {
  // ========== Tree ==========
  getTree: (personId?: number, depth = 5) => {
    const params: Record<string, unknown> = { depth };
    if (personId) params.personId = personId;
    return axiosInstance.get('/v1/family-tree', { params });
  },

  getLabeledTree: (personId: number, viewerId: number, depth = 5) =>
    axiosInstance.get(`/v1/family-tree/${personId}/labeled`, {
      params: { viewer: viewerId, depth },
    }),

  getAncestors: (personId: number) =>
    axiosInstance.get(`/v1/family-tree/${personId}/ancestors`),

  getDescendants: (personId: number) =>
    axiosInstance.get(`/v1/family-tree/${personId}/descendants`),

  getRelationship: (viewerId: number, targetId: number) =>
    axiosInstance.get('/v1/family-tree/relationship', {
      params: { viewer: viewerId, target: targetId },
    }),

  // ========== Family Units ==========
  createFamilyUnit: (data: CreateFamilyUnitRequest) =>
    axiosInstance.post('/v1/family-units', data),

  getFamilyUnit: (id: number) =>
    axiosInstance.get(`/v1/family-units/${id}`),

  updateFamilyUnit: (id: number, data: UpdateFamilyUnitRequest) =>
    axiosInstance.put(`/v1/family-units/${id}`, data),

  deleteFamilyUnit: (id: number) =>
    axiosInstance.delete(`/v1/family-units/${id}`),

  addPartner: (familyUnitId: number, data: AddPartnerRequest) =>
    axiosInstance.post(`/v1/family-units/${familyUnitId}/partners`, data),

  removePartner: (familyUnitId: number, personId: number) =>
    axiosInstance.delete(`/v1/family-units/${familyUnitId}/partners/${personId}`),

  addChild: (familyUnitId: number, data: AddChildRequest) =>
    axiosInstance.post(`/v1/family-units/${familyUnitId}/children`, data),

  removeChild: (familyUnitId: number, personId: number) =>
    axiosInstance.delete(`/v1/family-units/${familyUnitId}/children/${personId}`),

  getByPerson: (personId: number) =>
    axiosInstance.get(`/v1/family-units/by-person/${personId}`),

  // ========== Persons ==========
  createPerson: (data: FamilyMemberRequest) =>
    axiosInstance.post('/v1/family-members', data),

  registerSelf: (data: { firstName: string; gender: string }) =>
    axiosInstance.post('/v1/family-members/register-self', data),

  updatePerson: (id: number, data: FamilyMemberRequest) =>
    axiosInstance.put(`/v1/family-members/${id}`, data),

  deletePerson: (id: number) =>
    axiosInstance.delete(`/v1/family-members/${id}`),

  getPerson: (id: number) =>
    axiosInstance.get(`/v1/family-members/${id}`),

  getAllActivePersons: () =>
    axiosInstance.get('/v1/family-members/list'),
};
