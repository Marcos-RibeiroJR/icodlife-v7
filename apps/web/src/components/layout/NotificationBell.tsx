'use client';
// apps/web/src/components/layout/NotificationBell.tsx
// Versão Sprint 11: SSE para push em tempo real + polling fallback
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null; }
function authH()    { return { headers: { Authorization: `Bearer ${getToken()}` } }; }

const TYPE_ICON: Record<string, string> = {
  exam:               '🧪',
  medication:         '💊',
  medication_reminder:'💊',
  appointment:        '📅',
  appointment_reminder:'📅',
  vaccine:            '💉',
  vaccine_reminder:   '💉',
  low_stock:          '⚠️',
  alert:              '🚨',
  share:              '🔗',
  family:             '👨‍👩‍👧',
  push:               '🔔',
};

interface Notification {
  id: string; type: string; title: string; body: string;
  isRead: boolean; createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const router = useRouter();
  const [count,   setCount]   = useState(0);
  const [items,   setItems]   = useState<Notification[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/notifications/unread-count`, authH());
      setCount(r.data.count ?? 0);
    } catch {}
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/notifications?limit=6`, authH());
      setItems(r.data.items ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  // ── SSE connection ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const connect = () => {
      const es = new EventSource(`${API}/notifications/stream`, {
        // @ts-ignore — withCredentials not in standard types
        headers: { Authorization: `Bearer ${token}` },
      } as any);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'ping') return;
          // New notification pushed — update badge + prepend to list
          setCount(c => c + 1);
          setItems(prev => [data, ...prev].slice(0, 6));
        } catch {}
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };

      esRef.current = es;
    };

    connect();
    return () => { esRef.current?.close(); };
  }, []);

  // ── Polling fallback (every 60s) ──────────────────────────────────────────
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const toggle = () => { if (!open) fetchRecent(); setOpen(o => !o); };

  const markRead = async (id: string) => {
    try {
      await axios.patch(`${API}/notifications/${id}/read`, {}, authH());
      setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const markAll = async () => {
    try {
      await axios.patch(`${API}/notifications/read-all`, {}, authH());
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      setCount(0);
    } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle}
        className="relative p-2 rounded-full hover:bg-rose-50 transition-colors"
        title="Notificações">
        <span className="text-xl leading-none">🔔</span>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-rose-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-sm">Notificações</span>
              <span className="w-2 h-2 rounded-full bg-green-400" title="Conectado em tempo real" />
            </div>
            {count > 0 && (
              <button onClick={markAll} className="text-xs text-rose-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Carregando…</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">Nenhuma notificação</div>
            ) : (
              items.map(n => (
                <div key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-rose-50 transition-colors ${!n.isRead ? 'bg-rose-50/60' : ''}`}
                  onClick={() => { markRead(n.id); router.push('/notificacoes'); setOpen(false); }}>
                  <span className="text-lg mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-sm leading-tight truncate ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />}
                </div>
              ))
            )}
          </div>

          <button onClick={() => { router.push('/notificacoes'); setOpen(false); }}
            className="w-full py-3 text-sm text-rose-600 font-medium hover:bg-rose-50 transition-colors">
            Ver todas as notificações →
          </button>
        </div>
      )}
    </div>
  );
}
