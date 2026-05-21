import axiosInstance from './axios';
import type { PersonCreateRequest, PersonCreateResponse } from '../types/persons.types';
import type { ApiResponse } from '../types';

/**
 * "Yangi shaxs qo'shish" wizard'i uchun API.
 * Backend: POST /api/v1/persons (PersonController).
 */
export const personsApi = {
  create: (data: PersonCreateRequest) =>
    axiosInstance.post<ApiResponse<PersonCreateResponse>>('/v1/persons', data),
};
