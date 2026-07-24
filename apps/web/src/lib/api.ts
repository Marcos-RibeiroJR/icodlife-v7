// apps/web/src/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setAuth(
          useAuthStore.getState().user!,
          data.accessToken,
          data.refreshToken ?? useAuthStore.getState().refreshToken!,
        );
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Download autenticado de arquivos binários (PDF etc.). Prefixa a base (que já inclui /api/v1).
async function downloadAuthedBlob(path: string): Promise<Blob> {
  const token = useAuthStore.getState().accessToken;
  const base  = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '');
  const rel   = path.startsWith('/') ? path : `/${path}`;
  const res   = await fetch(`${base}${rel}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Falha ao baixar o documento');
  return res.blob();
}

// ── Typed helpers ────────────────────────────────────────────────────────────

export const authApi = {
  register:      (data: any)          => api.post('/auth/register', data),
  login:         (data: any)          => api.post('/auth/login', data),
  logout:        ()                   => api.post('/auth/logout'),
  forgotPassword:(email: string)      => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, pw: string) => api.post('/auth/reset-password', { token, password: pw }),
  verifyEmail:   (token: string)      => api.post('/auth/verify-email', { token }),
  setupMfa:      ()                   => api.post('/auth/mfa/setup'),
  verifyMfa:     (code: string)       => api.post('/auth/mfa/verify', { code }),
  getConsents:   ()                   => api.get('/auth/consents'),
  revokeConsent: (type: string)       => api.delete(`/auth/consents/${type}`),
  deleteAccount: ()                   => api.delete('/auth/account'),
};

export const usersApi = {
  getMe:         ()                   => api.get('/users/me'),
  updateProfile: (data: any)          => api.patch('/users/me', data),
  updateAvatar:  (file: File)         => { const f = new FormData(); f.append('file', file); return api.post('/users/me/avatar', f, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  getAccessLog:  ()                   => api.get('/users/me/access-log'),
  getSessions:   ()                   => api.get('/users/me/sessions'),
  revokeSession: (id: string)         => api.delete(`/users/me/sessions/${id}`),
};

export const recordsApi = {
  list:          (params?: any)       => api.get('/records', { params }),
  upload:        (file: File, meta: any) => { const f = new FormData(); f.append('file', file); Object.entries(meta).forEach(([k,v]) => f.append(k, v as string)); return api.post('/records/upload', f, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  get:           (id: string)         => api.get(`/records/${id}`),
  delete:        (id: string)         => api.delete(`/records/${id}`),
  getSignedUrl:  (id: string)         => api.get(`/records/${id}/download`),
  update:        (id: string, d: any) => api.patch(`/records/${id}`, d),
  downloadFile:  (fileUrl: string)    => downloadAuthedBlob(fileUrl),
};

export const familyApi = {
  list:          ()                   => api.get('/family'),
  invite:        (data: any)          => api.post('/family/invite', data),
  acceptInvite:  (token: string)      => api.post(`/family/invite/${token}/accept`),
  declineInvite: (token: string)      => api.post(`/family/invite/${token}/decline`),
  remove:        (id: string)         => api.delete(`/family/${id}`),
  getHereditary: ()                   => api.get('/family/hereditary'),
};

export const shareApi = {
  create:        (data: any)          => api.post('/share', data),
  list:          ()                   => api.get('/share'),
  revoke:        (id: string)         => api.delete(`/share/${id}`),
  access:        (token: string)      => api.get(`/share/view/${token}`),
};

export const menstrualApi = {
  startCycle:    (data: any)          => api.post('/menstrual/cycles', data),
  getCycles:     ()                   => api.get('/menstrual/cycles'),
  logDay:        (data: any)          => api.post('/menstrual/daily-log', data),
  getStats:      ()                   => api.get('/menstrual/stats'),
  getCalendar:   ()                   => api.get('/menstrual/calendar'),
};

export const catalogApi = {
  searchMedications: (q: string, limit?: number) => api.get('/catalog/medications', { params: { q, limit } }),
  searchExams:       (q: string, limit?: number) => api.get('/catalog/exams', { params: { q, limit } }),
};

export const medicationsApi = {
  list:          ()                   => api.get('/medications'),
  create:        (data: any)          => api.post('/medications', data),
  update:        (id: string, d: any) => api.patch(`/medications/${id}`, d),
  delete:        (id: string)         => api.delete(`/medications/${id}`),
  logTaken:      (id: string, d: any) => api.post(`/medications/${id}/log`, d),
  getAdherence:  (id: string)         => api.get(`/medications/${id}/adherence`),
};

export const appointmentsApi = {
  list:          ()                   => api.get('/appointments'),
  create:        (data: any)          => api.post('/appointments', data),
  update:        (id: string, d: any) => api.patch(`/appointments/${id}`, d),
  delete:        (id: string)         => api.delete(`/appointments/${id}`),
};

export const chatApi = {
  start:         ()                   => api.post('/ai-chat/start'),
  sendMessage:   (message: string)    => api.post('/ai-chat/message', { message }),
  getHistory:    (days?: number)      => api.get('/ai-chat/history', { params: { days } }),
  getTrends:     (period: 'daily' | 'weekly' | 'monthly' | 'annual' = 'daily') =>
                   api.get('/ai-chat/trends', { params: { period } }),
};

export const ophthalmologyApi = {
  listExams:     ()                   => api.get('/ophthalmology/exams'),
  getExam:       (id: string)         => api.get(`/ophthalmology/exams/${id}`),
  createExam:    (data: any)          => api.post('/ophthalmology/exams', data),
  getHistory:    ()                   => api.get('/ophthalmology/history'),
  createHistory: (data: any)          => api.post('/ophthalmology/history', data),
  getLaudo:      (examId: string)     => downloadAuthedBlob(`/ophthalmology/exams/${examId}/laudo.pdf`),
};

export const occupationalHealthApi = {
  getQuestionnaire: ()         => api.get('/occupational-health/psychosocial/questionnaire'),
  listAssessments:  ()         => api.get('/occupational-health/psychosocial/assessments'),
  getAssessment:    (id: string) => api.get(`/occupational-health/psychosocial/assessments/${id}`),
  createAssessment: (data: any)  => api.post('/occupational-health/psychosocial/assessments', data),
  setSharing:       (id: string, shared: boolean) => api.patch(`/occupational-health/psychosocial/assessments/${id}/sharing`, { shared }),
  getLaudo:         (id: string) => downloadAuthedBlob(`/occupational-health/psychosocial/assessments/${id}/laudo.pdf`),
};

// ── Saúde Mental ────────────────────────────────────────────────────────────
export const mentalHealthApi = {
  listScales:       ()                      => api.get('/mental-health/scales'),
  getQuestionnaire: (code: string)          => api.get(`/mental-health/scales/${code}`),
  submit:           (code: string, data: any) => api.post(`/mental-health/assessments/${code}`, data),
  listAssessments:  (scale?: string)        => api.get('/mental-health/assessments', { params: scale ? { scale } : {} }),
  getAssessment:    (id: string)            => api.get(`/mental-health/assessments/${id}`),
  consolidated:     ()                      => api.get('/mental-health/assessments/consolidated'),
  saveConsolidated: ()                      => api.post('/mental-health/assessments/consolidated'),
};

// ── v7 — Exam Results ──────────────────────────────────────────────────────
export const examResultsApi = {
  list:             () => api.get('/exam-results'),
  get:              (id: string) => api.get(`/exam-results/${id}`),
  create:           (data: any) => api.post('/exam-results', data),
  summary:          () => api.get('/exam-results/summary'),
  markers:          () => api.get('/exam-results/markers'),
  timeline:         (marker: string, from?: string, to?: string) =>
    api.get('/exam-results/timeline', { params: { marker, from, to } }),
  trendReport:      (months?: number) =>
    api.get('/exam-results/trend-report', { params: { months } }),
};

// ── v7 — Lifestyle ─────────────────────────────────────────────────────────
export const lifestyleApi = {
  get:     () => api.get('/lifestyle'),
  upsert:  (data: any) => api.post('/lifestyle', data),
  history: () => api.get('/lifestyle/history'),
};

// ── v7 — Blood Pressure Map ─────────────────────────────────────────────────
export const bloodPressureApi = {
  list:     (days?: number) => api.get('/blood-pressure', { params: { days } }),
  create:   (data: any)     => api.post('/blood-pressure', data),
  delete:   (id: string)    => api.delete(`/blood-pressure/${id}`),
  analyze:  (days?: number) => api.get('/blood-pressure/analyze', { params: { days } }),
  classify: (systolic: number, diastolic: number) =>
    api.get('/blood-pressure/classify', { params: { systolic, diastolic } }),
};

// ── Sprint 14 — Glicemia / Módulo Diabetes ───────────────────────────────────
export const glucoseApi = {
  list:         (days?: number) => api.get('/glucose', { params: { days } }),
  create:       (data: any)     => api.post('/glucose', data),
  delete:       (id: string)    => api.delete(`/glucose/${id}`),
  analyze:      (days?: number) => api.get('/glucose/analyze', { params: { days } }),
  classify:     (value: number, context: string) =>
    api.get('/glucose/classify', { params: { value, context } }),
  createHbA1c:  (data: any)     => api.post('/glucose/hba1c', data),
  listHbA1c:    ()              => api.get('/glucose/hba1c'),
};

// ── Sprint 12 — Exportação PDF ───────────────────────────────────────────────
export const exportApi = {
  downloadMyPdf: async () => {
    const token = useAuthStore.getState().accessToken;
    const base  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res   = await fetch(`${base}/export/pdf/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Falha ao gerar PDF');
    return res.blob();
  },
  downloadPatientPdf: async (userId: string) => {
    const token = useAuthStore.getState().accessToken;
    const base  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res   = await fetch(`${base}/export/pdf/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Falha ao gerar PDF');
    return res.blob();
  },
};
