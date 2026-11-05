import { apiClient } from './client';

export const patientsApi = {
  // Get all registered patients
  getPatients: async () => {
    return apiClient.get('/patients');
  },

  // Get specific patient by ID
  getPatientById: async (patientId) => {
    return apiClient.get(`/patients/${patientId}`);
  },

  // Create new patient
  createPatient: async (patientData) => {
    return apiClient.post('/patients', patientData);
  },

  // Get medical records for specific patient
  getPatientRecords: async (patientId, prescriptionsOnly = false) => {
    return apiClient.get(`/patients/${patientId}/records`, {
      params: { prescriptions_only: prescriptionsOnly },
    });
  },

  // Add consultation / medical record
  addPatientRecord: async (patientId, recordData) => {
    return apiClient.post(`/patients/${patientId}/records`, recordData);
  },

  // Get diagnostic lab files for patient
  getPatientLabFiles: async (patientId) => {
    return apiClient.get(`/patients/${patientId}/lab-files`);
  },

  // Upload lab file for patient
  uploadLabFile: async (patientId, formData) => {
    return apiClient.post(`/patients/${patientId}/lab-files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get current patient personal profile
  getMyProfile: async () => {
    return apiClient.get('/patients/me');
  },

  // Update current patient personal profile
  updateMyProfile: async (data) => {
    return apiClient.patch('/patients/me', data);
  },

  // Download lab file url
  getLabFileDownloadUrl: (fileId) => `/lab-files/${fileId}/download`,

  // Authenticated lab file download via Blob
  downloadLabFile: async (fileId, originalName = 'lab_file') => {
    const blob = await apiClient.get(`/lab-files/${fileId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },

  // Get authenticated Blob Object URL for preview
  getLabFileBlobUrl: async (fileId) => {
    const blob = await apiClient.get(`/lab-files/${fileId}/download`, {
      responseType: 'blob',
    });
    return window.URL.createObjectURL(blob);
  },
};
