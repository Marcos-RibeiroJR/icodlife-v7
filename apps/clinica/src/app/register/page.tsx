'use client';
// apps/clinica/src/app/register/page.tsx
// Ativa o perfil de clínica numa conta ICODLIFE já existente (paciente ou médico).
// Fluxo: 1) login com a conta existente 2) preenche os dados da clínica (CNPJ etc.)
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, clinicApi } from '@/lib/api';

const TIPOS = [
  { value: 'clinica',      label: 'Clínica' },
  { value: 'consultorio',  label: 'Consultório multiprofissional' },
  { value: 'hospital',     label: 'Hospital' },
  { value: 'laboratorio',  label: 'Laboratório' },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const loginSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type LoginForm = z.infer<typeof loginSchema>;

const clinicSchema = z.object({
  razaoSocial:         z.string().min(3, 'Obrigatório'),
  nomeFantasia:        z.string().optional(),
  cnpj:                z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos (sem pontuação)'),
  tipoEstabelecimento: z.string().min(1),
  estado:              z.string().length(2, 'Selecione o estado'),
  cidade:               z.string().optional(),
  telefone:             z.string().optional(),
  email:                z.string().email('E-mail inválido').optional().or(z.literal('')),
});
type ClinicForm = z.infer<typeof clinicSchema>;

export default function RegisterClinicPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const clinicForm = useForm<ClinicForm>({
    resolver: zodResolver(clinicSchema),
    defaultValues: { tipoEstabelecimento: 'clinica' },
  });

  const onLogin = async (data: LoginForm) => {
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken } = res.data;
      localStorage.setItem('clinica_token', accessToken);
      setToken(accessToken);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciais inválidas. Verifique e-mail e senha da sua conta ICODLIFE.');
    } finally { setLoading(false); }
  };

  const onCreateClinic = async (data: ClinicForm) => {
    setError(''); setLoading(true);
    try {
      const payload = { ...data, email: data.email || undefined };
      await clinicApi.becomeClinicAdmin(payload);
      // role muda no banco imediatamente; busca o usuário atualizado para gravar localmente
      const me = await api.get('/users/me');
      localStorage.setItem('clinica_user', JSON.stringify(me.data));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao cadastrar clínica');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/logo-dark.svg" alt="IcodLife" className="h-12 w-auto mx-auto mb-2" />
          <span className="inline-block text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-0.5 rounded-full tracking-wide uppercase">Ativar Painel de Clínica</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {step === 1 ? (
            <>
              <h1 className="text-xl font-semibold text-slate-800 mb-1">1. Entre com sua conta ICODLIFE</h1>
              <p className="text-sm text-slate-500 mb-6">Use uma conta já existente (paciente ou médico) — ela vira administradora da clínica.</p>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input {...loginForm.register('email')} type="email" placeholder="seu@email.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {loginForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <input {...loginForm.register('password')} type="password" placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {loginForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>}
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  {loading ? 'Verificando...' : 'Continuar'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-slate-800 mb-1">2. Dados da clínica</h1>
              <p className="text-sm text-slate-500 mb-6">Preencha o CNPJ e as informações básicas do estabelecimento.</p>
              <form onSubmit={clinicForm.handleSubmit(onCreateClinic)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Razão social</label>
                  <input {...clinicForm.register('razaoSocial')} placeholder="Clínica Exemplo LTDA"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {clinicForm.formState.errors.razaoSocial && <p className="text-red-500 text-xs mt-1">{clinicForm.formState.errors.razaoSocial.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome fantasia</label>
                  <input {...clinicForm.register('nomeFantasia')} placeholder="Clínica Exemplo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ (só números)</label>
                    <input {...clinicForm.register('cnpj')} placeholder="12345678000199" maxLength={14}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    {clinicForm.formState.errors.cnpj && <p className="text-red-500 text-xs mt-1">{clinicForm.formState.errors.cnpj.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                    <select {...clinicForm.register('tipoEstabelecimento')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <select {...clinicForm.register('estado')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Selecione</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                    {clinicForm.formState.errors.estado && <p className="text-red-500 text-xs mt-1">{clinicForm.formState.errors.estado.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                    <input {...clinicForm.register('cidade')} placeholder="São Paulo"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                    <input {...clinicForm.register('telefone')} placeholder="(11) 5555-1234"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-mail da clínica</label>
                    <input {...clinicForm.register('email')} type="email" placeholder="contato@clinica.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                  {loading ? 'Cadastrando...' : 'Ativar painel de clínica'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
            Já tem clínica cadastrada?{' '}
            <a href="/login" className="text-indigo-600 hover:underline font-medium">Entrar</a>
          </div>
        </div>
      </div>
    </div>
  );
}
