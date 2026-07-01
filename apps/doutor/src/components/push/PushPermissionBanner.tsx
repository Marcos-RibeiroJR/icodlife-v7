// apps/web/src/components/push/PushPermissionBanner.tsx
// Sprint 16 — Banner para solicitar permissão de notificações push
'use client';

import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellOff, X } from 'lucide-react';

interface Props {
  authToken: string | null;
}

export function PushPermissionBanner({ authToken }: Props) {
  const { supported, permission, requesting, requestPermission } = usePushNotifications(authToken);
  const [dismissed, setDismissed] = useState(false);

  // Carrega estado de dismiss do localStorage
  useEffect(() => {
    try {
      if (localStorage.getItem('__icl_push_dismissed') === '1') setDismissed(true);
    } catch {}
  }, []);

  // Não mostra se: não suportado, já tem permissão, negado, ou dispensado
  if (!supported || permission !== 'default' || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem('__icl_push_dismissed', '1'); } catch {}
  }

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
      <Bell size={18} className="shrink-0 text-blue-600" />
      <span className="flex-1">
        Ative as <strong>notificações</strong> para receber lembretes de medicamentos, consultas e telemedicina.
      </span>
      <button
        onClick={requestPermission}
        disabled={requesting}
        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
      >
        {requesting ? 'Ativando...' : 'Ativar'}
      </button>
      <button onClick={handleDismiss} className="shrink-0 text-blue-400 hover:text-blue-600 transition">
        <X size={16} />
      </button>
    </div>
  );
}
