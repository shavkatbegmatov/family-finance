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
    members: FamilyGroupMemberDto[];
}

export const familyGroupApi = {
    getMyGroup: () => api.get<FamilyGroupResponse>('/v1/family-groups/my'),

    addMember: (username: string) => api.post<void>('/v1/family-groups/members', { username }),

    removeMember: (memberId: number) => api.delete<void>(`/v1/family-groups/members/${memberId}`),
};
