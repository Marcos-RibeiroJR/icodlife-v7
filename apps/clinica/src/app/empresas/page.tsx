'use client';
// apps/clinica/src/app/empresas/page.tsx
// Cadastro e consulta de Empresas (Medicina do Trabalho) com enriquecimento por CNPJ (BrasilAPI).
// Mesmo processo/API do apps/doutor/empresas, adaptado pro painel multi-médico da clínica:
// toda empresa fica vinculada à clínica (clinicId) E a um médico responsável (doctorId, obrigatório no schema).
import { useEffect, useMemo, useState, useCallback } from 'react';
import ClinicShell from '@/components/ui/ClinicShell';
import { clinicApi } from '@/lib/api';

const EMPTY = {
  doctorId: '',
  // Identificação
  razaoSocial: '', nomeFantasia: '', cnpj: '', inscricaoEstadual: '', inscricaoMunicipal: '',
  cnaePrincipal: '', cnaeSecundario: '', grauRisco: '', naturezaJuridica: '',
  codigoFpas: '', codigoTerceiros: '', regimeTributario: '', porte: '', dataFundacao: '', situacao: 'ativa',
  // Endereço
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil',
  // Contato
  telefonePrincipal: '', telefoneRh: '', whatsapp: '', emailRh: '', emailSst: '', site: '',
  // Trabalhistas
  qtdFuncionarios: '', qtdTerceiros: '', qtdEstagiarios: '', qtdAprendizes: '',
  turnos: '', funcionamento24h: false, sindicatoPatronal: '', sindicatoEmpregados: '', convencaoColetiva: '',
  // Responsáveis (JSON)
  respRhNome: '', respRhCpf: '', respRhTel: '', respRhEmail: '',
  respSstNome: '', respSstCpf: '', respSstReg: '', respSstTel: '', respSstEmail: '',
  respLegalNome: '', respLegalCpf: '', respLegalCargo: '', respLegalTel: '', respLegalEmail: '',
  // Medicina (flags JSON)
  temPcmso: false, temPgr: false, temLtcat: false, temErgonomico: false, temPca: false, temPpr: false, temAet: false,
  // Médico responsável/coordenador do PCMSO — exigido pelo evento eSocial S-2220 (grupo respMonit)
  pcmsoRespNome: '', pcmsoRespCpf: '', pcmsoRespCrm: '', pcmsoRespCrmUf: '',
  metadata: null as any,
};

function doctorLabel(d: any) { return d?.doctor?.user?.fullName ?? '—'; }

function buildPayload(f: typeof EMPTY) {
  const num = (v: string) => v !== '' && v != null ? Number(v) : undefined;
  return {
    doctorId: f.doctorId,
    razaoSocial: f.razaoSocial, nomeFantasia: f.nomeFantasia, cnpj: f.cnpj,
    inscricaoEstadual: f.inscricaoEstadual, inscricaoMunicipal: f.inscricaoMunicipal,
    cnaePrincipal: f.cnaePrincipal, cnaeSecundario: f.cnaeSecundario, grauRisco: num(f.grauRisco),
    naturezaJuridica: f.naturezaJuridica, codigoFpas: f.codigoFpas, codigoTerceiros: f.codigoTerceiros,
    regimeTributario: f.regimeTributario, porte: f.porte, dataFundacao: f.dataFundacao || undefined, situacao: f.situacao,
    cep: f.cep, logradouro: f.logradouro, numero: f.numero, complemento: f.complemento,
    bairro: f.bairro, cidade: f.cidade, estado: f.estado, pais: f.pais,
    telefonePrincipal: f.telefonePrincipal, telefoneRh: f.telefoneRh, whatsapp: f.whatsapp,
    emailRh: f.emailRh, emailSst: f.emailSst, site: f.site,
    qtdFuncionarios: num(f.qtdFuncionarios), qtdTerceiros: num(f.qtdTerceiros),
    qtdEstagiarios: num(f.qtdEstagiarios), qtdAprendizes: num(f.qtdAprendizes),
    turnos: f.turnos, funcionamento24h: f.funcionamento24h, sindicatoPatronal: f.sindicatoPatronal,
    sindicatoEmpregados: f.sindicatoEmpregados, convencaoColetiva: f.convencaoColetiva,
    responsaveis: {
      rh: { nome: f.respRhNome, cpf: f.respRhCpf, telefone: f.respRhTel, email: f.respRhEmail },
      sst: { nome: f.respSstNome, cpf: f.respSstCpf, registro: f.respSstReg, telefone: f.respSstTel, email: f.respSstEmail },
      representanteLegal: { nome: f.respLegalNome, cpf: f.respLegalCpf, cargo: f.respLegalCargo, telefone: f.respLegalTel, email: f.respLegalEmail },
    },
    medicina: {
      pcmso: f.temPcmso, pgr: f.temPgr, ltcat: f.temLtcat, laudoErgonomico: f.temErgonomico,
      pca: f.temPca, ppr: f.temPpr, aet: f.temAet,
      pcmsoResp: { nome: f.pcmsoRespNome, cpf: f.pcmsoRespCpf, crm: f.pcmsoRespCrm, crmUf: f.pcmsoRespCrmUf },
    },
    ...(f.metadata ? { metadata: f.metadata } : {}),
  };
}

const fmtCnpj = (c: string) => {
  const d = (c || '').replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
};

export default function EmpresasPage() {
  const [list, setList] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    clinicApi.listCompanies().then(r => setList(r.data ?? [])).catch(() => setList([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { clinicApi.listDoctors().then(r => setDoctors(r.data)).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c: any) =>
      c.razaoSocial?.toLowerCase().includes(q) ||
      c.nomeFantasia?.toLowerCase().includes(q) ||
      (c.cnpj || '').includes(q.replace(/\D/g, ''))
    );
  }, [list, search]);

  const openNew = () => {
    setForm({ ...EMPTY, doctorId: doctors.length === 1 ? doctors[0].doctorId : '' });
    setEditId(null); setError(''); setInfo(''); setShowForm(true);
  };

  const openEdit = (c: any) => {
    setEditId(c.id); setError(''); setInfo('');
    const r = c.responsaveis ?? {}; const m = c.medicina ?? {};
    setForm({
      ...EMPTY, ...c,
      doctorId: c.doctorId ?? '',
      grauRisco: c.grauRisco?.toString() ?? '', dataFundacao: c.dataFundacao ? c.dataFundacao.slice(0, 10) : '',
      qtdFuncionarios: c.qtdFuncionarios?.toString() ?? '', qtdTerceiros: c.qtdTerceiros?.toString() ?? '',
      qtdEstagiarios: c.qtdEstagiarios?.toString() ?? '', qtdAprendizes: c.qtdAprendizes?.toString() ?? '',
      respRhNome: r.rh?.nome ?? '', respRhCpf: r.rh?.cpf ?? '', respRhTel: r.rh?.telefone ?? '', respRhEmail: r.rh?.email ?? '',
      respSstNome: r.sst?.nome ?? '', respSstCpf: r.sst?.cpf ?? '', respSstReg: r.sst?.registro ?? '', respSstTel: r.sst?.telefone ?? '', respSstEmail: r.sst?.email ?? '',
      respLegalNome: r.representanteLegal?.nome ?? '', respLegalCpf: r.representanteLegal?.cpf ?? '', respLegalCargo: r.representanteLegal?.cargo ?? '', respLegalTel: r.representanteLegal?.telefone ?? '', respLegalEmail: r.representanteLegal?.email ?? '',
      temPcmso: !!m.pcmso, temPgr: !!m.pgr, temLtcat: !!m.ltcat, temErgonomico: !!m.laudoErgonomico, temPca: !!m.pca, temPpr: !!m.ppr, temAet: !!m.aet,
      pcmsoRespNome: m.pcmsoResp?.nome ?? '', pcmsoRespCpf: m.pcmsoResp?.cpf ?? '', pcmsoRespCrm: m.pcmsoResp?.crm ?? '', pcmsoRespCrmUf: m.pcmsoResp?.crmUf ?? '',
    });
    setShowForm(true);
  };

  const lookup = () => {
    setLooking(true); setError(''); setInfo('');
    clinicApi.lookupCnpj(form.cnpj)
      .then(r => {
        const d = r.data;
        setForm(f => ({
          ...f,
          razaoSocial: d.razaoSocial ?? f.razaoSocial, nomeFantasia: d.nomeFantasia ?? f.nomeFantasia,
          cnaePrincipal: d.cnaePrincipal ?? f.cnaePrincipal, cnaeSecundario: d.cnaeSecundario ?? f.cnaeSecundario,
          naturezaJuridica: d.naturezaJuridica ?? f.naturezaJuridica, porte: d.porte ?? f.porte,
          dataFundacao: d.dataFundacao ?? f.dataFundacao, situacao: d.situacao ?? f.situacao,
          cep: d.cep ?? f.cep, logradouro: d.logradouro ?? f.logradouro, numero: d.numero ?? f.numero,
          complemento: d.complemento ?? f.complemento, bairro: d.bairro ?? f.bairro,
          cidade: d.cidade ?? f.cidade, estado: d.estado ?? f.estado,
          telefonePrincipal: d.telefonePrincipal ?? f.telefonePrincipal, emailRh: d.emailRh ?? f.emailRh,
          metadata: d.metadata ?? f.metadata,
        }));
        setInfo('Dados preenchidos a partir da Receita (BrasilAPI). Confira e complete.');
      })
      .catch(e => setError(e?.response?.data?.message ?? 'Não foi possível consultar o CNPJ.'))
      .finally(() => setLooking(false));
  };

  const submit = () => {
    if (!form.doctorId) { setError('Selecione o médico responsável.'); return; }
    setSaving(true); setError('');
    const payload = buildPayload(form);
    const req = editId ? clinicApi.updateCompany(editId, payload) : clinicApi.createCompany(payload);
    req.then(() => { setShowForm(false); return load(); })
      .catch(e => {
        const m = e?.response?.data?.message;
        setError(Array.isArray(m) ? m.join(' | ') : (m ?? 'Erro ao salvar a empresa.'));
      })
      .finally(() => setSaving(false));
  };

  const remove = (id: string) => {
    if (!confirm('Excluir esta empresa?')) return;
    clinicApi.removeCompany(id).then(() => load());
  };

  const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm';
  const set = (k: keyof typeof EMPTY) => (e: any) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <ClinicShell>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Empresas</h1>
            <p className="text-slate-500 text-sm">Carteira de empresas (Medicina do Trabalho) da clínica.</p>
          </div>
          {!showForm && (
            <button onClick={openNew} className="bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 text-sm">
              + Nova empresa
            </button>
          )}
        </div>

        {showForm ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6">
            <h2 className="font-bold text-slate-700">{editId ? 'Editar empresa' : 'Nova empresa'}</h2>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Médico responsável *</label>
              <select className={inp} value={form.doctorId} onChange={set('doctorId')}>
                <option value="">— Selecionar médico da clínica —</option>
                {doctors.map((d: any) => (
                  <option key={d.doctorId} value={d.doctorId}>Dr(a). {doctorLabel(d)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 max-w-xs">
                <label className="text-xs font-medium text-slate-500 mb-1 block">CNPJ *</label>
                <input className={inp} value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" />
              </div>
              <button onClick={lookup} disabled={looking}
                className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-40 text-sm">
                {looking ? 'Buscando…' : '🔎 Buscar dados'}
              </button>
            </div>
            {info && <p className="text-xs text-emerald-700">{info}</p>}

            <Section title="Identificação">
              <F l="Razão Social *" v={form.razaoSocial} on={set('razaoSocial')} full />
              <F l="Nome Fantasia" v={form.nomeFantasia} on={set('nomeFantasia')} />
              <F l="Inscrição Estadual" v={form.inscricaoEstadual} on={set('inscricaoEstadual')} />
              <F l="Inscrição Municipal" v={form.inscricaoMunicipal} on={set('inscricaoMunicipal')} />
              <F l="CNAE Principal" v={form.cnaePrincipal} on={set('cnaePrincipal')} />
              <F l="CNAE Secundário" v={form.cnaeSecundario} on={set('cnaeSecundario')} full />
              <F l="Grau de Risco (1-4)" v={form.grauRisco} on={set('grauRisco')} type="number" />
              <F l="Natureza Jurídica" v={form.naturezaJuridica} on={set('naturezaJuridica')} />
              <F l="Código FPAS" v={form.codigoFpas} on={set('codigoFpas')} />
              <F l="Código Terceiros" v={form.codigoTerceiros} on={set('codigoTerceiros')} />
              <F l="Regime Tributário" v={form.regimeTributario} on={set('regimeTributario')} />
              <F l="Porte" v={form.porte} on={set('porte')} />
              <F l="Data de Fundação" v={form.dataFundacao} on={set('dataFundacao')} type="date" />
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Situação</label>
                <select className={inp} value={form.situacao} onChange={set('situacao')}>
                  <option value="ativa">Ativa</option><option value="inativa">Inativa</option>
                </select>
              </div>
            </Section>

            <Section title="Endereço">
              <F l="CEP" v={form.cep} on={set('cep')} />
              <F l="Logradouro" v={form.logradouro} on={set('logradouro')} full />
              <F l="Número" v={form.numero} on={set('numero')} />
              <F l="Complemento" v={form.complemento} on={set('complemento')} />
              <F l="Bairro" v={form.bairro} on={set('bairro')} />
              <F l="Cidade" v={form.cidade} on={set('cidade')} />
              <F l="Estado (UF)" v={form.estado} on={set('estado')} />
              <F l="País" v={form.pais} on={set('pais')} />
            </Section>

            <Section title="Contato">
              <F l="Telefone Principal" v={form.telefonePrincipal} on={set('telefonePrincipal')} />
              <F l="Telefone RH" v={form.telefoneRh} on={set('telefoneRh')} />
              <F l="WhatsApp" v={form.whatsapp} on={set('whatsapp')} />
              <F l="E-mail RH" v={form.emailRh} on={set('emailRh')} />
              <F l="E-mail SST" v={form.emailSst} on={set('emailSst')} />
              <F l="Site" v={form.site} on={set('site')} />
            </Section>

            <Section title="Dados Trabalhistas">
              <F l="Qtd. Funcionários" v={form.qtdFuncionarios} on={set('qtdFuncionarios')} type="number" />
              <F l="Qtd. Terceiros" v={form.qtdTerceiros} on={set('qtdTerceiros')} type="number" />
              <F l="Qtd. Estagiários" v={form.qtdEstagiarios} on={set('qtdEstagiarios')} type="number" />
              <F l="Qtd. Aprendizes" v={form.qtdAprendizes} on={set('qtdAprendizes')} type="number" />
              <F l="Turnos" v={form.turnos} on={set('turnos')} />
              <F l="Sindicato Patronal" v={form.sindicatoPatronal} on={set('sindicatoPatronal')} />
              <F l="Sindicato Empregados" v={form.sindicatoEmpregados} on={set('sindicatoEmpregados')} />
              <F l="Convenção Coletiva" v={form.convencaoColetiva} on={set('convencaoColetiva')} />
              <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                <input type="checkbox" checked={form.funcionamento24h} onChange={set('funcionamento24h')} /> Funcionamento 24 horas
              </label>
            </Section>

            <Section title="Responsável RH">
              <F l="Nome" v={form.respRhNome} on={set('respRhNome')} />
              <F l="CPF" v={form.respRhCpf} on={set('respRhCpf')} />
              <F l="Telefone" v={form.respRhTel} on={set('respRhTel')} />
              <F l="E-mail" v={form.respRhEmail} on={set('respRhEmail')} />
            </Section>
            <Section title="Responsável SST">
              <F l="Nome" v={form.respSstNome} on={set('respSstNome')} />
              <F l="CPF" v={form.respSstCpf} on={set('respSstCpf')} />
              <F l="CREA/CRM" v={form.respSstReg} on={set('respSstReg')} />
              <F l="Telefone" v={form.respSstTel} on={set('respSstTel')} />
              <F l="E-mail" v={form.respSstEmail} on={set('respSstEmail')} />
            </Section>
            <Section title="Representante Legal">
              <F l="Nome" v={form.respLegalNome} on={set('respLegalNome')} />
              <F l="CPF" v={form.respLegalCpf} on={set('respLegalCpf')} />
              <F l="Cargo" v={form.respLegalCargo} on={set('respLegalCargo')} />
              <F l="Telefone" v={form.respLegalTel} on={set('respLegalTel')} />
              <F l="E-mail" v={form.respLegalEmail} on={set('respLegalEmail')} />
            </Section>

            <div>
              <h3 className="font-bold text-slate-700 text-sm mb-2">Documentos de Medicina/SST</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([['temPcmso','PCMSO'],['temPgr','PGR'],['temLtcat','LTCAT'],['temErgonomico','Laudo Ergonômico'],['temPca','PCA'],['temPpr','PPR'],['temAet','AET']] as const).map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={form[k] as boolean} onChange={set(k)} /> {lbl}
                  </label>
                ))}
              </div>
            </div>

            <Section title="Médico responsável pelo PCMSO (exigido pelo eSocial S-2220)">
              <F l="Nome" v={form.pcmsoRespNome} on={set('pcmsoRespNome')} />
              <F l="CPF" v={form.pcmsoRespCpf} on={set('pcmsoRespCpf')} />
              <F l="CRM" v={form.pcmsoRespCrm} on={set('pcmsoRespCrm')} />
              <F l="UF do CRM" v={form.pcmsoRespCrmUf} on={set('pcmsoRespCrmUf')} />
            </Section>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={submit} disabled={saving} className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40">
                {saving ? 'Salvando…' : (editId ? 'Salvar alterações' : 'Cadastrar empresa')}
              </button>
              <button onClick={() => { setShowForm(false); setError(''); }} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 max-w-sm">
              <input className={inp} placeholder="Buscar por nome ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loading ? <p className="text-slate-400 text-sm">Carregando…</p> :
              filtered.length === 0 ? <p className="text-slate-400 text-sm">Nenhuma empresa cadastrada.</p> :
              <div className="space-y-2">
                {filtered.map(c => (
                  <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{c.nomeFantasia || c.razaoSocial}</div>
                      <div className="text-xs text-slate-400">
                        {fmtCnpj(c.cnpj)}{c.cidade ? ` · ${c.cidade}/${c.estado ?? ''}` : ''}
                        {c.grauRisco ? ` · Grau ${c.grauRisco}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.situacao === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.situacao === 'ativa' ? 'Ativa' : 'Inativa'}
                      </span>
                      <button onClick={() => openEdit(c)} className="text-xs text-indigo-600 hover:underline font-medium">Editar</button>
                      <button onClick={() => remove(c.id)} className="text-xs text-slate-400 hover:text-red-500">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>}
          </>
        )}
      </div>
    </ClinicShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-slate-700 text-sm mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function F({ l, v, on, full, type = 'text' }: { l: string; v: string; on: (e: any) => void; full?: boolean; type?: string }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-500 mb-1 block">{l}</label>
      <input type={type} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={v} onChange={on} />
    </div>
  );
}
