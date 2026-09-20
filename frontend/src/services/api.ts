import axios from 'axios';
import { authService } from './auth';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://b81v7klo0g.execute-api.ap-south-1.amazonaws.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to attach real Cognito JWT Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await authService.getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and token refresh cleanly
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const refreshedToken = await authService.refreshSession();
        if (refreshedToken) {
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        authService.logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
