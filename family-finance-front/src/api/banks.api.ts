import axiosInstance from './axios';
import type { ApiResponse, PagedResponse } from '../types';

export interface Bank {
    id: number;
    name: string;
    shortName?: string;
    mfo?: string;
    logoUrl?: string;
    isActive: boolean;
    createdAt: string;
    binPrefixes: string[];
}

export interface BankRequest {
    name: string;
    shortName?: string;
    mfo?: string;
    logoUrl?: string;
    isActive?: boolean;
    binPrefixes?: string[];
}

export const banksApi = {
    getAll: async (search?: string, page = 0, size = 100) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        params.append('page', page.toString());
        params.append('size', size.toString());

        const response = await axiosInstance.get<ApiResponse<PagedResponse<Bank>>>('/v1/banks', { params });
        return response.data;
    },

    getActive: async () => {
        const response = await axiosInstance.get<ApiResponse<Bank[]>>('/v1/banks/active');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await axiosInstance.get<ApiResponse<Bank>>(`/v1/banks/${id}`);
        return response.data;
    },

    create: async (data: BankRequest) => {
        const response = await axiosInstance.post<ApiResponse<Bank>>('/v1/banks', data);
        return response.data;
    },

    update: async (id: number, data: BankRequest) => {
        const response = await axiosInstance.put<ApiResponse<Bank>>(`/v1/banks/${id}`, data);
        return response.data;
    },

    resolveByCardNumber: async (cardNumber: string) => {
        const response = await axiosInstance.get<ApiResponse<Bank>>(`/v1/banks/resolve/${cardNumber}`);
        return response.data;
    }
};
