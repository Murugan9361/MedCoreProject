import { apiClient } from './client';

export const staffApi = {
  // List users accessible to the current user
  getUsers: async () => {
    return apiClient.get('/users');
  },

  // Directory users
  getDirectoryUsers: async (role) => {
    const url = role ? `/directory/users?role=${role}` : '/directory/users';
    return apiClient.get(url);
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

  // Update existing user
  updateUser: async (userId, updateData) => {
    return apiClient.patch(`/users/${userId}`, updateData);
  },

  // Delete user
  deleteUser: async (userId) => {
    return apiClient.delete(`/users/${userId}`);
  },
};
