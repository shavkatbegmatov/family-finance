import axiosInstance from './axios';
import { AddRelationshipRequest, AddFamilyMemberWithRelationRequest, UpdateRelationshipTypeRequest } from '../types';

export const familyTreeApi = {
  getTree: (memberId?: number) => {
    const params: Record<string, unknown> = {};
    if (memberId) params.memberId = memberId;
    return axiosInstance.get('/v1/family-tree', { params });
  },
  addRelationship: (data: AddRelationshipRequest) =>
    axiosInstance.post('/v1/family-tree/relationships', data),
  addMemberWithRelation: (data: AddFamilyMemberWithRelationRequest) =>
    axiosInstance.post('/v1/family-tree/members', data),
  removeRelationship: (fromId: number, toId: number) =>
    axiosInstance.delete('/v1/family-tree/relationships', { params: { from: fromId, to: toId } }),
  getRelationshipTypes: () =>
    axiosInstance.get('/v1/family-tree/relationship-types'),
  updateRelationshipType: (data: UpdateRelationshipTypeRequest) =>
    axiosInstance.put('/v1/family-tree/relationships', data),
};
