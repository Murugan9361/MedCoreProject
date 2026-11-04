import { apiClient } from './client';

export const authApi = {
  // Login with email and password -> returns { access_token, token_type }
  login: async (credentials) => {
    return apiClient.post('/auth/login', credentials);
  },

  // Get current logged-in user profile
  getMe: async () => {
    return apiClient.get('/auth/me');
  },

  // Public/patient self-registration
  registerPatient: async (patientData) => {
    return apiClient.post('/auth/register-patient', patientData);
  },
};
