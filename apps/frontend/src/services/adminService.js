import { apiClient } from './apiClient.js';

export const adminService = Object.freeze({
  getDoctors: async () => (await apiClient.get('/api/admin/doctors')).doctors ?? [],
  decide: async (doctorId, status) => (await apiClient.patch(
    `/api/admin/doctors/${doctorId}/verification`, { status },
  )).doctor,
});
