import axios from 'axios';
import Cookies from 'js-cookie';

// Helper to resolve server base URL dynamically
export const getServerURL = () => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('api_base_url');
    if (savedUrl) {
      return savedUrl.replace(/\/api\/?$/, '');
    }
  }
  return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';
};

// Helper to resolve api URL dynamically
export const getApiURL = () => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('api_base_url');
    if (savedUrl) return savedUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getApiURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('api_base_url');
      if (savedUrl) {
        config.baseURL = savedUrl;
      }
    }
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
