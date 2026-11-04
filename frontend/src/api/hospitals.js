import { apiClient } from './client';

export const hospitalsApi = {
  // List all registered hospitals
  getHospitals: async () => {
    return apiClient.get('/hospitals');
  },

  // Onboard new hospital (Super Admin flow)
  createHospital: async (hospitalData) => {
    return apiClient.post('/hospitals', hospitalData);
  },
};
