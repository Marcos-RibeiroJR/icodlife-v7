'use client';
// apps/doutor/src/app/register/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { login } from '@/lib/auth';

const SPECIALTIES = [
  'Clínica Geral', 'Cardiologia', 'Dermatologia', 'Endocrinologia',
  'Gastroenterologia', 'Geriatria', 'Ginecologia', 'Neurologia',
  'Oftalmologia', 'Oncologia', 'Ortopedia', 'Pediatria',
  'Psiquiatria', 'Reumatologia', 'Urologia', 'Outra',
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const schema = z.object({
  // Conta icodlife
  fullName:               z.string().min(3, 'Nome muito curto'),
  email:                  z.string().email('E-mail inválido'),
  password:               z.string().min(8, 'Mínimo 8 caracteres').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Precisa ter maiúscula, minúscula, número e símbolo (@$!%*?&). Ex: Demo@12345'),
  dateOfBirth:            z.string().min(1, 'Obrigatório'),
  gender:                 z.enum(['male', 'female', 'other']),
  // Perfil doutor
  crm:                    z.string().min(4, 'CRM inválido').max(10),
  uf:                     z.string().length(2, 'Selecione o estado'),
  specialties:            z.array(z.string()).min(1, 'Selecione ao menos uma especialidade'),
  bio:                    z.string().optional(),
  consultPrice:           z.string().optional(),
  addressCity:            z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep]     = useState<1 | 2>(1);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, getValues, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { specialties: [] },
  });

  const toggleSpec = (s: string) => {
    setSelectedSpecs(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const goStep2 = async () => {
    const ok = await trigger(['fullName', 'email', 'password', 'dateOfBirth', 'gender']);
    if (ok) setStep(2);
  };

  const onSubmit = async (data: FormData) => {
    if (selectedSpecs.length === 0) {
      setError('Selecione ao menos uma especialidade');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Cria conta de usuário
      await api.post('/auth/register', {
        fullName:               data.fullName,
        email:                  data.email,
        password:               data.password,
        dateOfBirth:            data.dateOfBirth,
        gender:                 data.gender,
        acceptedTerms:          true,
        acceptedDataProcessing: true,
      });

      // 2. Login para obter token
      await login(data.email, data.password);

      // 3. Ativa perfil de doutor
      await api.post('/auth/become-doctor', {
        crm:          data.crm,
        uf:           data.uf,
        specialties:  selectedSpecs,
        bio:          data.bio,
        consultPrice: data.consultPrice ? Number(data.consultPrice) : undefined,
        addressCity:  data.addressCity,
        addressState: data.uf,
      });

      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">+</span>
            </div>
            <span className="text-2xl font-bold text-slate-800">IcodLife</span>
            <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Doutor</span>
          </div>
          <p className="text-slate-500 text-sm">Criar conta e ativar perfil de Doutor</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {s}
              </div>
              <span className={`text-xs ${step >= s ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                {s === 1 ? 'Conta' : 'Perfil Doutor'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-slate-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* STEP 1 — Dados pessoais */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Dados pessoais</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
                  <input {...register('fullName')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <input {...register('email')} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <input {...register('password')} type="password" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de nascimento</label>
                    <input {...register('dateOfBirth')} type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
                    <select {...register('gender')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">Selecione</option>
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                      <option value="other">Outro</option>
                    </select>
                    {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
                  </div>
                </div>
                <button type="button" onClick={goStep2}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2">
                  Continuar
                </button>
              </div>
            )}

            {/* STEP 2 — Perfil Doutor */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Perfil de Doutor</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CRM</label>
                    <input {...register('crm')} placeholder="12345" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {errors.crm && <p className="text-red-500 text-xs mt-1">{errors.crm.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
                    <select {...register('uf')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">UF</option>
                      {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    {errors.uf && <p className="text-red-500 text-xs mt-1">{errors.uf.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Especialidades *</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map(s => (
                      <button key={s} type="button" onClick={() => toggleSpec(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                          ${selectedSpecs.includes(s)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  {errors.specialties && <p className="text-red-500 text-xs mt-1">{errors.specialties.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                    <input {...register('addressCity')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor consulta (R$)</label>
                    <input {...register('consultPrice')} type="number" min="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bio profissional</label>
                  <textarea {...register('bio')} rows={3} placeholder="Descreva sua experiencia..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg">
                  Seu CRM sera validado manualmente pela equipe IcodLife em ate 24h.
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 border border-slate-300 text-slate-700 font-medium py-2.5 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                    Voltar
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Ja tem conta?{' '}
          <a href="/login" className="text-blue-600 hover:underline font-medium">Entrar</a>
        </p>
      </div>
    </div>
  );
}
