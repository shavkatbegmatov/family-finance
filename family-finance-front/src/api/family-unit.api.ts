import axiosInstance from './axios';
import type {
  ApiResponse,
  FamilyMember,
  FamilyMemberRequest,
  TreePerson,
  TreeResponse,
  HouseholdTreeResponse,
  FamilyUnitDto,
  RelationshipResult,
  CreateFamilyUnitRequest,
  UpdateFamilyUnitRequest,
  AddPartnerRequest,
  AddChildRequest,
  AddParentsRequest,
  AddSpouseRequest,
} from '../types';

export const familyUnitApi = {
  // ========== Tree ==========
  getTree: (personId?: number, depth = 5) => {
    const params: Record<string, unknown> = { depth };
    if (personId) params.personId = personId;
    return axiosInstance.get<ApiResponse<TreeResponse>>('/v1/family-tree', { params });
  },

  getLabeledTree: (personId: number, viewerId: number, depth = 5) =>
    axiosInstance.get<ApiResponse<TreeResponse>>(`/v1/family-tree/${personId}/labeled`, {
      params: { viewer: viewerId, depth },
    }),

  getAncestors: (personId: number) =>
    axiosInstance.get<ApiResponse<TreePerson[]>>(`/v1/family-tree/${personId}/ancestors`),

  getDescendants: (personId: number) =>
    axiosInstance.get<ApiResponse<TreePerson[]>>(`/v1/family-tree/${personId}/descendants`),

  getRelationship: (viewerId: number, targetId: number) =>
    axiosInstance.get<ApiResponse<RelationshipResult>>('/v1/family-tree/relationship', {
      params: { viewer: viewerId, target: targetId },
    }),

  // ========== Household Tree (xonadon-markazli) ==========
  getHouseholdTree: () =>
    axiosInstance.get<ApiResponse<HouseholdTreeResponse>>('/v1/family-tree/households'),

  getHouseholdTreeFrom: (scopeId: number, depth = 5) =>
    axiosInstance.get<ApiResponse<HouseholdTreeResponse>>(`/v1/family-tree/households/${scopeId}`, {
      params: { depth },
    }),

  // ========== Family Units ==========
  createFamilyUnit: (data: CreateFamilyUnitRequest) =>
    axiosInstance.post<ApiResponse<FamilyUnitDto>>('/v1/family-units', data),

  getFamilyUnit: (id: number) =>
    axiosInstance.get<ApiResponse<FamilyUnitDto>>(`/v1/family-units/${id}`),

  updateFamilyUnit: (id: number, data: UpdateFamilyUnitRequest) =>
    axiosInstance.put<ApiResponse<FamilyUnitDto>>(`/v1/family-units/${id}`, data),

  deleteFamilyUnit: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/v1/family-units/${id}`),

  addPartner: (familyUnitId: number, data: AddPartnerRequest) =>
    axiosInstance.post<ApiResponse<FamilyUnitDto>>(`/v1/family-units/${familyUnitId}/partners`, data),

  removePartner: (familyUnitId: number, personId: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/v1/family-units/${familyUnitId}/partners/${personId}`),

  addChild: (familyUnitId: number, data: AddChildRequest) =>
    axiosInstance.post<ApiResponse<FamilyUnitDto>>(`/v1/family-units/${familyUnitId}/children`, data),

  addParents: (data: AddParentsRequest) =>
    axiosInstance.post<ApiResponse<FamilyUnitDto>>('/v1/family-units/parents', data),

  addSpouse: (data: AddSpouseRequest) =>
    axiosInstance.post<ApiResponse<FamilyUnitDto>>('/v1/family-units/spouse', data),

  removeChild: (familyUnitId: number, personId: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/v1/family-units/${familyUnitId}/children/${personId}`),

  getByPerson: (personId: number) =>
    axiosInstance.get<ApiResponse<FamilyUnitDto[]>>(`/v1/family-units/by-person/${personId}`),

  // ========== Persons ==========
  createPerson: (data: FamilyMemberRequest) =>
    axiosInstance.post<ApiResponse<FamilyMember>>('/v1/family-members', data),

  registerSelf: (data: { firstName: string; lastName?: string; gender: string }) =>
    axiosInstance.post<ApiResponse<FamilyMember>>('/v1/family-members/register-self', data),

  updatePerson: (id: number, data: FamilyMemberRequest) =>
    axiosInstance.put<ApiResponse<FamilyMember>>(`/v1/family-members/${id}`, data),

  deletePerson: (id: number) =>
    axiosInstance.delete<ApiResponse<void>>(`/v1/family-members/${id}`),

  getPerson: (id: number) =>
    axiosInstance.get<ApiResponse<FamilyMember>>(`/v1/family-members/${id}`),

  getAllActivePersons: () =>
    axiosInstance.get<ApiResponse<FamilyMember[]>>('/v1/family-members/list'),
};
