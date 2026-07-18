// apps/clinica/src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({ baseURL: API_URL });

// Injeta token automaticamente
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('clinica_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para login se 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('clinica_token');
      localStorage.removeItem('clinica_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Clínica — painel administrativo ──────────────────────────────────────────
export const clinicApi = {
  me:               ()                       => api.get('/clinic/me'),
  updateMe:         (data: any)               => api.patch('/clinic/me', data),

  linkDoctor:       (data: any)               => api.post('/clinic/doctors', data),
  listDoctors:      ()                        => api.get('/clinic/doctors'),
  unlinkDoctor:     (id: string)              => api.delete(`/clinic/doctors/${id}`),

  listPatients:     ()                        => api.get('/clinic/patients'),

  listAgenda:       (params?: any)            => api.get('/clinic/agenda', { params }),

  listCompanies:    ()                        => api.get('/clinic/companies'),
  listAsos:         ()                        => api.get('/clinic/asos'),

  createRoom:       (data: any)               => api.post('/clinic/rooms', data),
  listRooms:        ()                        => api.get('/clinic/rooms'),

  createProcedure:  (data: any)               => api.post('/clinic/procedures', data),
  listProcedures:   ()                        => api.get('/clinic/procedures'),

  addStaff:         (data: any)               => api.post('/clinic/staff', data),
  listStaff:        ()                        => api.get('/clinic/staff'),
  removeStaff:      (id: string)              => api.delete(`/clinic/staff/${id}`),

  financeiroDre:      (params?: any)          => api.get('/clinic/financeiro/dre', { params }),
  financeiroPorMedico: (params?: any)         => api.get('/clinic/financeiro/por-medico', { params }),

  becomeClinicAdmin: (data: any)              => api.post('/auth/become-clinic-admin', data),
};
