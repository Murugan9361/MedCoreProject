import { apiClient } from './client';

export const authApi = {
  // Login with email and password -> returns { access_token, token_type, role, must_change_password }
  login: async (credentials) => {
    return apiClient.post('/auth/login', credentials);
  },

  // Get current logged-in user profile
  getMe: async () => {
    return apiClient.get('/auth/me');
  },

  // Change password for user (required before accessing clinical resources if must_change_password is true)
  changePassword: async (passwordData) => {
    return apiClient.post('/auth/change-password', passwordData);
  },

  // Public/patient self-registration
  registerPatient: async (patientData) => {
    return apiClient.post('/auth/register-patient', patientData);
  },
};
