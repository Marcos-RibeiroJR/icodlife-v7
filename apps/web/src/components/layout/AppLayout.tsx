'use client';
// apps/web/src/components/layout/AppLayout.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (!accessToken) router.push('/auth/login'); }, [accessToken, router]);
  if (!accessToken) return null;
  return (
    <div className="min-h-screen bg-[#FFF8F8]">
      <Sidebar />
      <main className="min-h-screen" style={{ marginLeft: '248px' }}>
        {children}
      </main>
    </div>
  );
}
