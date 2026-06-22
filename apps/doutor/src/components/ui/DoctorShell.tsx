'use client';
// apps/doutor/src/components/ui/DoctorShell.tsx
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, logout, type DoctorUser } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: '◈' },
  { href: '/patients',  label: 'Pacientes',   icon: '👥' },
  { href: '/profile',   label: 'Meu Perfil',  icon: '⚕️' },
];

export default function DoctorShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<DoctorUser | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) { router.push('/login'); return; }
    if (u.role !== 'doctor') { router.push('/login'); return; }
    setUser(u);
  }, [router]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">+</span>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800">IcodLife</span>
              <span className="block text-xs text-blue-600 font-medium">Doutor</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
              {user.fullName?.[0] ?? 'D'}
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
