import { apiClient } from './client';

export const staffApi = {
  // List users accessible to the current user
  getUsers: async () => {
    return apiClient.get('/users');
  },

  // Generic user creation
  createUser: async (userData) => {
    return apiClient.post('/users', userData);
  },

  // Onboard Hospital Admin
  createAdmin: async (adminData) => {
    return apiClient.post('/admins', adminData);
  },

  // Onboard Attender / Nurse
  createAttender: async (attenderData) => {
    return apiClient.post('/attenders', attenderData);
  },
};
