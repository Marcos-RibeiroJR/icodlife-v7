'use client';
// apps/clinica/src/app/auth/bridge/page.tsx
// Recebe token+usuário do login centralizado (apps/web/auth/login) via query string
// e grava no localStorage deste app — necessário porque cada app roda numa porta/origem
// diferente e localStorage não é compartilhado entre elas.
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function BridgeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const userRaw = params.get('user');

    if (!token || !userRaw) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      if (user.role !== 'clinic_admin') {
        setError('Essa conta não possui perfil de Clínica.');
        setTimeout(() => router.replace('/login'), 2000);
        return;
      }
      localStorage.setItem('clinica_token', token);
      localStorage.setItem('clinica_user', JSON.stringify(user));
      router.replace('/dashboard');
    } catch {
      setError('Não foi possível validar o acesso.');
      setTimeout(() => router.replace('/login'), 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100">
      <p className={`text-sm ${error ? 'text-red-600' : 'text-slate-500'}`}>
        {error || 'Entrando no painel da clínica...'}
      </p>
    </div>
  );
}

export default function AuthBridgePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100">
        <p className="text-slate-500 text-sm">Entrando...</p>
      </div>
    }>
      <BridgeInner />
    </Suspense>
  );
}
