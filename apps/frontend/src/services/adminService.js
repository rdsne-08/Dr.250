import { apiClient } from './apiClient.js';

export const adminService = Object.freeze({
  async getDashboard() {
    const [users, doctors, labs] = await Promise.all([
      apiClient.get('/api/admin/users'), apiClient.get('/api/admin/doctors'),
      apiClient.get('/api/admin/labs'),
    ]);
    return { users: users.users, doctors: doctors.doctors, labs: labs.laboratories };
  },
  async verify(id, entityType, status) {
    const result = await apiClient.patch(`/api/admin/verify/${id}`, {
      entity_type: entityType, status,
    });
    return result.verification;
  },
});
