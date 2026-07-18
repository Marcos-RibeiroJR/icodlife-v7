// apps/clinica/src/lib/auth.ts
import { api, clinicApi } from './api';

export interface ClinicUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  icode?: string;
}

export interface ClinicProfile {
  id: string;
  clinicCode: string;
  ownerUserId: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  tipoEstabelecimento: string;
  cnes?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  site?: string;
  logoUrl?: string;
  healthPlans: string[];
  specialties: string[];
  status: string;
  doctorsCount: number;
  staffCount: number;
}

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  const { accessToken, user } = res.data;

  if (user.role !== 'clinic_admin') {
    throw new Error('Esta conta não possui perfil de Clínica. Cadastre sua clínica para acessar este painel.');
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('clinica_token', accessToken);
    localStorage.setItem('clinica_user', JSON.stringify(user));
  }
  return { accessToken, user };
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('clinica_token');
    localStorage.removeItem('clinica_user');
    window.location.href = '/login';
  }
}

export function getStoredUser(): ClinicUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('clinica_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('clinica_token');
}

export async function getMyClinicProfile(): Promise<ClinicProfile> {
  const res = await clinicApi.me();
  return res.data;
}
