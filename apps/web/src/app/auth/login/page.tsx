'use client';
// apps/web/src/app/auth/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciais inválidas');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F8] flex">
      {/* Panel esquerdo — brand */}
      <div className="hidden lg:flex w-1/2 bg-[#7B1E1E] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #FCA5A5 0%, transparent 60%)' }} />
        <div className="relative z-10 text-center max-w-sm">
          <div className="text-7xl mb-8">🩺</div>
          <h1 className="text-white text-4xl font-bold tracking-tight mb-4">IcodLife</h1>
          <p className="text-white/60 text-lg">
            Sua saúde, seus dados, seu controle.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '🧪', label: 'Exames', sub: 'Histórico completo' },
              { icon: '📈', label: 'Evolução', sub: 'Linha do tempo' },
              { icon: '🫀', label: 'Módulo Vida', sub: 'Estilo de vida' },
              { icon: '🤖', label: 'IA Médica', sub: 'Análise inteligente' },
            ].map(f => (
              <div key={f.label} className="bg-white/10 rounded-xl p-3">
                <div className="text-xl mb-1">{f.icon}</div>
                <div className="text-white text-sm font-semibold">{f.label}</div>
                <div className="text-white/40 text-xs">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="text-5xl mb-3">🩺</div>
            <h1 className="text-2xl font-bold text-[#7B1E1E]">IcodLife</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo de volta</h2>
          <p className="text-slate-500 mb-8">Entre com seus dados de acesso</p>

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

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Não tem conta?{' '}
            <Link href="/auth/register" className="text-red-700 font-semibold hover:underline">
              Criar cadastro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
