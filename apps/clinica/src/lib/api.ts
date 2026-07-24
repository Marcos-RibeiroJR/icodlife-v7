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
  rotateIntakeToken: (id: string)              => api.post(`/clinic/companies/${id}/intake-token`),
  listAsos:         ()                        => api.get('/clinic/asos'),
  esocialS2220Xml:  (id: string) => api.get(`/clinic/asos/${id}/esocial/s2220`, { params: { format: 'xml' }, responseType: 'blob' }),
  esocialS2240Xml:  (id: string) => api.get(`/clinic/asos/${id}/esocial/s2240`, { params: { format: 'xml' }, responseType: 'blob' }),

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
  listExamPrices:     ()                      => api.get('/clinic/financeiro/precos-exame'),
  saveExamPrices:     (data: { examType: string; price: number }[]) => api.put('/clinic/financeiro/precos-exame', data),

  becomeClinicAdmin: (data: any)              => api.post('/auth/become-clinic-admin', data),
};

// ── Cadastro único iCODLIFE (busca para vincular funcionário/paciente) ───────
export const icodlifeApi = {
  search: (q: string) => api.get('/clinic/users/search', { params: { q } }),
};

// ── Meus Funcionários ────────────────────────────────────────────────────────
export const employeesApi = {
  search: (q?: string)   => api.get('/clinic/employees', { params: { q } }),
  create: (data: any)    => api.post('/clinic/employees', data),
};

// ── Base de Consultas ────────────────────────────────────────────────────────
export const consultationRequestsApi = {
  list:         (params?: any)          => api.get('/clinic/consultation-requests', { params }),
  get:          (id: string)            => api.get(`/clinic/consultation-requests/${id}`),
  create:       (data: any)             => api.post('/clinic/consultation-requests', data),
  updateStatus: (id: string, status: string) => api.patch(`/clinic/consultation-requests/${id}`, { status }),
};

// ── Formulário público de intake (sem autenticação) ──────────────────────────
export const publicIntakeApi = {
  getCompany: (token: string)      => api.get(`/public/intake/${token}`),
  submit:     (token: string, data: any) => api.post(`/public/intake/${token}`, data),
};

// ── Atendimento (Guichê) ──────────────────────────────────────────────────────
export const atendimentoApi = {
  listCounters:   ()                    => api.get('/clinic/atendimento/guiches'),
  createCounter:  (data: any)           => api.post('/clinic/atendimento/guiches', data),
  updateCounter:  (id: string, data: any) => api.patch(`/clinic/atendimento/guiches/${id}`, data),
  queue:          ()                    => api.get('/clinic/atendimento/fila'),
  startSession:   (data: any)           => api.post('/clinic/atendimento/sessions', data),
  endSession:     (id: string, data: any) => api.patch(`/clinic/atendimento/sessions/${id}/end`, data),
  activeSessions: ()                    => api.get('/clinic/atendimento/sessions/ativas'),
  productivity:   (params?: any)        => api.get('/clinic/atendimento/produtividade', { params }),
};
