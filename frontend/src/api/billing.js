import { apiClient } from './client';

export const billingApi = {
  // Get all bills / invoices (scoped by role on backend)
  getBills: async (params = {}) => {
    return apiClient.get('/billing/bills', { params });
  },

  // Get single bill by ID
  getBillById: async (id) => {
    return apiClient.get(`/billing/bills/${id}`);
  },

  // Create new bill / invoice
  createBill: async (billData) => {
    return apiClient.post('/billing/bills', billData);
  },

  // Void a bill
  voidBill: async (id) => {
    return apiClient.post(`/billing/bills/${id}/void`);
  },

  // Record payment for a bill
  recordPayment: async (id, paymentData, idempotencyKey = null) => {
    const key =
      idempotencyKey ||
      `pay-${id}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    return apiClient.post(`/billing/bills/${id}/payments`, paymentData, {
      headers: {
        'Idempotency-Key': key,
      },
    });
  },
};

