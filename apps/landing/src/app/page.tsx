// apps/landing/src/app/page.tsx
// Site institucional do iCODLIFE — servido na raiz do domínio (icodlife.com.br).
'use client';

import { useEffect, useRef, useState } from 'react';

const LINKS = {
  paciente: 'https://app.icodlife.com.br',
  pacienteRegister: 'https://app.icodlife.com.br/auth/register',
  pacienteLogin: 'https://app.icodlife.com.br/auth/login',
  medico: 'https://doutor.icodlife.com.br',
  medicoRegister: 'https://doutor.icodlife.com.br/register',
  medicoLogin: 'https://doutor.icodlife.com.br/login',
  clinica: 'https://clinica.icodlife.com.br',
  clinicaRegister: 'https://clinica.icodlife.com.br/register',
  clinicaLogin: 'https://clinica.icodlife.com.br/login',
};

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Counter({ to, suffix = '', label }: { to: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          const duration = 1400;
          const t0 = performance.now();
          const step = (t: number) => {
            const p = Math.min(1, (t - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(eased * to));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started, to]);

  return (
    <div ref={ref}>
      <div className="text-3xl md:text-4xl font-bold text-white">{value}{suffix}</div>
      <div className="text-sm text-white/60 mt-1">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-white text-ink-900 overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#topo" className="flex items-center gap-2">
            <img src="/logo.svg" alt="iCODLIFE" style={{ height: 30 }} />
          </a>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#ecossistema" className="hover:text-brand-primary transition-colors">Ecossistema</a>
            <a href="#modulos" className="hover:text-brand-primary transition-colors">Módulos</a>
            <a href="#recursos" className="hover:text-brand-primary transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-brand-primary transition-colors">Planos</a>
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <a href={LINKS.pacienteLogin} className="text-sm font-semibold text-slate-600 hover:text-brand-primary transition-colors px-3">Entrar</a>
            <a href={LINKS.pacienteRegister} className="btn-solid !py-2.5 !px-5">Criar conta grátis</a>
          </div>

          <button
            aria-label="Abrir menu"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <div className="w-5 flex flex-col gap-1.5">
              <span className="block h-0.5 bg-ink-900 rounded" />
              <span className="block h-0.5 bg-ink-900 rounded" />
              <span className="block h-0.5 bg-ink-900 rounded" />
            </div>
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 animate-fade-in-down">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 text-sm font-medium text-slate-600">
              <a href="#ecossistema" onClick={() => setMenuOpen(false)}>Ecossistema</a>
              <a href="#modulos" onClick={() => setMenuOpen(false)}>Módulos</a>
              <a href="#recursos" onClick={() => setMenuOpen(false)}>Recursos</a>
              <a href="#planos" onClick={() => setMenuOpen(false)}>Planos</a>
              <div className="h-px bg-slate-100 my-1" />
              <a href={LINKS.pacienteLogin} className="font-semibold text-ink-900">Entrar</a>
              <a href={LINKS.pacienteRegister} className="btn-solid w-full">Criar conta grátis</a>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section id="topo" className="relative bg-ink-950 pt-40 pb-32 px-6 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-brand-primary/25 blur-3xl blob" />
        <div className="absolute top-40 -right-24 w-[380px] h-[380px] rounded-full bg-teal-medium/20 blur-3xl blob blob-delay" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <span className="pill bg-white/10 text-white/80 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-medium dot-ping" />
                Um ecossistema, um cadastro único
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 text-4xl md:text-5xl lg:text-[3.4rem] font-bold text-white leading-[1.1]">
                Sua saúde, conectada do primeiro exame ao cuidado contínuo
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 text-lg text-white/65 leading-relaxed max-w-xl">
                O iCODLIFE une pacientes, médicos e clínicas em uma única plataforma.
                Prontuário, exames, telemedicina, atendimento e financeiro — tudo
                integrado por um único cadastro, o seu ICODE.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href={LINKS.pacienteRegister} className="btn-solid">
                  Criar minha conta grátis
                </a>
                <a href="#modulos" className="btn-outline">
                  Conhecer os módulos
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-14 grid grid-cols-3 gap-8 max-w-md">
                <Counter to={3} label="Portais integrados" />
                <Counter to={100} suffix="%" label="Dados no seu controle" />
                <Counter to={1} label="Cadastro para toda a vida" />
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative">
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <svg viewBox="0 0 520 160" className="w-full h-auto" role="img" aria-label="Linha de batimento cardíaco animada">
                <polyline
                  className="pulse-line"
                  fill="none"
                  stroke="#F87171"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,80 90,80 115,80 130,30 150,130 170,50 190,80 260,80 280,80 300,20 320,140 340,80 520,80"
                />
              </svg>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {[
                  { label: 'Prontuário', value: 'Atualizado agora' },
                  { label: 'Próxima consulta', value: 'Cardiologia · ter 14h' },
                  { label: 'Exames', value: '2 resultados novos' },
                  { label: 'Carteirinha', value: 'ICODE ativo' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-white/40 font-semibold">{item.label}</div>
                    <div className="text-sm text-white/85 mt-1 font-medium">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Faixa de confiança ─────────────────────────────────────────── */}
      <section className="bg-ink-900 py-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-12 gap-y-3 text-white/50 text-sm font-medium">
          <span>Conformidade LGPD</span>
          <span>Criptografia ponta a ponta</span>
          <span>Suporte a ASO e eSocial</span>
          <span>Acesso web e mobile</span>
          <span>Cadastro único ICODE</span>
        </div>
      </section>

      {/* ── Ecossistema / ICODE ────────────────────────────────────────── */}
      <section id="ecossistema" className="py-28 px-6 bg-brand-bg">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <span className="pill bg-brand-light text-brand-deep">Cadastro único</span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold text-ink-900">
              Um ICODE. Três portais. Uma vida inteira de saúde organizada.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 text-slate-600 text-lg leading-relaxed">
              Quando um paciente vira colaborador de uma empresa, ou uma clínica atende
              alguém pela primeira vez, ninguém recomeça do zero: o histórico segue a pessoa,
              não o sistema.
            </p>
          </Reveal>
        </div>

        <div className="max-w-6xl mx-auto mt-16 grid md:grid-cols-3 gap-6">
          {[
            { icon: 'ti-user-heart', title: 'Paciente', desc: 'Cria sua conta uma vez e leva o histórico para qualquer médico ou clínica conectada.' },
            { icon: 'ti-stethoscope', title: 'Médico', desc: 'Encontra e vincula o paciente pelo ICODE — sem duplicar cadastro, sem digitar dados às cegas.' },
            { icon: 'ti-building-hospital', title: 'Clínica', desc: 'Funcionários, guichês e base de consultas usam o mesmo diretório iCODLIFE.' },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 100}>
              <div className="card-tilt bg-white rounded-2xl border border-slate-100 p-7 h-full">
                <div className="w-11 h-11 rounded-xl bg-brand-light flex items-center justify-center text-brand-primary text-xl font-bold">
                  {item.title.charAt(0)}
                </div>
                <h3 className="mt-5 font-semibold text-lg text-ink-900">{item.title}</h3>
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Módulos ────────────────────────────────────────────────────── */}
      <section id="modulos" className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <Reveal>
            <span className="pill bg-teal-soft text-teal-primary">Módulos da plataforma</span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold text-ink-900">
              Feito para cada lado do cuidado
            </h2>
          </Reveal>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col gap-24">
          {/* Paciente */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <span className="pill bg-brand-light text-brand-deep">Portal do paciente</span>
              <h3 className="mt-4 text-2xl md:text-3xl font-bold text-ink-900">Sua saúde, sempre à mão</h3>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Prontuário, exames e medicamentos organizados em uma linha do tempo,
                com carteirinha digital, telemedicina e um assistente de saúde por IA
                para tirar dúvidas do dia a dia.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {['Linha do tempo de exames e medicamentos', 'Carteirinha digital com QR Code', 'Telemedicina e chat com médicos', 'Módulo Vida: pressão, glicemia e saúde mental', 'Vacinas e histórico familiar'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-light text-brand-primary flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={LINKS.pacienteRegister} className="btn-ghost mt-8">Criar conta de paciente</a>
            </Reveal>

            <Reveal delay={120} className="card-tilt">
              <div className="rounded-3xl bg-brand-deep p-6">
                <div className="rounded-2xl bg-white p-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center font-bold text-brand-primary text-sm">MR</div>
                    <div>
                      <div className="text-sm font-semibold text-ink-900">Carteirinha iCODLIFE</div>
                      <div className="text-xs text-slate-400">ICODE 00021.SP</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {['Tipo sanguíneo: O+', 'Doador de órgãos: sim', 'Última consulta: cardiologia'].map((l) => (
                      <div key={l} className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{l}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Médico */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal delay={120} className="card-tilt lg:order-1">
              <div className="rounded-3xl bg-teal-deep p-6">
                <div className="rounded-2xl bg-white p-5 space-y-3">
                  <div className="text-sm font-semibold text-ink-900 pb-3 border-b border-slate-100">Agenda de hoje</div>
                  {[
                    { hora: '09:00', nome: 'Consulta · retorno' },
                    { hora: '10:30', nome: 'Telemedicina' },
                    { hora: '14:00', nome: 'ASO admissional' },
                  ].map((c) => (
                    <div key={c.hora} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2.5">
                      <span className="font-semibold text-teal-primary">{c.hora}</span>
                      <span className="text-slate-500">{c.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:order-2">
              <span className="pill bg-teal-soft text-teal-primary">Portal do médico</span>
              <h3 className="mt-4 text-2xl md:text-3xl font-bold text-ink-900">Consultório digital, do currículo ao financeiro</h3>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Cadastro com CRM, currículo e especialidades, agenda, prontuário
                eletrônico, prescrições, telemedicina e um painel financeiro
                completo do consultório.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {['Agenda, prontuário e prescrições digitais', 'Telemedicina e chat com pacientes', 'ASO e medicina do trabalho', 'Financeiro do consultório com analytics', 'Cadastro único de pacientes pelo ICODE'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-light text-teal-primary flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={LINKS.medicoRegister} className="btn-ghost mt-8">Cadastrar como médico</a>
            </Reveal>
          </div>

          {/* Clínica */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <span className="pill bg-brand-light text-brand-deep">Portal da clínica</span>
              <h3 className="mt-4 text-2xl md:text-3xl font-bold text-ink-900">Gestão completa, de guichê a DRE</h3>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Múltiplos médicos, salas e guichês de atendimento em um só painel,
                com faturamento automático por exame, filtros financeiros detalhados
                e conformidade com ASO e eSocial.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {['Atendimento por guichê com fila em tempo real', 'Base de consultas e empresas clientes', 'Financeiro com filtros por sala, guichê, médico e exame', 'ASO e integração eSocial', 'Cadastro único de funcionários e pacientes'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-light text-brand-primary flex items-center justify-center text-xs font-bold shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={LINKS.clinicaRegister} className="btn-ghost mt-8">Cadastrar minha clínica</a>
            </Reveal>

            <Reveal delay={120} className="card-tilt">
              <div className="rounded-3xl bg-brand-deep p-6">
                <div className="rounded-2xl bg-white p-5">
                  <div className="text-sm font-semibold text-ink-900 pb-3 border-b border-slate-100">Financeiro — extrato do dia</div>
                  <div className="mt-4 space-y-2.5">
                    {[
                      { label: 'Guichê 2 · exame admissional', valor: '+ R$ 180' },
                      { label: 'Sala 3 · Dra. Souza', valor: '+ R$ 240' },
                      { label: 'Guichê 1 · exame periódico', valor: '+ R$ 150' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2.5">
                        <span className="text-slate-500">{row.label}</span>
                        <span className="font-semibold text-teal-primary">{row.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Recursos ───────────────────────────────────────────────────── */}
      <section id="recursos" className="py-28 px-6 bg-ink-950">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Reveal>
            <span className="pill bg-white/10 text-white/80">Recursos</span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold text-white">
              Tudo o que conecta cuidado a resultado
            </h2>
          </Reveal>
        </div>

        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5 grid-fade">
          {[
            { title: 'Telemedicina', desc: 'Consultas por vídeo entre paciente e médico, direto da plataforma.' },
            { title: 'Assistente de saúde por IA', desc: 'Tira dúvidas e organiza sintomas antes da consulta.' },
            { title: 'Carteirinha digital', desc: 'Identificação com QR Code, tipo sanguíneo e doação de órgãos.' },
            { title: 'ASO e eSocial', desc: 'Atestados de saúde ocupacional com integração aos eventos do eSocial.' },
            { title: 'Atendimento por guichê', desc: 'Fila em tempo real e faturamento automático por tipo de exame.' },
            { title: 'Financeiro inteligente', desc: 'DRE, repasse por médico e filtros por sala, guichê e exame.' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <div className="card-tilt rounded-2xl bg-white/[0.04] border border-white/10 p-6 h-full">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-teal-medium font-bold text-sm">{i + 1}</div>
                <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Como funciona ──────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Reveal>
            <span className="pill bg-teal-soft text-teal-primary">Como funciona</span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold text-ink-900">Três passos para começar</h2>
          </Reveal>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { n: '01', title: 'Crie seu cadastro', desc: 'Paciente, médico ou clínica — um cadastro gera o seu ICODE único.' },
            { n: '02', title: 'Conecte-se', desc: 'Médicos e clínicas encontram pessoas pelo ICODE, sem retrabalho.' },
            { n: '03', title: 'Acompanhe tudo', desc: 'Prontuário, agenda e financeiro atualizados em tempo real.' },
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 100}>
              <div className="relative">
                <div className="text-5xl font-bold text-brand-light">{step.n}</div>
                <h3 className="mt-3 font-semibold text-lg text-ink-900">{step.title}</h3>
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Planos ─────────────────────────────────────────────────────── */}
      <section id="planos" className="py-28 px-6 bg-brand-bg">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Reveal>
            <span className="pill bg-brand-light text-brand-deep">Planos para médicos</span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold text-ink-900">Comece grátis, evolua quando quiser</h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 text-slate-600">Pacientes e clínicas usam o iCODLIFE sem custo. Para médicos, o plano Profissional chega em breve.</p>
          </Reveal>
        </div>

        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
          <Reveal>
            <div className="card-tilt bg-white rounded-2xl border border-slate-100 p-8 h-full">
              <h3 className="font-semibold text-lg text-ink-900">Gratuito</h3>
              <p className="text-sm text-slate-500 mt-1">Para começar a atender pela plataforma</p>
              <div className="mt-5 text-3xl font-bold text-ink-900">R$ 0</div>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                {['Perfil e currículo público', 'Agenda e prontuário eletrônico', 'Cadastro de pacientes via ICODE'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-teal-primary font-bold">✓</span>{f}</li>
                ))}
              </ul>
              <a href={LINKS.medicoRegister} className="btn-ghost w-full mt-8">Começar agora</a>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="card-tilt bg-ink-950 rounded-2xl border-2 border-teal-medium p-8 h-full relative">
              <span className="pill bg-teal-medium text-white absolute -top-3 left-8">Em breve</span>
              <h3 className="font-semibold text-lg text-white">Profissional</h3>
              <p className="text-sm text-white/55 mt-1">Para consultórios em crescimento</p>
              <div className="mt-5 text-3xl font-bold text-white">R$ 99,90<span className="text-sm font-normal text-white/50">/mês</span></div>
              <ul className="mt-6 space-y-2.5 text-sm text-white/75">
                {['Tudo do plano gratuito', 'Telemedicina e financeiro completo', 'Analytics e relatórios avançados'].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-teal-medium font-bold">✓</span>{f}</li>
                ))}
              </ul>
              <a href={LINKS.medicoRegister} className="btn-outline w-full mt-8">Entrar na lista de espera</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 bg-ink-950 overflow-hidden">
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-brand-primary/20 blur-3xl blob" />
        <Reveal className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">Pronto para conectar sua saúde?</h2>
          <p className="mt-4 text-white/60 text-lg">Leva menos de dois minutos para criar seu cadastro iCODLIFE.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={LINKS.pacienteRegister} className="btn-solid">Criar conta de paciente</a>
            <a href={LINKS.medicoRegister} className="btn-outline">Sou médico</a>
            <a href={LINKS.clinicaRegister} className="btn-outline">Represento uma clínica</a>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-100 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <img src="/logo.svg" alt="iCODLIFE" style={{ height: 28 }} />
            <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-xs">
              O ecossistema digital que conecta pacientes, médicos e clínicas em um único cadastro de saúde.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Módulos</div>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-600">
              <a href={LINKS.paciente} className="hover:text-brand-primary">Portal do paciente</a>
              <a href={LINKS.medico} className="hover:text-brand-primary">Portal do médico</a>
              <a href={LINKS.clinica} className="hover:text-brand-primary">Portal da clínica</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Plataforma</div>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-600">
              <a href="#ecossistema" className="hover:text-brand-primary">Ecossistema</a>
              <a href="#recursos" className="hover:text-brand-primary">Recursos</a>
              <a href="#planos" className="hover:text-brand-primary">Planos</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contato</div>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-600">
              <a href="mailto:admin@icodelife.com" className="hover:text-brand-primary">admin@icodelife.com</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-14 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} iCODLIFE. Todos os direitos reservados.</span>
          <span>Conformidade LGPD · Dados protegidos por criptografia</span>
        </div>
      </footer>
    </main>
  );
}
