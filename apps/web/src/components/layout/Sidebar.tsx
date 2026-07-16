'use client';
// apps/web/src/components/layout/Sidebar.tsx
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';

const NAV_MAIN = [
  { href: '/dashboard',           icon: '🏠', label: 'Dashboard' },
  { href: '/records',             icon: '🧪', label: 'Exames' },
  { href: '/exam-timeline',       icon: '📈', label: 'Evolução de Exames' },
  { href: '/medications',         icon: '💊', label: 'Medicamentos' },
  { href: '/appointments',        icon: '📅', label: 'Agenda' },
  { href: '/family',              icon: '👨‍👩‍👧', label: 'Família' },
  { href: '/share',               icon: '🔗', label: 'Compartilhar' },
  { href: '/chat',                icon: '🤖', label: 'HealthBot' },
  { href: '/telemedicina',        icon: '📹', label: 'Teleconsulta' },
];

const NAV_VIDA = [
  { href: '/vida',                icon: '🫀', label: 'Módulo Vida' },
  { href: '/vida/pressao',        icon: '❤️',  label: 'Pressão Arterial' },
  { href: '/vida/glicemia',       icon: '🩸',  label: 'Glicemia' },
  { href: '/vida/corpo',          icon: '⚖️',  label: 'Evolução Corporal' },
  { href: '/saude-tendencia',     icon: '📊', label: 'Tendência de Saúde' },
  { href: '/trend-report',        icon: '📋', label: 'Laudo de Tendência' },
];

const NAV_FEMALE = [
  { href: '/menstrual',           icon: '🌸', label: 'Ciclo Menstrual' },
];

const NAV_SPECIALTIES = [
  { href: '/ophthalmology',       icon: '👁️',  label: 'Oftalmologia' },
  { href: '/occupational-health', icon: '🦺',  label: 'Med. do Trabalho' },
  { href: '/saude-mental',        icon: '🧠',  label: 'Saúde Mental' },
  { href: '/cirurgias',           icon: '🔪',  label: 'Cirurgias' },
  { href: '/vacinas',             icon: '💉',  label: 'Vacinas' },
  { href: '/medicos',             icon: '🩺',  label: 'Médicos' },
];

const NAV_BOTTOM = [
  { href: '/notificacoes',        icon: '🔔', label: 'Notificações' },
  { href: '/profile',             icon: '👤', label: 'Meu Perfil' },
  { href: '/access-management',  icon: '🔒', label: 'Acessos' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => { logout(); router.push('/auth/login'); };
  const isFemale = user?.gender === 'female' || user?.gender === 'other';

  const navItem = (item: { href: string; icon: string; label: string }) => {
    const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
    return (
      <Link key={item.href} href={item.href}
        className={`flex items-center gap-2.5 mx-2 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all
          ${active
            ? 'bg-white/18 text-white shadow-sm'
            : 'text-white/55 hover:bg-white/10 hover:text-white/90'}`}>
        <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 bg-[#7B1E1E] flex flex-col z-50 shadow-2xl" style={{ width: '248px' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <img src="/logo.svg" alt="IcodLife" className="h-10 w-auto" />
      </div>

      {/* User card */}
      <div className="mx-3 mt-4 bg-white/10 rounded-xl p-3">
        <div className="flex items-center gap-3">
          {/* Avatar redondo */}
          <div className="flex-shrink-0 relative">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar"
                className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-300 to-rose-700 border-2 border-white/30 flex items-center justify-center text-white font-bold text-lg select-none">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
            <Link href="/profile" className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-[9px] transition-all" title="Editar foto">✏️</Link>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-semibold truncate">{user?.fullName}</div>
            <div className="text-white/40 text-[11px] truncate">
              {user?.gender === 'female' ? '♀' : user?.gender === 'male' ? '♂' : '⊕'} · {user?.bloodType ?? '—'}
            </div>
          </div>
        </div>
        {/* ICODE */}
        {user?.icode && (
          <div className="mt-2 pt-2 border-t border-white/10 text-center">
            <div className="text-white/50 text-[11px] uppercase tracking-widest mb-0.5 font-semibold">ICODE</div>
            <div className="text-white text-[13px] font-mono font-bold tracking-wider">{user.icode}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-4 pt-1 pb-1 text-[9.5px] font-semibold text-white/30 uppercase tracking-widest">Principal</div>
        {NAV_MAIN.map(navItem)}

        <div className="px-4 pt-3 pb-1 text-[9.5px] font-semibold text-white/30 uppercase tracking-widest">Saúde & Vida</div>
        {NAV_VIDA.map(navItem)}
        {isFemale && NAV_FEMALE.map(navItem)}

        <div className="px-4 pt-3 pb-1 text-[9.5px] font-semibold text-white/30 uppercase tracking-widest">Especialidades</div>
        {NAV_SPECIALTIES.map(navItem)}

        <div className="px-4 pt-3 pb-1 text-[9.5px] font-semibold text-white/30 uppercase tracking-widest">Conta</div>
        {NAV_BOTTOM.map(navItem)}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all text-[13px]">
          <span>🚪</span> Sair
        </button>
        <div className="text-center text-white/20 text-[10px] mt-2">v0.7 · LGPD compliant</div>
      </div>
    </aside>
  );
}
