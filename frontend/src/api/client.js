import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medcore_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format errors and handle 401 without logout loop on login
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    
    // Only trigger unauthorized event for protected endpoints, NOT for login attempts
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('medcore_token');
      localStorage.removeItem('medcore_user');
      window.dispatchEvent(new CustomEvent('medcore:unauthorized'));
    }

    // Format FastAPI error detail
    let errorMessage = 'An unexpected error occurred. Please try again.';
    let detail = error.response?.data?.detail;

    // If response is a Blob (e.g. from file download), read text to extract JSON detail
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        detail = json.detail || text;
      } catch {
        detail = 'File operation failed';
      }
    }

    if (typeof detail === 'string') {
      errorMessage = detail;
    } else if (Array.isArray(detail)) {
      // FastAPI 422 validation errors array
      errorMessage = detail
        .map((err) => `${err.loc?.slice(1)?.join('.') || 'field'}: ${err.msg}`)
        .join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.status = error.response?.status;
    enhancedError.originalError = error;
    return Promise.reject(enhancedError);
  }
);
