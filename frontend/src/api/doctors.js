import { apiClient } from './client';

export const doctorsApi = {
  // Get doctor directory
  getDoctors: async (params = {}) => {
    return apiClient.get('/doctors', { params });
  },

  // Onboard new doctor (admin flow)
  createDoctor: async (doctorData) => {
    return apiClient.post('/doctors', doctorData);
  },

  // Get available slots for a doctor on a specific date
  getDoctorSlots: async (doctorId, date) => {
    return apiClient.get(`/doctors/${doctorId}/slots`, {
      params: { date },
    });
  },
};
