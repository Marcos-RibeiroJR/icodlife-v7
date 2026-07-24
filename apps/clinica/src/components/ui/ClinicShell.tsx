'use client';
// apps/clinica/src/components/ui/ClinicShell.tsx
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, logout, type ClinicUser } from '@/lib/auth';

const NAV = [
  { href: '/dashboard',      label: 'Dashboard',       icon: '◈'  },
  { href: '/medicos',        label: 'Médicos',         icon: '👨‍⚕️' },
  { href: '/agenda',         label: 'Agenda',          icon: '📅' },
  { href: '/pacientes',      label: 'Pacientes',       icon: '👥' },
  { href: '/empresas',       label: 'Empresas',        icon: '🏢' },
  { href: '/funcionarios',   label: 'Meus Funcionários', icon: '🪪' },
  { href: '/consultas',      label: 'Base de Consultas', icon: '📥' },
  { href: '/atendimento',    label: 'Atendimento',     icon: '🛎️' },
  { href: '/aso',            label: 'ASO',             icon: '📄' },
  { href: '/procedimentos',  label: 'Procedimentos',   icon: '🩺' },
  { href: '/salas',          label: 'Salas',           icon: '🚪' },
  { href: '/staff',          label: 'Equipe',          icon: '🧑‍💼' },
  { href: '/financeiro',     label: 'Financeiro',      icon: '💰' },
  { href: '/configuracoes',  label: 'Configurações',   icon: '⚙️' },
];

export default function ClinicShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ClinicUser | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) { router.push('/login'); return; }
    if (u.role !== 'clinic_admin') { router.push('/login'); return; }
    setUser(u);
  }, [router]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <img src="/logo-dark.svg" alt="IcodLife" className="h-9 w-auto mb-1" />
          <span className="block text-xs text-indigo-700 font-semibold tracking-wide uppercase">Painel Clínica</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
              {user.fullName?.[0] ?? 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{user.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
