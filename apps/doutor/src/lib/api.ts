// apps/doutor/src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({ baseURL: API_URL });

// Injeta token automaticamente
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('doutor_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para login se 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('doutor_token');
      localStorage.removeItem('doutor_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
