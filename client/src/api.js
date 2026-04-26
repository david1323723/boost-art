import axios from 'axios';

// Global base URL configuration
export const BASE_URL =
  process.env.REACT_APP_API_URL || 'https://boost-art-backend.onrender.com';

export const SOCKET_BASE_URL =
  process.env.REACT_APP_SOCKET_URL || BASE_URL;

const api = axios.create({
  baseURL: `${BASE_URL}/api`
});

// Request interceptor: attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if this was an admin route request
      const url = error.config?.url || '';
      if (url.includes('/admin/')) {
        // Admin session expired/invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/admin/login';
      } else {
        // User session expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const likePost = (postId) => api.post(`/users/posts/${postId}/like-toggle`);

export default api;

