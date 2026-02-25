import api from './axios';

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
}

export const familyGroupApi = {
    getMyGroup: () => api.get<FamilyGroupResponse>('/v1/family-groups/my'),

    addMember: (username: string) => api.post<void>('/v1/family-groups/members', { username }),

    removeMember: (memberId: number) => api.delete<void>(`/v1/family-groups/members/${memberId}`),

    changeAddress: (data: FamilyAddressRequest) => api.post<void>('/v1/family-groups/address', data),

    getAddressHistory: () => api.get<FamilyAddressHistoryDto[]>('/v1/family-groups/address-history'),
};
