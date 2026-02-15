import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familyUnitApi } from '../api/family-unit.api';
import { familyMembersApi } from '../api/family-members.api';
import type {
  TreeResponse,
  FamilyUnitDto,
  RelationshipResult,
  CreateFamilyUnitRequest,
  UpdateFamilyUnitRequest,
  AddPartnerRequest,
  AddChildRequest,
} from '../types';
import type { FamilyMember, FamilyMemberRequest, ApiResponse } from '../types';
import toast from 'react-hot-toast';

// ========== Query Keys Factory ==========
export const familyTreeKeys = {
  all: ['family-tree'] as const,
  tree: (personId?: number, depth?: number) =>
    [...familyTreeKeys.all, 'tree', personId, depth] as const,
  labeledTree: (personId: number, viewerId: number, depth?: number) =>
    [...familyTreeKeys.all, 'labeled', personId, viewerId, depth] as const,
  ancestors: (personId: number) =>
    [...familyTreeKeys.all, 'ancestors', personId] as const,
  descendants: (personId: number) =>
    [...familyTreeKeys.all, 'descendants', personId] as const,
  relationship: (viewerId: number, targetId: number) =>
    [...familyTreeKeys.all, 'relationship', viewerId, targetId] as const,
  familyUnit: (id: number) =>
    [...familyTreeKeys.all, 'unit', id] as const,
  byPerson: (personId: number) =>
    [...familyTreeKeys.all, 'by-person', personId] as const,
  activePersons: () =>
    [...familyTreeKeys.all, 'active-persons'] as const,
};

// ========== Tree Queries ==========
export function useTreeQuery(personId?: number, depth = 5) {
  return useQuery({
    queryKey: familyTreeKeys.tree(personId, depth),
    queryFn: async () => {
      const res = await familyUnitApi.getTree(personId, depth);
      return (res.data as ApiResponse<TreeResponse>).data;
    },
    retry: false,
  });
}

export function useLabeledTreeQuery(personId: number, viewerId: number, depth = 5) {
  return useQuery({
    queryKey: familyTreeKeys.labeledTree(personId, viewerId, depth),
    queryFn: async () => {
      const res = await familyUnitApi.getLabeledTree(personId, viewerId, depth);
      return (res.data as ApiResponse<TreeResponse>).data;
    },
    enabled: !!personId && !!viewerId,
  });
}

export function useRelationshipQuery(viewerId: number, targetId: number) {
  return useQuery({
    queryKey: familyTreeKeys.relationship(viewerId, targetId),
    queryFn: async () => {
      const res = await familyUnitApi.getRelationship(viewerId, targetId);
      return (res.data as ApiResponse<RelationshipResult>).data;
    },
    enabled: !!viewerId && !!targetId && viewerId !== targetId,
  });
}

export function useActivePersonsQuery() {
  return useQuery({
    queryKey: familyTreeKeys.activePersons(),
    queryFn: async () => {
      const res = await familyUnitApi.getAllActivePersons();
      return (res.data as ApiResponse<FamilyMember[]>).data;
    },
  });
}

export function useFamilyUnitsByPersonQuery(personId: number) {
  return useQuery({
    queryKey: familyTreeKeys.byPerson(personId),
    queryFn: async () => {
      const res = await familyUnitApi.getByPerson(personId);
      return (res.data as ApiResponse<FamilyUnitDto[]>).data;
    },
    enabled: !!personId,
  });
}

// ========== Mutations ==========
export function useCreateFamilyUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFamilyUnitRequest) => familyUnitApi.createFamilyUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success('Oila birligi yaratildi');
    },
    onError: () => toast.error('Oila birligini yaratishda xatolik'),
  });
}

export function useUpdateFamilyUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFamilyUnitRequest }) =>
      familyUnitApi.updateFamilyUnit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success('Oila birligi yangilandi');
    },
    onError: () => toast.error('Oila birligini yangilashda xatolik'),
  });
}

export function useDeleteFamilyUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => familyUnitApi.deleteFamilyUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success("Oila birligi o'chirildi");
    },
    onError: () => toast.error("Oila birligini o'chirishda xatolik"),
  });
}

export function useAddPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ familyUnitId, data }: { familyUnitId: number; data: AddPartnerRequest }) =>
      familyUnitApi.addPartner(familyUnitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success("Partner qo'shildi");
    },
    onError: () => toast.error("Partner qo'shishda xatolik"),
  });
}

export function useAddChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ familyUnitId, data }: { familyUnitId: number; data: AddChildRequest }) =>
      familyUnitApi.addChild(familyUnitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success("Farzand qo'shildi");
    },
    onError: (error) => {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Farzand qo'shishda xatolik");
    },
  });
}

export function useRemoveChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ familyUnitId, personId }: { familyUnitId: number; personId: number }) =>
      familyUnitApi.removeChild(familyUnitId, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
    },
    onError: () => toast.error("Farzandni olib tashlashda xatolik"),
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FamilyMemberRequest) => familyUnitApi.createPerson(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
    },
    onError: () => toast.error("Shaxs yaratishda xatolik"),
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FamilyMemberRequest }) =>
      familyUnitApi.updatePerson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success("Shaxs ma'lumotlari yangilandi");
    },
    onError: () => toast.error("Shaxs ma'lumotlarini yangilashda xatolik"),
  });
}

export function useUpdateSelf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FamilyMemberRequest) =>
      familyMembersApi.updateSelf(data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success("Shaxs ma'lumotlari yangilandi");
    },
    onError: () => toast.error("Shaxs ma'lumotlarini yangilashda xatolik"),
  });
}

export function useRegisterSelf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { firstName: string; gender: string }) =>
      familyUnitApi.registerSelf(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success("Profilingiz oila a'zosiga bog'landi");
    },
    onError: () => toast.error("Ro'yxatdan o'tishda xatolik"),
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => familyUnitApi.deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyTreeKeys.all });
      toast.success("Shaxs o'chirildi");
    },
    onError: () => toast.error("Shaxsni o'chirishda xatolik"),
  });
}
