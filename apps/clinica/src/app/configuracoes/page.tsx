'use client';
// apps/clinica/src/app/configuracoes/page.tsx
import { useEffect, useState } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { getMyClinicProfile, type ClinicProfile } from '@/lib/auth';
import { clinicApi } from '@/lib/api';

const TIPOS = [
  { value: 'clinica',      label: 'Clínica' },
  { value: 'consultorio',  label: 'Consultório multiprofissional' },
  { value: 'hospital',     label: 'Hospital' },
  { value: 'laboratorio',  label: 'Laboratório' },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm]       = useState<any>({});

  useEffect(() => {
    getMyClinicProfile()
      .then(p => { setProfile(p); setForm(p); })
      .catch(err => setError(err.response?.data?.message ?? 'Erro ao carregar dados da clínica'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const { data } = await clinicApi.updateMe({
        razaoSocial: form.razaoSocial, nomeFantasia: form.nomeFantasia,
        tipoEstabelecimento: form.tipoEstabelecimento, cnes: form.cnes,
        cep: form.cep, logradouro: form.logradouro, numero: form.numero,
        complemento: form.complemento, bairro: form.bairro, cidade: form.cidade, estado: form.estado,
        telefone: form.telefone, whatsapp: form.whatsapp, email: form.email, site: form.site,
      });
      setProfile((p) => ({ ...(p as ClinicProfile), ...data }));
      setSuccess('Dados da clínica atualizados com sucesso.');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <ClinicShell><div className="p-8 text-center text-slate-400 text-sm">Carregando...</div></ClinicShell>;
  }

  return (
    <ClinicShell>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">Configurações da clínica</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            ClinicID: <span className="font-mono text-indigo-700">{profile?.clinicCode}</span>
            {' '}· CNPJ: <span className="font-mono">{profile?.cnpj}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Razão social</label>
              <input value={form.razaoSocial ?? ''} onChange={e => set('razaoSocial', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome fantasia</label>
              <input value={form.nomeFantasia ?? ''} onChange={e => set('nomeFantasia', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de estabelecimento</label>
              <select value={form.tipoEstabelecimento ?? 'clinica'} onChange={e => set('tipoEstabelecimento', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNES</label>
              <input value={form.cnes ?? ''} onChange={e => set('cnes', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
              <input value={form.cep ?? ''} onChange={e => set('cep', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
              <input value={form.cidade ?? ''} onChange={e => set('cidade', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select value={form.estado ?? ''} onChange={e => set('estado', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Selecione</option>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro</label>
              <input value={form.logradouro ?? ''} onChange={e => set('logradouro', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Número / complemento</label>
              <div className="flex gap-2">
                <input value={form.numero ?? ''} onChange={e => set('numero', e.target.value)} placeholder="Nº"
                  className="w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={form.complemento ?? ''} onChange={e => set('complemento', e.target.value)} placeholder="Complemento"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
              <input value={form.telefone ?? ''} onChange={e => set('telefone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
              <input value={form.whatsapp ?? ''} onChange={e => set('whatsapp', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input value={form.email ?? ''} onChange={e => set('email', e.target.value)} type="email"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site</label>
              <input value={form.site ?? ''} onChange={e => set('site', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">{success}</div>}

          <button type="submit" disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </ClinicShell>
  );
}
