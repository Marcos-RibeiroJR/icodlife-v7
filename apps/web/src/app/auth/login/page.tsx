'use client';
// apps/web/src/app/auth/login/page.tsx — Login unificado: Usuário (ICODELIFE) + Doutor
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type Mode = 'user' | 'doctor' | 'clinic';

const FEATURES = {
  user: [
    { icon: '🧪', label: 'Exames',      sub: 'Histórico completo'  },
    { icon: '📈', label: 'Evolução',    sub: 'Linha do tempo'      },
    { icon: '🫀', label: 'Módulo Vida', sub: 'Estilo de vida'      },
    { icon: '🤖', label: 'IA Médica',   sub: 'Análise inteligente' },
  ],
  doctor: [
    { icon: '👥', label: 'Pacientes',   sub: 'Painel integrado'   },
    { icon: '📋', label: 'Prontuários', sub: 'Histórico clínico'  },
    { icon: '📅', label: 'Agenda',      sub: 'Consultas e slots'  },
    { icon: '💊', label: 'Prescrição',  sub: 'Receituário digital' },
  ],
  clinic: [
    { icon: '🏥', label: 'Médicos',       sub: 'Equipe vinculada'    },
    { icon: '📅', label: 'Agenda',        sub: 'Multi-profissional'  },
    { icon: '💰', label: 'Financeiro',    sub: 'DRE consolidado'     },
    { icon: '🩺', label: 'Procedimentos', sub: 'Preço e convênio'    },
  ],
};

const MODE_STYLE = {
  user:   { bg: '#7B1E1E', accent: '#FCA5A5', label: 'Usuário',  icon: '👤', title: 'Bem-vindo de volta',
            subtitle: 'Entre no ICODELIFE com seus dados de acesso', tagline: 'Sua saúde, seus dados, seu controle.' },
  doctor: { bg: '#1E3A7B', accent: '#A5C4FC', label: 'Doutor',   icon: '⚕️', title: 'Portal Médico',
            subtitle: 'Acesse seu painel clínico com suas credenciais', tagline: 'Portal médico inteligente.' },
  clinic: { bg: '#3730A3', accent: '#C7D2FE', label: 'Clínica',  icon: '🏥', title: 'Portal Clínica',
            subtitle: 'Acesse a gestão da sua clínica ou consultório', tagline: 'Gestão de clínicas, consultórios e hospitais.' },
};

export default function LoginPage() {
  const router      = useRouter();
  const { setAuth } = useAuthStore();
  const [mode,    setMode]    = useState<Mode>('user');
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login(form);
      const role = data.user?.role;

      // Confere se a conta tem o perfil certo pra aba escolhida, antes de mandar pra qualquer app
      if (mode === 'doctor' && role !== 'doctor') {
        setError('Essa conta não tem perfil de Doutor. Tente a aba "Usuário" ou "Clínica".');
        setLoading(false); return;
      }
      if (mode === 'clinic' && role !== 'clinic_admin') {
        setError('Essa conta não tem perfil de Clínica. Tente a aba "Usuário" ou "Doutor".');
        setLoading(false); return;
      }
      if (mode === 'user' && (role === 'doctor' || role === 'clinic_admin')) {
        setError(`Essa conta é de ${role === 'doctor' ? 'Doutor' : 'Clínica'}. Tente a aba correspondente.`);
        setLoading(false); return;
      }

      setAuth(data.user, data.accessToken, data.refreshToken);

      if (mode === 'doctor' || mode === 'clinic') {
        // Apps separados (portas/origens diferentes) não compartilham localStorage —
        // manda o token + dados do usuário via query string pra uma página "bridge"
        // que grava no localStorage do app de destino antes de ir pro dashboard.
        const targetUrl = mode === 'doctor'
          ? (process.env.NEXT_PUBLIC_DOUTOR_URL ?? 'http://localhost:3002')
          : (process.env.NEXT_PUBLIC_CLINICA_URL ?? 'http://localhost:3003');
        const qs = new URLSearchParams({
          token: data.accessToken,
          user: JSON.stringify(data.user),
        }).toString();
        window.location.href = `${targetUrl}/auth/bridge?${qs}`;
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciais inválidas');
    } finally { setLoading(false); }
  };

  const features = FEATURES[mode];
  const style = MODE_STYLE[mode];
  const isDoctor = mode === 'doctor';
  const isClinic = mode === 'clinic';

  return (
    <div className="min-h-screen bg-[#FFF8F8] flex">
      {/* ── Painel esquerdo — brand */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden transition-colors duration-500"
        style={{ backgroundColor: style.bg }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `radial-gradient(circle at 30% 50%, ${style.accent} 0%, transparent 60%)` }} />
        <div className="relative z-10 text-center max-w-sm">
          <img src="/logo.svg" alt="IcodLife" className="h-14 w-auto mx-auto mb-3" />
          <p className="text-white/60 text-base mb-8">{style.tagline}</p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {features.map(f => (
              <div key={f.label} className="bg-white/10 rounded-xl p-3">
                <div className="text-xl mb-1">{f.icon}</div>
                <div className="text-white text-sm font-semibold">{f.label}</div>
                <div className="text-white/40 text-xs">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src="/logo-dark.svg" alt="IcodLife" className="h-11 w-auto mx-auto" />
          </div>

          {/* Toggle Usuário / Doutor / Clínica */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
            {(['user', 'doctor', 'clinic'] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <span>{MODE_STYLE[m].icon}</span> {MODE_STYLE[m].label}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">{style.title}</h2>
          <p className="text-slate-500 mb-6 text-sm">{style.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" placeholder="seu@email.com" className="input-field" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" placeholder="••••••••" className="input-field" required
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary"
              style={mode !== 'user' ? { backgroundColor: style.bg } : undefined}>
              {loading ? 'Entrando...' : isDoctor ? 'Acessar Portal Médico' : isClinic ? 'Acessar Portal Clínica' : 'Entrar'}
            </button>
          </form>

          {mode === 'user' && (
            <p className="text-center text-sm text-slate-500 mt-6">
              Não tem conta?{' '}
              <Link href="/auth/register" className="text-red-700 font-semibold hover:underline">
                Criar cadastro
              </Link>
            </p>
          )}
          {isDoctor && (
            <div className="mt-6 text-center space-y-1">
              <p className="text-xs text-slate-400">Acesso exclusivo para médicos cadastrados no ICODELIFE.</p>
              <p className="text-xs text-slate-400">
                Solicitações:{' '}
                <a href="mailto:admin@icodelife.com" className="text-blue-600 hover:underline">admin@icodelife.com</a>
              </p>
            </div>
          )}
          {isClinic && (
            <p className="text-center text-sm text-slate-500 mt-6">
              Ainda não ativou sua clínica?{' '}
              <a href={`${process.env.NEXT_PUBLIC_CLINICA_URL ?? 'http://localhost:3003'}/register`}
                className="text-indigo-700 font-semibold hover:underline">
                Ativar painel de clínica
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
