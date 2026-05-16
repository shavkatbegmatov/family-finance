import axiosInstance from './axios';

export interface TagResponse {
  id: number;
  name: string;
  color?: string;
}

export interface TagRequest {
  name: string;
  color?: string;
}

export const tagsApi = {
  getAll: (search?: string) =>
    axiosInstance.get('/v1/tags', { params: search ? { search } : {} }),
  create: (data: TagRequest) => axiosInstance.post('/v1/tags', data),
  update: (id: number, data: TagRequest) => axiosInstance.put(`/v1/tags/${id}`, data),
  delete: (id: number) => axiosInstance.delete(`/v1/tags/${id}`),
};
