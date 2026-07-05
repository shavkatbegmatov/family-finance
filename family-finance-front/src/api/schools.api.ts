import axiosInstance from './axios';
import type { ApiResponse } from '../types';
import type { Enrollment, Scope } from '../types/scope.types';

/**
 * Maktablar (ADR-002 P4) — ariza/tasdiq, sinflar, yozilishlar.
 * Backend: SchoolController (/v1/schools/*).
 */
export const schoolsApi = {
  /** Maktab ochish arizasi — SUPER_ADMIN tasdiqlaguncha faol emas. */
  apply: (name: string, description?: string) =>
    axiosInstance.post<ApiResponse<Scope>>('/v1/schools', { name, description }),

  /** SUPER_ADMIN — tasdiq kutayotgan maktab arizalari. */
  getPending: () =>
    axiosInstance.get<ApiResponse<Scope[]>>('/v1/schools/pending'),

  /** SUPER_ADMIN — maktabni tasdiqlash (faollashtirish). */
  approve: (schoolId: number) =>
    axiosInstance.post<ApiResponse<Scope>>(`/v1/schools/${schoolId}/approve`),

  /** Sinf yaratish — maktab egasi/admini; yaratuvchi sinfda ADMIN bo'ladi. */
  createClass: (schoolId: number, name: string) =>
    axiosInstance.post<ApiResponse<Scope>>(`/v1/schools/${schoolId}/classes`, { name }),

  /** Farzandni sinfga yozish (ota-ona; nickname majburiy — K3 maxfiylik). */
  enroll: (classId: number, familyMemberId: number, nickname: string) =>
    axiosInstance.post<ApiResponse<Enrollment>>(
      `/v1/schools/classes/${classId}/enrollments`,
      { familyMemberId, nickname },
    ),

  /** Sinf ro'yxati — nickname-first; haqiqiy ism faqat o'qituvchi/adminga. */
  getClassEnrollments: (classId: number) =>
    axiosInstance.get<ApiResponse<Enrollment[]>>(
      `/v1/schools/classes/${classId}/enrollments`,
    ),

  /** Sinfdan chiqarish — yozgan ota-ona yoki sinf admini. */
  unenroll: (classId: number, familyMemberId: number) =>
    axiosInstance.delete<ApiResponse<void>>(
      `/v1/schools/classes/${classId}/enrollments/${familyMemberId}`,
    ),

  /** Mening farzandlarim yozilgan sinflar. */
  getMyChildrenEnrollments: () =>
    axiosInstance.get<ApiResponse<Enrollment[]>>('/v1/schools/my-children-enrollments'),
};
