'use client';
// apps/web/src/app/notificacoes/page.tsx
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AppLayout } from '../../components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('icodlife_token') : null; }
function authH()    { return { headers: { Authorization: `Bearer ${getToken()}` } }; }

const TYPE_ICON: Record<string, string> = {
  exam:        '🧪',
  medication:  '💊',
  appointment: '📅',
  vaccine:     '💉',
  alert:       '⚠️',
  share:       '🔗',
  family:      '👨‍👩‍👧',
  push:        '🔔',
};

const TYPE_COLOR: Record<string, string> = {
  exam:        'bg-blue-50 border-blue-100',
  medication:  'bg-purple-50 border-purple-100',
  appointment: 'bg-teal-50 border-teal-100',
  vaccine:     'bg-green-50 border-green-100',
  alert:       'bg-orange-50 border-orange-100',
  share:       'bg-rose-50 border-rose-100',
  family:      'bg-yellow-50 border-yellow-100',
  push:        'bg-gray-50 border-gray-100',
};

interface Notification {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  isRead:    boolean;
  createdAt: string;
}

interface Page {
  items: Notification[];
  total: number;
  page:  number;
  pages: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function NotificacoesPage() {
  const [data, setData]           = useState<Page | null>(null);
  const [filter, setFilter]       = useState<'all' | 'unread'>('all');
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [seeding, setSeeding]     = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/notifications`, {
        params: { unreadOnly: filter === 'unread', page, limit: 15 },
        ...authH(),
      });
      setData(r.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  const markRead = async (id: string) => {
    try {
      await axios.patch(`${API}/notifications/${id}/read`, {}, authH());
      setData(prev => prev ? {
        ...prev,
        items: prev.items.map(n => n.id === id ? { ...n, isRead: true } : n),
      } : prev);
    } catch {}
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await axios.patch(`${API}/notifications/read-all`, {}, authH());
      await load();
    } catch {}
    finally { setMarkingAll(false); }
  };

  const remove = async (id: string) => {
    try {
      await axios.delete(`${API}/notifications/${id}`, authH());
      setData(prev => prev ? {
        ...prev,
        items: prev.items.filter(n => n.id !== id),
        total: prev.total - 1,
      } : prev);
    } catch {}
  };

  const seed = async () => {
    setSeeding(true);
    try {
      await axios.post(`${API}/notifications/seed`, {}, authH());
      await load();
    } catch {}
    finally { setSeeding(false); }
  };

  const unreadCount = data?.items.filter(n => !n.isRead).length ?? 0;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#FFF8F8] px-6 py-8 max-w-3xl mx-auto">

        {/* cabeçalho */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
            <p className="text-sm text-gray-500 mt-1">
              {data ? `${data.total} notificação${data.total !== 1 ? 'ões' : ''}` : '…'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={seed}
              disabled={seeding}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              {seeding ? 'Gerando…' : '+ Seed (dev)'}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAll}
                disabled={markingAll}
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {markingAll ? 'Marcando…' : 'Marcar todas como lidas'}
              </button>
            )}
          </div>
        </div>

        {/* filtros */}
        <div className="flex gap-2 mb-6">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-rose-100 text-gray-600 hover:border-rose-300'
              }`}
            >
              {f === 'all' ? 'Todas' : 'Não lidas'}
            </button>
          ))}
        </div>

        {/* lista */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔔</div>
            <p className="text-gray-500">Nenhuma notificação {filter === 'unread' ? 'não lida' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map(n => (
              <div
                key={n.id}
                className={`flex gap-4 p-4 rounded-2xl border transition-all ${
                  TYPE_COLOR[n.type] ?? 'bg-gray-50 border-gray-100'
                } ${!n.isRead ? 'ring-1 ring-rose-200' : ''}`}
              >
                {/* ícone */}
                <div className="text-2xl mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? '🔔'}</div>

                {/* conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className={`text-sm flex-1 ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && <span className="shrink-0 w-2 h-2 rounded-full bg-rose-500 mt-1.5" />}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(n.createdAt)}</p>
                </div>

                {/* ações */}
                <div className="flex flex-col gap-1 shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => markRead(n.id)}
                      title="Marcar como lida"
                      className="text-xs px-2 py-1 rounded-lg bg-white/70 hover:bg-white text-gray-600 border border-gray-200"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    title="Remover"
                    className="text-xs px-2 py-1 rounded-lg bg-white/70 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* paginação */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-rose-100 text-sm disabled:opacity-40 hover:bg-rose-50"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-500">{page} / {data.pages}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === data.pages}
              className="px-4 py-2 rounded-xl border border-rose-100 text-sm disabled:opacity-40 hover:bg-rose-50"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
