'use client';
// apps/doutor/src/app/chat/page.tsx
// Sprint 20 — Fale com o Doutor (chat WebSocket médico ↔ paciente)

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' ' +
         d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const initials = (name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const px = size * 4;
  return (
    <div className="rounded-full bg-gradient-to-br from-blue-400 to-blue-700 flex items-center justify-center
      text-white font-bold flex-shrink-0 select-none"
      style={{ width: px, height: px, fontSize: px * 0.38 }}>
      {initials}
    </div>
  );
}

// ─── Componente de bolinha de status (online) ────────────────────────────────
function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-slate-300'}`} />
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ChatPage() {
  const [rooms,       setRooms]       = useState<any[]>([]);
  const [activeRoom,  setActiveRoom]  = useState<any>(null);
  const [messages,    setMessages]    = useState<any[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [connected,   setConnected]   = useState(false);
  const [patients,    setPatients]    = useState<any[]>([]);
  const [showPicker,  setShowPicker]  = useState(false);

  const socketRef   = useRef<Socket | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const currentUser = useRef<any>(null);

  // Scroll para o fim
  const scrollBottom = useCallback(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Carrega salas e pacientes
  const loadRooms = useCallback(async () => {
    try {
      const r = await api.get('/doutor/chat/rooms');
      setRooms(r.data);
    } catch { setRooms([]); }
    finally { setLoading(false); }
  }, []);

  // Conecta Socket.io
  useEffect(() => {
    const user = getStoredUser();
    currentUser.current = user;
    const token = typeof window !== 'undefined' ? localStorage.getItem('doutor_token') : null;
    if (!token) return;

    const socket = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('new_message', (msg: any) => {
      setMessages(prev => {
        // Evita duplicatas
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setRooms(prev => prev.map(r =>
        r.id === msg.roomId ? { ...r, messages: [msg], lastMessageAt: msg.createdAt } : r
      ).sort((a, b) => {
        const da = a.lastMessageAt ?? a.createdAt;
        const db = b.lastMessageAt ?? b.createdAt;
        return new Date(db).getTime() - new Date(da).getTime();
      }));
      setTimeout(scrollBottom, 50);
    });

    socket.on('history', ({ messages: hist }: { roomId: string; messages: any[] }) => {
      setMessages(hist);
      setTimeout(scrollBottom, 80);
    });

    socket.on('joined', () => {
      // Carrega histórico ao entrar na sala
      if (activeRoom?.id) {
        socket.emit('load_history', { roomId: activeRoom.id });
      }
    });

    api.get('/doutor/patients').then(r => setPatients(r.data)).catch(() => {});
    loadRooms();

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entra na sala ao selecionar
  const joinRoom = useCallback((room: any) => {
    setActiveRoom(room);
    setMessages([]);
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('join_room', { roomId: room.id });
  }, []);

  // Abre chat com paciente (cria sala se não existir)
  const openWithPatient = async (patient: any) => {
    try {
      const r = await api.post('/doutor/chat/rooms', { patientId: patient.user?.id ?? patient.userId });
      const room = r.data;
      setShowPicker(false);
      // Atualiza lista de salas
      setRooms(prev => {
        const exists = prev.find(r => r.id === room.id);
        if (exists) return prev;
        return [room, ...prev];
      });
      joinRoom(room);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erro ao abrir conversa');
    }
  };

  const sendMessage = () => {
    const body = input.trim();
    if (!body || !activeRoom || !socketRef.current) return;
    socketRef.current.emit('send_message', { roomId: activeRoom.id, body });
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const me = currentUser.current;

  return (
    <DoctorShell>
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">

        {/* ── Sidebar: lista de conversas ───────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800">Conversas</h2>
              <div className="flex items-center gap-2">
                <OnlineDot online={connected} />
                <span className="text-xs text-slate-400">{connected ? 'Online' : 'Reconectando...'}</span>
              </div>
            </div>
            <button
              onClick={() => setShowPicker(v => !v)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              + Nova Conversa
            </button>

            {/* Picker de paciente */}
            {showPicker && (
              <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                {patients.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">Nenhum paciente vinculado.</p>
                ) : patients.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => openWithPatient(p)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Avatar name={p.user?.fullName ?? '?'} size={7} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{p.user?.fullName}</p>
                      <p className="text-xs text-slate-400 font-mono">{p.user?.icode}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de salas */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-4 text-xs text-slate-400">Carregando...</p>
            ) : rooms.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">
                <p className="text-2xl mb-2">💬</p>
                <p className="text-xs">Nenhuma conversa ainda.</p>
              </div>
            ) : rooms.map((room: any) => {
              const lastMsg = room.messages?.[0];
              const isActive = activeRoom?.id === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => joinRoom(room)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 transition-colors text-left
                    ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <Avatar name={room.patient?.fullName ?? '?'} size={9} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                        {room.patient?.fullName}
                      </p>
                      {lastMsg && (
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-1">
                          {timeLabel(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {lastMsg.body}
                      </p>
                    )}
                    {!lastMsg && (
                      <p className="text-xs text-slate-400 italic">Sem mensagens</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Área principal: conversa ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-sm font-medium text-slate-600">Selecione uma conversa</p>
                <p className="text-xs mt-1">ou inicie uma nova com um paciente.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header da conversa */}
              <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center gap-3 flex-shrink-0">
                <Avatar name={activeRoom.patient?.fullName ?? '?'} size={9} />
                <div>
                  <p className="text-sm font-bold text-slate-800">{activeRoom.patient?.fullName}</p>
                  <p className="text-xs text-slate-400 font-mono">{activeRoom.patient?.icode}</p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50">
                {messages.length === 0 && (
                  <div className="text-center text-slate-400 text-xs py-8">
                    Nenhuma mensagem ainda. Diga olá!
                  </div>
                )}
                {messages.map((msg: any) => {
                  const isMe = msg.senderId === me?.id || msg.sender?.id === me?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <Avatar name={msg.sender?.fullName ?? activeRoom.patient?.fullName ?? '?'} size={7} />
                      )}
                      <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed
                          ${isMe
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'}`}>
                          {msg.body}
                        </div>
                        <span className="text-xs text-slate-400 mt-1 px-1">
                          {timeLabel(msg.createdAt)}
                          {isMe && msg.readAt && <span className="ml-1 text-blue-400">✓✓</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEnd} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 bg-white border-t border-slate-200 flex gap-2 flex-shrink-0">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                  placeholder="Digite uma mensagem... (Enter para enviar)"
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500
                    focus:outline-none resize-none leading-relaxed"
                  style={{ maxHeight: 120 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || !connected}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white
                    rounded-xl transition-colors flex-shrink-0 self-end"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DoctorShell>
  );
}
