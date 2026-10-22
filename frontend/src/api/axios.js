import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000 // ✅ 30s timeout — fail fast instead of hanging forever
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // ✅ If sending FormData, remove the hardcoded application/json Content-Type
  // so axios can automatically set multipart/form-data with the correct boundary.
  // Also remove 30s timeout for file uploads so large (up to 2GB) transfers complete smoothly.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    if (!config.timeout || config.timeout === 30000) {
      config.timeout = 0; // Unlimited timeout for file uploads
    }
  }

  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
