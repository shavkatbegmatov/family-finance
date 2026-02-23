import api from './axios';

export interface HouseholdMemberSummary {
    id: number;
    fullName: string;
    role: string;
    gender: string;
    phone: string;
    avatar: string;
    userId: number | null;
    username: string | null;
    admin: boolean;
    monthlyIncome: number;
    monthlyExpense: number;
}

export interface HouseholdAccountSummary {
    id: number;
    name: string;
    accountType: string;
    balance: number;
    currency: string;
    ownerName: string;
}

export interface HouseholdDashboardResponse {
    groupName: string;
    adminId: number;
    admin: boolean;
    members: HouseholdMemberSummary[];
    familyAccounts: HouseholdAccountSummary[];
    totalMonthlyIncome: number;
    totalMonthlyExpense: number;
}

export const householdApi = {
    getDashboard: () => api.get('/v1/family-groups/my/dashboard'),
};
