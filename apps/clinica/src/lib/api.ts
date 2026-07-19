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

  listAgenda:          (params?: any)         => api.get('/clinic/agenda', { params }),
  getDoctorSlots:      (params: any)          => api.get('/clinic/agenda/slots', { params }),
  getDoctorDaySummary: (params: any)          => api.get('/clinic/agenda/day-summary', { params }),
  createAppointment:   (data: any)            => api.post('/clinic/agenda/appointments', data),
  updateAppointment:   (id: string, data: any) => api.patch(`/clinic/agenda/appointments/${id}`, data),
  cancelAppointment:   (id: string)           => api.delete(`/clinic/agenda/appointments/${id}`),

  listCompanies:    ()                        => api.get('/clinic/companies'),
  getCompany:       (id: string)               => api.get(`/clinic/companies/${id}`),
  lookupCnpj:       (cnpj: string)             => api.get(`/clinic/companies/lookup/${cnpj.replace(/\D/g, '')}`),
  createCompany:    (data: any)                => api.post('/clinic/companies', data),
  updateCompany:    (id: string, data: any)    => api.patch(`/clinic/companies/${id}`, data),
  removeCompany:    (id: string)               => api.delete(`/clinic/companies/${id}`),
  listAsos:         ()                        => api.get('/clinic/asos'),

  createRoom:       (data: any)               => api.post('/clinic/rooms', data),
  listRooms:        ()                        => api.get('/clinic/rooms'),
  updateRoom:       (id: string, data: any)   => api.patch(`/clinic/rooms/${id}`, data),
  roomAgenda:       (id: string, params?: any) => api.get(`/clinic/rooms/${id}/agenda`, { params }),
  assignRoomDoctor: (id: string, doctorId: string)   => api.post(`/clinic/rooms/${id}/doctors`, { doctorId }),
  unassignRoomDoctor: (id: string, doctorId: string) => api.delete(`/clinic/rooms/${id}/doctors/${doctorId}`),

  createProcedure:  (data: any)               => api.post('/clinic/procedures', data),
  listProcedures:   ()                        => api.get('/clinic/procedures'),

  addStaff:         (data: any)               => api.post('/clinic/staff', data),
  listStaff:        ()                        => api.get('/clinic/staff'),
  removeStaff:      (id: string)              => api.delete(`/clinic/staff/${id}`),

  financeiroDre:      (params?: any)          => api.get('/clinic/financeiro/dre', { params }),
  financeiroPorMedico: (params?: any)         => api.get('/clinic/financeiro/por-medico', { params }),
  contaCorrente:      (doctorId: string, params?: any) => api.get(`/clinic/financeiro/conta-corrente/${doctorId}`, { params }),
  createContaCorrenteEntry: (doctorId: string, data: any) => api.post(`/clinic/financeiro/conta-corrente/${doctorId}/entries`, data),

  becomeClinicAdmin: (data: any)              => api.post('/auth/become-clinic-admin', data),
};
