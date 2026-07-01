'use client';
// apps/web/src/app/auth/login/page.tsx — Login unificado: Usuário (ICODELIFE) + Doutor
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

type Mode = 'user' | 'doctor';

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
      setAuth(data.user, data.accessToken, data.refreshToken);
      if (mode === 'doctor') {
        window.location.href = (process.env.NEXT_PUBLIC_DOUTOR_URL ?? 'http://localhost:3002') + '/dashboard';
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciais inválidas');
    } finally { setLoading(false); }
  };

  const features = FEATURES[mode];
  const isDoctor = mode === 'doctor';

  return (
    <div className="min-h-screen bg-[#FFF8F8] flex">
      {/* ── Painel esquerdo — brand */}
      <div className={`hidden lg:flex w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden transition-colors duration-500 ${
        isDoctor ? 'bg-[#1E3A7B]' : 'bg-[#7B1E1E]'
      }`}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `radial-gradient(circle at 30% 50%, ${isDoctor ? '#A5C4FC' : '#FCA5A5'} 0%, transparent 60%)` }} />
        <div className="relative z-10 text-center max-w-sm">
          <img src="/logo.svg" alt="IcodLife" className="h-14 w-auto mx-auto mb-3" />
          <p className="text-white/60 text-base mb-8">
            {isDoctor ? 'Portal médico inteligente.' : 'Sua saúde, seus dados, seu controle.'}
          </p>
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

          {/* Toggle Usuário / Doutor */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
            <button onClick={() => { setMode('user'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !isDoctor ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <span>👤</span> Usuário
            </button>
            <button onClick={() => { setMode('doctor'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isDoctor ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <span>⚕️</span> Doutor
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            {isDoctor ? 'Portal Médico' : 'Bem-vindo de volta'}
          </h2>
          <p className="text-slate-500 mb-6 text-sm">
            {isDoctor
              ? 'Acesse seu painel clínico com suas credenciais'
              : 'Entre no ICODELIFE com seus dados de acesso'}
          </p>

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
              className={`btn-primary ${isDoctor ? '!bg-[#1E3A7B] hover:!bg-[#162d60]' : ''}`}>
              {loading ? 'Entrando...' : isDoctor ? 'Acessar Portal Médico' : 'Entrar'}
            </button>
          </form>

          {!isDoctor ? (
            <p className="text-center text-sm text-slate-500 mt-6">
              Não tem conta?{' '}
              <Link href="/auth/register" className="text-red-700 font-semibold hover:underline">
                Criar cadastro
              </Link>
            </p>
          ) : (
            <div className="mt-6 text-center space-y-1">
              <p className="text-xs text-slate-400">Acesso exclusivo para médicos cadastrados no ICODELIFE.</p>
              <p className="text-xs text-slate-400">
                Solicitações:{' '}
                <a href="mailto:admin@icodelife.com" className="text-blue-600 hover:underline">admin@icodelife.com</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
