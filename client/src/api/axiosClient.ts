/**
 * Axios Client Configuration
 * Centralized HTTP client with Telegram authentication
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getInitData } from '../utils/telegram';

/**
 * Create configured Axios instance
 */
const axiosClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Automatically attach Authorization header with Telegram initData
 */
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get raw initData for backend verification
    const initData = getInitData();

    if (initData) {
      // Attach initData as Authorization header
      config.headers.Authorization = initData;
    } else {
      console.warn('⚠️ No initData available - request may fail authentication');
    }

    // Log request for debugging (remove in production)
    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handle common errors and transform responses
 */
axiosClient.interceptors.response.use(
  (response) => {
    // Log response for debugging (remove in production)
    if (import.meta.env.DEV) {
      console.log(`📥 ${response.status} ${response.config.url}`);
    }

    return response;
  },
  (error: AxiosError) => {
    // Handle specific error codes
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          console.error('🔐 Unauthorized - Invalid or expired initData');
          // Could trigger re-authentication or show error UI
          break;

        case 403:
          console.error('🚫 Forbidden - Access denied');
          break;

        case 404:
          console.error('❓ Not Found - Resource does not exist');
          break;

        case 422:
          console.error('⚠️ Validation Error:', data);
          break;

        case 429:
          console.error('⏳ Rate Limited - Too many requests');
          break;

        case 500:
        case 502:
        case 503:
          console.error('💥 Server Error - Please try again later');
          break;

        default:
          console.error(`❌ Error ${status}:`, data);
      }
    } else if (error.request) {
      // Network error - no response received
      console.error('🌐 Network Error - No response from server');
    } else {
      // Request configuration error
      console.error('⚙️ Request Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

// Export convenience methods
export const api = {
  get: <T>(url: string, config?: object) => 
    axiosClient.get<T>(url, config).then(res => res.data),
  
  post: <T>(url: string, data?: object, config?: object) => 
    axiosClient.post<T>(url, data, config).then(res => res.data),
  
  put: <T>(url: string, data?: object, config?: object) => 
    axiosClient.put<T>(url, data, config).then(res => res.data),
  
  patch: <T>(url: string, data?: object, config?: object) => 
    axiosClient.patch<T>(url, data, config).then(res => res.data),
  
  delete: <T>(url: string, config?: object) => 
    axiosClient.delete<T>(url, config).then(res => res.data),
};
