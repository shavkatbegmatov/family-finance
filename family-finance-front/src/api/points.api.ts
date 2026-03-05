import axiosInstance from './axios';
import type {
  PointConfigRequest, PointParticipantRequest, PointTaskRequest,
  ManualAwardRequest, PointConversionRequest, PointAchievementRequest,
  PointInvestmentRequest, PointShopItemRequest, PointChallengeRequest,
  PointMultiplierEventRequest, PointPurchaseRequest, PointTaskVerifyRequest,
  PointParticipantLinkRequest, PointParticipantUnlinkRequest,
} from '../types/points.types';

// ===== Config =====
export const pointConfigApi = {
  get: () => axiosInstance.get('/v1/point-config'),
  save: (data: PointConfigRequest) => axiosInstance.post('/v1/point-config', data),
};

// ===== Participants =====
export const pointParticipantApi = {
  getAll: () => axiosInstance.get('/v1/point-participants'),
  getPaged: (page = 0, size = 20) =>
    axiosInstance.get('/v1/point-participants/paged', { params: { page, size } }),
  getById: (id: number) => axiosInstance.get(`/v1/point-participants/${id}`),
  create: (data: PointParticipantRequest) => axiosInstance.post('/v1/point-participants', data),
  update: (id: number, data: PointParticipantRequest) =>
    axiosInstance.put(`/v1/point-participants/${id}`, data),
  deactivate: (id: number) => axiosInstance.delete(`/v1/point-participants/${id}`),
  linkMember: (id: number, data: PointParticipantLinkRequest) =>
    axiosInstance.post(`/v1/point-participants/${id}/link-member`, data),
  unlinkMember: (id: number, data: PointParticipantUnlinkRequest) =>
    axiosInstance.post(`/v1/point-participants/${id}/unlink-member`, data),
};

// ===== Tasks =====
export const pointTaskApi = {
  getAll: (page = 0, size = 20, status?: string) =>
    axiosInstance.get('/v1/point-tasks', { params: { page, size, status } }),
  getById: (id: number) => axiosInstance.get(`/v1/point-tasks/${id}`),
  getPendingVerification: () => axiosInstance.get('/v1/point-tasks/pending-verification'),
  getMyTasks: (participantId: number) =>
    axiosInstance.get('/v1/point-tasks/my-tasks', { params: { participantId } }),
  create: (data: PointTaskRequest) => axiosInstance.post('/v1/point-tasks', data),
  update: (id: number, data: PointTaskRequest) => axiosInstance.put(`/v1/point-tasks/${id}`, data),
  submit: (id: number) => axiosInstance.post(`/v1/point-tasks/${id}/submit`),
  verify: (id: number) => axiosInstance.post(`/v1/point-tasks/${id}/verify`),
  reject: (id: number, data: PointTaskVerifyRequest) =>
    axiosInstance.post(`/v1/point-tasks/${id}/reject`, data),
  delete: (id: number) => axiosInstance.delete(`/v1/point-tasks/${id}`),
};

// ===== Balances =====
export const pointBalanceApi = {
  get: (participantId: number) => axiosInstance.get(`/v1/point-balances/${participantId}`),
  getTransactions: (participantId: number, page = 0, size = 20) =>
    axiosInstance.get(`/v1/point-balances/${participantId}/transactions`, { params: { page, size } }),
  award: (participantId: number, data: ManualAwardRequest) =>
    axiosInstance.post(`/v1/point-balances/${participantId}/award`, data),
  deduct: (participantId: number, data: ManualAwardRequest) =>
    axiosInstance.post(`/v1/point-balances/${participantId}/deduct`, data),
};

// ===== Conversions =====
export const pointConversionApi = {
  convert: (data: PointConversionRequest) => axiosInstance.post('/v1/point-conversions', data),
  getByParticipant: (participantId: number, page = 0, size = 20) =>
    axiosInstance.get(`/v1/point-conversions/${participantId}`, { params: { page, size } }),
  calculate: (points: number) =>
    axiosInstance.get('/v1/point-conversions/calculate', { params: { points } }),
};

// ===== Leaderboard =====
export const pointLeaderboardApi = {
  getOverall: () => axiosInstance.get('/v1/point-leaderboard'),
  getWeekly: () => axiosInstance.get('/v1/point-leaderboard/weekly'),
  getMonthly: () => axiosInstance.get('/v1/point-leaderboard/monthly'),
};

// ===== Achievements =====
export const pointAchievementApi = {
  getAll: () => axiosInstance.get('/v1/point-achievements'),
  getEarned: (participantId: number) =>
    axiosInstance.get(`/v1/point-achievements/${participantId}/earned`),
  create: (data: PointAchievementRequest) => axiosInstance.post('/v1/point-achievements', data),
  update: (id: number, data: PointAchievementRequest) =>
    axiosInstance.put(`/v1/point-achievements/${id}`, data),
  delete: (id: number) => axiosInstance.delete(`/v1/point-achievements/${id}`),
};

// ===== Savings =====
export const pointSavingsApi = {
  get: (participantId: number) => axiosInstance.get(`/v1/point-savings/${participantId}`),
  deposit: (participantId: number, amount: number) =>
    axiosInstance.post(`/v1/point-savings/${participantId}/deposit`, { amount }),
  withdraw: (participantId: number, amount: number) =>
    axiosInstance.post(`/v1/point-savings/${participantId}/withdraw`, { amount }),
};

// ===== Investments =====
export const pointInvestmentApi = {
  getByParticipant: (participantId: number) =>
    axiosInstance.get(`/v1/point-investments/${participantId}`),
  create: (participantId: number, data: PointInvestmentRequest) =>
    axiosInstance.post(`/v1/point-investments/${participantId}`, data),
  sell: (id: number) => axiosInstance.post(`/v1/point-investments/${id}/sell`),
};

// ===== Shop =====
export const pointShopApi = {
  getItems: () => axiosInstance.get('/v1/point-shop'),
  getAllItems: () => axiosInstance.get('/v1/point-shop/all'),
  createItem: (data: PointShopItemRequest) => axiosInstance.post('/v1/point-shop/items', data),
  updateItem: (id: number, data: PointShopItemRequest) =>
    axiosInstance.put(`/v1/point-shop/items/${id}`, data),
  deleteItem: (id: number) => axiosInstance.delete(`/v1/point-shop/items/${id}`),
  purchase: (data: PointPurchaseRequest) => axiosInstance.post('/v1/point-shop/purchase', data),
  deliver: (id: number) => axiosInstance.post(`/v1/point-shop/${id}/deliver`),
  getPurchases: (participantId: number, page = 0, size = 20) =>
    axiosInstance.get(`/v1/point-shop/purchases/${participantId}`, { params: { page, size } }),
};

// ===== Challenges =====
export const pointChallengeApi = {
  getAll: () => axiosInstance.get('/v1/point-challenges'),
  getActive: () => axiosInstance.get('/v1/point-challenges/active'),
  getResults: (id: number) => axiosInstance.get(`/v1/point-challenges/${id}/results`),
  create: (data: PointChallengeRequest) => axiosInstance.post('/v1/point-challenges', data),
  join: (id: number, participantId: number) =>
    axiosInstance.post(`/v1/point-challenges/${id}/join`, null, { params: { participantId } }),
  complete: (id: number) => axiosInstance.post(`/v1/point-challenges/${id}/complete`),
  cancel: (id: number) => axiosInstance.post(`/v1/point-challenges/${id}/cancel`),
};

// ===== Events =====
export const pointEventApi = {
  getAll: () => axiosInstance.get('/v1/point-events'),
  getActive: () => axiosInstance.get('/v1/point-events/active'),
  create: (data: PointMultiplierEventRequest) => axiosInstance.post('/v1/point-events', data),
  delete: (id: number) => axiosInstance.delete(`/v1/point-events/${id}`),
};

// ===== Reports =====
export const pointReportApi = {
  getWeekly: (participantId: number) =>
    axiosInstance.get(`/v1/point-reports/weekly/${participantId}`),
  getSummary: () => axiosInstance.get('/v1/point-reports/summary'),
};
