// apps/doutor/src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

// ── ASO — Atestado de Saúde Ocupacional ──────────────────────────────────────
export const asoApi = {
  context: ()                       => api.get('/doutor/aso/context'),
  list:    (worker?: string)        => api.get('/doutor/aso', { params: worker ? { worker } : {} }),
  get:     (id: string)             => api.get(`/doutor/aso/${id}`),
  create:  (data: any)              => api.post('/doutor/aso', data),
  update:  (id: string, data: any)  => api.patch(`/doutor/aso/${id}`, data),
  cancel:  (id: string)             => api.delete(`/doutor/aso/${id}`),
  pdf:     (id: string)             => api.get(`/doutor/aso/${id}/pdf`, { responseType: 'blob' }),
};

// ── Empresas (Medicina do Trabalho) ──────────────────────────────────────────
export const empresaApi = {
  list:       (search?: string)       => api.get('/doutor/empresas', { params: search ? { search } : {} }),
  get:        (id: string)            => api.get(`/doutor/empresas/${id}`),
  create:     (data: any)             => api.post('/doutor/empresas', data),
  update:     (id: string, data: any) => api.patch(`/doutor/empresas/${id}`, data),
  remove:     (id: string)            => api.delete(`/doutor/empresas/${id}`),
  lookupCnpj: (cnpj: string)          => api.get(`/doutor/empresas/lookup/${(cnpj || '').replace(/\D/g, '')}`),
};

// ── Dashboard Analytics (Sprint 20) ───────────────────────────────────────────
export const analyticsApi = {
  dashboard: (months = 6) => api.get('/doutor/analytics/dashboard', { params: { months } }),
};
