'use client';
// apps/doutor/src/app/profile/page.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import DoctorShell from '@/components/ui/DoctorShell';
import { getMyDoctorProfile, type DoctorProfile } from '@/lib/auth';
import { api } from '@/lib/api';

const HEALTH_PLANS = [
  'Amil', 'Bradesco Saude', 'Golden Cross', 'Hapvida', 'NotreDame Intermédica',
  'Omint', 'Porto Seguro Saude', 'SulAmérica', 'Unimed', 'Particular',
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);

  const { register, handleSubmit, reset } = useForm<any>();

  useEffect(() => {
    getMyDoctorProfile().then(p => {
      setProfile(p);
      setSelectedPlans(p.healthPlans ?? []);
      reset({
        bio:          p.bio ?? '',
        consultPrice: p.consultPrice ?? '',
        addressCity:  p.addressCity ?? '',
        phone:        p.phone ?? '',
        website:      p.website ?? '',
      });
    }).finally(() => setLoading(false));
  }, [reset]);

  const togglePlan = (plan: string) =>
    setSelectedPlans(prev => prev.includes(plan) ? prev.filter(x => x !== plan) : [...prev, plan]);

  const onSubmit = async (data: any) => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch('/doutor/profile', {
        ...data,
        consultPrice: data.consultPrice ? Number(data.consultPrice) : undefined,
        healthPlans:  selectedPlans,
      });
      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DoctorShell><div className="p-6 text-slate-400">Carregando...</div></DoctorShell>;

  return (
    <DoctorShell>
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Meu Perfil</h1>
          <p className="text-slate-500 text-sm mt-0.5">Informacoes visiveis para pacientes</p>
        </div>

        {/* Identidade */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-700">
              {profile?.user.fullName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{profile?.user.fullName}</p>
              <p className="text-sm text-slate-500">{profile?.user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {profile?.doctorId}
                </span>
                <span className="text-xs text-slate-400">CRM {profile?.crm}/{profile?.uf}</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-medium text-slate-700">Informacoes publicas</h2>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Bio profissional</label>
              <textarea {...register('bio')} rows={4} placeholder="Sua experiencia, areas de atuacao..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor consulta (R$)</label>
                <input {...register('consultPrice')} type="number" min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                <input {...register('addressCity')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                <input {...register('phone')} placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                <input {...register('website')} placeholder="https://"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-medium text-slate-700 mb-3">Planos aceitos</h2>
            <div className="flex flex-wrap gap-2">
              {HEALTH_PLANS.map(plan => (
                <button key={plan} type="button" onClick={() => togglePlan(plan)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${selectedPlans.includes(plan)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
                  {plan}
                </button>
              ))}
            </div>
          </div>

          {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">{success}</div>}
          {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
            {saving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </form>
      </div>
    </DoctorShell>
  );
}
