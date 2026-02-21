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
    getMyGroup: () => api.get<FamilyGroupResponse>('/family-groups/my'),

    addMember: (username: string) => api.post<void>('/family-groups/members', { username }),

    removeMember: (memberId: number) => api.delete<void>(`/family-groups/members/${memberId}`),
};
