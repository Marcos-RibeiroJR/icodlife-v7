'use client';
// apps/doutor/src/app/telemedicina/page.tsx
// Sala de espera do médico: criar sala + ver pacientes aguardando
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

const API    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doutor_token') : null; }
function authHeaders() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }; }

interface Room {
  id: string;
  token: string;
  status: 'waiting' | 'active' | 'ended' | 'cancelled';
  patientName?: string;
  reason?: string;
  createdAt: string;
  patient?: { id: string; name: string };
}

export default function TelemedicinaDoutorPage() {
  const router = useRouter();
  const [rooms,   setRooms]   = useState<Room[]>([]);
  const [history, setHistory] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<'waiting' | 'history'>('waiting');
  const socketRef = useRef<Socket | null>(null);

  const load = async () => {
    try {
      const [rRooms, rHistory] = await Promise.all([
        fetch(`${API}/api/v1/telemedicine/rooms`,         { headers: authHeaders() }),
        fetch(`${API}/api/v1/telemedicine/rooms/history`, { headers: authHeaders() }),
      ]);
      if (rRooms.ok)   setRooms(await rRooms.json());
      if (rHistory.ok) setHistory(await rHistory.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Escuta via WebSocket por novos pacientes entrando
  useEffect(() => {
    const socket = io(`${WS_URL}/telemedicine`, {
      auth: { token: getToken() },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('peer_joined', ({ role }: any) => {
      if (role === 'patient') load(); // atualiza lista quando paciente chega
    });

    return () => { socket.disconnect(); };
  }, []);

  const createRoom = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/v1/telemedicine/rooms`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (res.ok) { await load(); }
    } catch {}
    finally { setCreating(false); }
  };

  const admitPatient = async (room: Room) => {
    await fetch(`${API}/api/v1/telemedicine/rooms/${room.id}/admit`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    // Emite via socket para o paciente saber que foi admitido
    socketRef.current?.emit('admit_patient', { roomToken: room.token });
    router.push(`/telemedicina/${room.id}?token=${room.token}`);
  };

  const cancelRoom = async (id: string) => {
    await fetch(`${API}/api/v1/telemedicine/rooms/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await load();
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin.replace('3002', '3000')}/telemedicina/${token}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado! Envie para o paciente.');
  };

  const waitingRooms = rooms.filter(r => r.status === 'waiting');
  const activeRooms  = rooms.filter(r => r.status === 'active');
  const patientInRoom = (r: Room) => !!(r.patientName || r.patient);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">📹 Telemedicina</h1>
          <p className="text-slate-500 text-sm mt-0.5">Consultas por vídeo</p>
        </div>
        <button
          onClick={createRoom}
          disabled={creating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          {creating ? 'Criando...' : '+ Nova sala'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {(['waiting', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'waiting' ? `Sala de espera (${waitingRooms.length + activeRooms.length})` : 'Histórico'}
            </button>
          ))}
        </div>

        {tab === 'waiting' && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-400 text-sm">Carregando...</p>
            ) : rooms.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                <p className="text-3xl mb-3">🩺</p>
                <p className="text-slate-500 text-sm">Nenhuma sala ativa. Crie uma sala e envie o link para o paciente.</p>
              </div>
            ) : (
              [...activeRooms, ...waitingRooms].map(room => (
                <div key={room.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          room.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : patientInRoom(room)
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}>
                          {room.status === 'active' ? '🟢 Em consulta' : patientInRoom(room) ? '🟡 Paciente aguardando' : '⚪ Sala vazia'}
                        </span>
                      </div>
                      {patientInRoom(room) && (
                        <p className="font-semibold text-slate-800">{room.patientName ?? room.patient?.name}</p>
                      )}
                      {room.reason && <p className="text-sm text-slate-500 mt-0.5">Motivo: {room.reason}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        Sala criada {new Date(room.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {room.status !== 'active' && (
                        <button
                          onClick={() => copyLink(room.token)}
                          className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg"
                        >
                          Copiar link
                        </button>
                      )}
                      {patientInRoom(room) && room.status === 'waiting' && (
                        <button
                          onClick={() => admitPatient(room)}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Admitir →
                        </button>
                      )}
                      {room.status === 'active' && (
                        <button
                          onClick={() => router.push(`/telemedicina/${room.id}?token=${room.token}`)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Retomar →
                        </button>
                      )}
                      {room.status === 'waiting' && (
                        <button
                          onClick={() => cancelRoom(room.id)}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">Nenhuma consulta encerrada ainda.</p>
              </div>
            ) : (
              history.map(room => (
                <div key={room.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{room.patientName ?? room.patient?.name ?? 'Paciente'}</p>
                    {room.reason && <p className="text-xs text-slate-500">{room.reason}</p>}
                    <p className="text-xs text-slate-400">{new Date(room.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${room.status === 'ended' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {room.status === 'ended' ? 'Encerrada' : 'Cancelada'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
