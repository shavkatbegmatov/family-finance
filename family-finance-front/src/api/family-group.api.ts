import api from './axios';
import type { ApiResponse } from '../types';

export interface FamilyGroupMemberDto {
    id: number;
    userId: number;
    fullName: string;
    username: string;
    phone: string;
    role: string;
}

export interface FamilyGroupResponse {
    id: number;
    name: string;
    adminId: number;
    active: boolean;
    uniqueCode?: string;
    currentAddress?: string;
    members: FamilyGroupMemberDto[];
}

export interface FamilyAddressHistoryDto {
    id: number;
    address: string;
    moveInDate: string;
    moveOutDate?: string;
    isCurrent: boolean;
}

export interface FamilyAddressRequest {
    address: string;
    moveInDate?: string;
    moveOutDate?: string;
}

export interface FamilyGroupInviteCandidate {
    userId: number;
    familyMemberId?: number | null;
    username: string;
    fullName: string;
    email?: string;
    phone?: string;
    active: boolean;
    familyGroupId?: number | null;
    familyGroupName?: string | null;
    alreadyInCurrentGroup: boolean;
    linkedFamilyMemberId?: number | null;
    linkedFamilyMemberName?: string | null;
    linkedFamilyRole?: string | null;
    linkedFamilyGender?: string | null;
    linkedFamilyBirthDate?: string | null;
    linkedFamilyBirthPlace?: string | null;
    linkedFamilyPhone?: string | null;
    linkedFamilyMemberActive?: boolean | null;
}

export const familyGroupApi = {
    getMyGroup: () => api.get<FamilyGroupResponse>('/v1/family-groups/my'),

    addMember: (username: string) => api.post<void>('/v1/family-groups/members', { username }),

    searchInviteCandidates: async (search?: string, size: number = 12): Promise<FamilyGroupInviteCandidate[]> => {
        const response = await api.get<ApiResponse<FamilyGroupInviteCandidate[]>>('/v1/family-groups/invite-candidates', {
            params: {
                search: search || undefined,
                size,
            },
        });
        return response.data.data;
    },

    removeMember: (memberId: number) => api.delete<void>(`/v1/family-groups/members/${memberId}`),

    changeAddress: (data: FamilyAddressRequest) => api.post<void>('/v1/family-groups/address', data),

    getAddressHistory: () => api.get<FamilyAddressHistoryDto[]>('/v1/family-groups/address-history'),
};
