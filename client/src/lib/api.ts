import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    // Get initData from Telegram WebApp
    const initData = window.Telegram?.WebApp?.initData;
    
    if (initData) {
      config.headers.Authorization = initData;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error('Unauthorized - Invalid initData');
          break;
        case 403:
          console.error('Forbidden');
          break;
        case 404:
          console.error('Not found');
          break;
        case 500:
          console.error('Server error');
          break;
      }
    } else if (error.request) {
      console.error('Network error - No response received');
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const feedApi = {
  getFeed: (params: { lat: number; lng: number; radius?: number; limit?: number }) =>
    api.get('/feed', { params }),
  
  getTrending: (limit?: number) =>
    api.get('/feed/trending', { params: { limit } }),
};

export const swipeApi = {
  swipe: (targetId: string, action: 'LIKE' | 'PASS' | 'SUPER') =>
    api.post('/swipe', { target_id: targetId, action }),
  
  getHistory: (limit?: number, offset?: number) =>
    api.get('/swipe/history', { params: { limit, offset } }),
};

export const userApi = {
  getProfile: () =>
    api.get('/users/me'),
  
  updateProfile: (data: { bio?: string; avatar_url?: string }) =>
    api.put('/users/me', data),
  
  updateLocation: (lat: number, lng: number) =>
    api.post('/users/location', { lat, lng }),
};

export default api;
