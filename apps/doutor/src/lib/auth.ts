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
  bio?: string;
  consultPrice?: number;
  addressCity?: string;
  addressState?: string;
  phone?: string;
  website?: string;
  user: DoctorUser;
  _count: { patients: number };
}

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  const { accessToken, user } = res.data;

  if (user.role !== 'doctor') {
    throw new Error('Esta conta não possui perfil de Doutor. Acesse icodlife.com para ativar.');
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('doutor_token', accessToken);
    localStorage.setItem('doutor_user', JSON.stringify(user));
  }
  return { accessToken, user };
}

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
