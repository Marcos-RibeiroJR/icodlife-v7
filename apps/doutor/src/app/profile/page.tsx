'use client';
// apps/doutor/src/app/profile/page.tsx
// Sprint 17 — Meu Currículo
// Currículo médico completo: identidade, formação, especializações, idiomas, planos, certificações

import { useEffect, useState } from 'react';
import DoctorShell from '@/components/ui/DoctorShell';
import { getMyDoctorProfile } from '@/lib/auth';
import { api } from '@/lib/api';

const HEALTH_PLANS = [
  'Amil', 'Bradesco Saúde', 'Golden Cross', 'Hapvida', 'NotreDame Intermédica',
  'Omint', 'Porto Seguro Saúde', 'SulAmérica', 'Unimed', 'Particular',
];
const LANGUAGES_PT = [
  'Português', 'Inglês', 'Espanhol', 'Francês', 'Alemão',
  'Italiano', 'Mandarim', 'Japonês', 'Árabe', 'LIBRAS',
];
const SPECIALTY_LIST = [
  'Clínica Geral', 'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Gastroenterologia',
  'Ginecologia', 'Neurologia', 'Oftalmologia', 'Oncologia', 'Ortopedia',
  'Otorrinolaringologia', 'Pediatria', 'Psiquiatria', 'Reumatologia', 'Urologia',
  'Cirurgia Geral', 'Anestesiologia', 'Radiologia', 'Medicina do Trabalho', 'Geriatria',
];

type EducationEntry = { institution: string; degree: string; year: string };
type CertEntry      = { title: string; issuer: string; year: string };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{children}</p>;
}

function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
        ${active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'}`}>
      {label}
    </button>
  );
}

export default function ProfilePage() {
  const [profile,  setProfile]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');

  // Campos simples
  const [bio,          setBio]          = useState('');
  const [consultPrice, setConsultPrice] = useState('');
  const [addressCity,  setAddressCity]  = useState('');
  const [addressState, setAddressState] = useState('');
  const [phone,        setPhone]        = useState('');
  const [website,      setWebsite]      = useState('');

  // Arrays
  const [specialties,     setSpecialties]     = useState<string[]>([]);
  const [healthPlans,     setHealthPlans]      = useState<string[]>([]);
  const [languages,       setLanguages]        = useState<string[]>([]);
  const [education,       setEducation]        = useState<EducationEntry[]>([]);
  const [certifications,  setCertifications]   = useState<CertEntry[]>([]);

  useEffect(() => {
    getMyDoctorProfile().then(p => {
      setProfile(p);
      setBio(p.bio ?? '');
      setConsultPrice(p.consultPrice ? String(p.consultPrice) : '');
      setAddressCity(p.addressCity ?? '');
      setAddressState(p.addressState ?? '');
      setPhone(p.phone ?? '');
      setWebsite(p.website ?? '');
      setSpecialties(p.specialties ?? []);
      setHealthPlans(p.healthPlans ?? []);
      setLanguages(p.languages ?? []);
      setEducation(Array.isArray(p.education) ? p.education : []);
      setCertifications(Array.isArray(p.certifications) ? p.certifications : []);
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);

  // Education CRUD
  const addEdu = () => setEducation(p => [...p, { institution: '', degree: '', year: '' }]);
  const setEdu = (i: number, k: keyof EducationEntry, v: string) =>
    setEducation(p => p.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  const removeEdu = (i: number) => setEducation(p => p.filter((_, idx) => idx !== i));

  // Cert CRUD
  const addCert    = () => setCertifications(p => [...p, { title: '', issuer: '', year: '' }]);
  const setCert    = (i: number, k: keyof CertEntry, v: string) =>
    setCertifications(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const removeCert = (i: number) => setCertifications(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch('/doutor/profile', {
        bio, consultPrice: consultPrice ? Number(consultPrice) : undefined,
        addressCity, addressState, phone, website,
        specialties, healthPlans, languages,
        education:      education.filter(e => e.institution.trim() || e.degree.trim()),
        certifications: certifications.filter(c => c.title.trim()),
      });
      setSuccess('Currículo atualizado!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  if (loading) return <DoctorShell><div className="p-6 text-slate-400">Carregando...</div></DoctorShell>;

  const crmVerified = profile?.crmStatus === 'verified';

  return (
    <DoctorShell>
      <div className="p-6 max-w-3xl space-y-5">

        {/* ── Identidade ────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
              {profile?.user?.fullName?.[0] ?? 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-slate-800">{profile?.user?.fullName}</h1>
              <p className="text-sm text-slate-500">{profile?.user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100">
                  {profile?.doctorId}
                </span>
                <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                  CRM {profile?.crm}/{profile?.uf}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${
                  crmVerified
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {crmVerified ? '✓ CRM Verificado' : '⏳ CRM Pendente'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bio ───────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionTitle>Apresentação profissional</SectionTitle>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
            placeholder="Sua experiência, áreas de atuação, abordagem clínica..."
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Cidade</label>
              <input value={addressCity} onChange={e => setAddressCity(e.target.value)}
                placeholder="São Paulo" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Estado (UF)</label>
              <input value={addressState} onChange={e => setAddressState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP" maxLength={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Telefone / WhatsApp</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Website / LinkedIn</label>
              <input value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="https://" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Valor da consulta (R$)</label>
              <input type="number" min={0} value={consultPrice} onChange={e => setConsultPrice(e.target.value)}
                placeholder="0,00" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* ── Especializações ───────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionTitle>Especializações</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_LIST.map(s => (
              <Tag key={s} label={s} active={specialties.includes(s)}
                onClick={() => toggle(specialties, setSpecialties, s)} />
            ))}
          </div>
        </div>

        {/* ── Formação acadêmica ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Formação Acadêmica</SectionTitle>
            <button onClick={addEdu} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Adicionar</button>
          </div>
          {education.length === 0 && (
            <p className="text-xs text-slate-400 italic">Nenhuma formação cadastrada.</p>
          )}
          <div className="space-y-3">
            {education.map((e, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs text-slate-400 mb-1">Instituição</label>}
                  <input value={e.institution} onChange={ev => setEdu(i, 'institution', ev.target.value)}
                    placeholder="USP, UNICAMP..." className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs text-slate-400 mb-1">Título / Curso</label>}
                  <input value={e.degree} onChange={ev => setEdu(i, 'degree', ev.target.value)}
                    placeholder="Medicina, Residência em Cardiologia..." className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="block text-xs text-slate-400 mb-1">Ano</label>}
                  <input value={e.year} onChange={ev => setEdu(i, 'year', ev.target.value)}
                    placeholder="2018" className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  {i === 0 && <div className="h-5" />}
                  <button onClick={() => removeEdu(i)} className="text-slate-300 hover:text-red-400 text-xl leading-none">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Certificações ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Certificações & Títulos</SectionTitle>
            <button onClick={addCert} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Adicionar</button>
          </div>
          {certifications.length === 0 && (
            <p className="text-xs text-slate-400 italic">Nenhuma certificação cadastrada.</p>
          )}
          <div className="space-y-3">
            {certifications.map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs text-slate-400 mb-1">Título / Certificação</label>}
                  <input value={c.title} onChange={ev => setCert(i, 'title', ev.target.value)}
                    placeholder="Título de Especialista em Cardiologia" className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs text-slate-400 mb-1">Entidade emissora</label>}
                  <input value={c.issuer} onChange={ev => setCert(i, 'issuer', ev.target.value)}
                    placeholder="CFM, SBC, AMB..." className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="block text-xs text-slate-400 mb-1">Ano</label>}
                  <input value={c.year} onChange={ev => setCert(i, 'year', ev.target.value)}
                    placeholder="2022" className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  {i === 0 && <div className="h-5" />}
                  <button onClick={() => removeCert(i)} className="text-slate-300 hover:text-red-400 text-xl leading-none">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Idiomas ───────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionTitle>Idiomas</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES_PT.map(l => (
              <Tag key={l} label={l} active={languages.includes(l)}
                onClick={() => toggle(languages, setLanguages, l)} />
            ))}
          </div>
        </div>

        {/* ── Planos aceitos ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <SectionTitle>Convênios e planos aceitos</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {HEALTH_PLANS.map(plan => (
              <Tag key={plan} label={plan} active={healthPlans.includes(plan)}
                onClick={() => toggle(healthPlans, setHealthPlans, plan)} />
            ))}
          </div>
        </div>

        {/* ── Status + Salvar ───────────────────────────────────────────── */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
            ✓ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button onClick={save} disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
          {saving ? 'Salvando...' : 'Salvar Currículo'}
        </button>

        <p className="text-center text-xs text-slate-400 pb-4">
          Seu perfil é exibido para pacientes ao buscar médicos no ICODLIFE.
        </p>
      </div>
    </DoctorShell>
  );
}
