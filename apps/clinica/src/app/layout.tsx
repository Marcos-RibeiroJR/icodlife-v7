// apps/clinica/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IcodLife Clínica',
  description: 'Painel de Clínicas e Hospitais — IcodLife',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon-512.png', type: 'image/png', sizes: '512x512' }],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
