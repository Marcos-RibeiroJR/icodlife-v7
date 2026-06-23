'use client';
// apps/web/src/components/layout/AppLayout.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (!accessToken) router.push('/auth/login'); }, [accessToken, router]);
  if (!accessToken) return null;
  return (
    <div className="min-h-screen bg-[#FFF8F8]">
      <Sidebar />
      <header
        className="fixed top-0 right-0 z-30 flex items-center justify-end gap-3 px-6 h-14 bg-white/80 backdrop-blur border-b border-rose-100"
        style={{ left: '248px' }}
      >
        <span className="text-sm text-gray-500 hidden sm:block">
          {user?.fullName?.split(' ')[0]}
        </span>
        <NotificationBell />
      </header>
      <main className="min-h-screen pt-14" style={{ marginLeft: '248px' }}>
        {children}
      </main>
    </div>
  );
}
