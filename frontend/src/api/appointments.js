import { apiClient } from './client';

export const appointmentsApi = {
  // List appointments with optional filters
  getAppointments: async (params = {}) => {
    return apiClient.get('/appointments', { params });
  },

  // Today's clinic queue
  getTodayAppointments: async (doctorId = null) => {
    return apiClient.get('/appointments/today', {
      params: doctorId ? { doctor_id: doctorId } : {},
    });
  },

  // Get appointment by ID
  getAppointmentById: async (id) => {
    return apiClient.get(`/appointments/${id}`);
  },

  // Schedule a new appointment
  createAppointment: async (appointmentData) => {
    return apiClient.post('/appointments', appointmentData);
  },

  // Update appointment status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  updateStatus: async (id, status) => {
    return apiClient.patch(`/appointments/${id}/status`, { status });
  },

  // Reschedule appointment
  reschedule: async (id, startTime) => {
    return apiClient.patch(`/appointments/${id}/reschedule`, { start_time: startTime });
  },

  // Cancel appointment with reason
  cancel: async (id, reason = '') => {
    return apiClient.patch(`/appointments/${id}/cancel`, { reason });
  },
};
