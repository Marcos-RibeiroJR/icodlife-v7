'use client';
// apps/web/src/app/share/page.tsx
// Redireciona para access-management
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SharePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/access-management'); }, [router]);
  return null;
}
