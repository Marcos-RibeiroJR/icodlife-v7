// apps/doutor/src/lib/auth.ts
import { api } from './api';

export interface DoctorUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  icode?: string;
}

export interface DoctorProfile {
  id: string;
  doctorId: string;
  crm: string;
  uf: string;
  crmStatus: 'pending' | 'verified' | 'suspended' | 'canceled';
  specialties: string[];
  healthPlans: string[];
  languages?: string[];
  education?: any[];
  certifications?: any[];
  bio?: string;
  consultPrice?: number;
  addressCity?: string;
  addressState?: string;
  phone?: string;
  website?: string;
  user: DoctorUser;
  _count: { patients: number };
}

// Autentica e salva o token, sem exigir role='doctor' — usado internamente
// pelo fluxo de CADASTRO (register/page.tsx), onde o usuário ainda é 'user'
// comum até o passo become-doctor rodar logo em seguida.
async function authenticate(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  const { accessToken, user } = res.data;

  if (typeof window !== 'undefined') {
    localStorage.setItem('doutor_token', accessToken);
    localStorage.setItem('doutor_user', JSON.stringify(user));
  }
  return { accessToken, user };
}

// Login da tela /login — aqui sim a conta já deve ter perfil de doutor ativo.
export async function login(email: string, password: string) {
  const { accessToken, user } = await authenticate(email, password);

  if (user.role !== 'doctor') {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('doutor_token');
      localStorage.removeItem('doutor_user');
    }
    throw new Error('Esta conta não possui perfil de Doutor. Acesse icodlife.com para ativar.');
  }

  return { accessToken, user };
}

// Após become-doctor ativar o perfil, atualiza o usuário salvo localmente
// (role já vem como 'doctor' na resposta do become-doctor's user, mas o
// localStorage ainda tem a versão antiga salva por `authenticate`).
export function updateStoredUser(user: DoctorUser) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('doutor_user', JSON.stringify(user));
  }
}

export { authenticate };

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('doutor_token');
    localStorage.removeItem('doutor_user');
    window.location.href = '/login';
  }
}

export function getStoredUser(): DoctorUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('doutor_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('doutor_token');
}

export async function getMyDoctorProfile(): Promise<DoctorProfile> {
  const res = await api.get('/doutor/me');
  return res.data;
}
