'use client';
// apps/web/src/components/layout/Providers.tsx
import { QueryClient, QueryClientProvider } from 'react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
