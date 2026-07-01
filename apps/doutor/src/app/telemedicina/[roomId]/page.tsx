'use client';
// apps/doutor/src/app/telemedicina/[roomId]/page.tsx
// Videochamada + prescrição digital — lado do médico
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter }     from 'next/navigation';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('doutor_token') : null; }
function authH()   { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }; }

type ChatMsg = { senderName: string; text: string; fromMe: boolean };

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCallDoctorPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const roomId  = params.roomId as string;
  const token   = searchParams.get('token') ?? '';

  const [phase,        setPhase]        = useState<'call' | 'ended'>('call');
  const [micOn,        setMicOn]        = useState(true);
  const [camOn,        setCamOn]        = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [sidePanel,    setSidePanel]    = useState<'chat' | 'notes' | 'rx'>('chat');
  const [chatInput,    setChatInput]    = useState('');
  const [messages,     setMessages]     = useState<ChatMsg[]>([]);
  const [notes,        setNotes]        = useState('');
  const [rxMed,        setRxMed]        = useState('');
  const [rxDose,       setRxDose]       = useState('');
  const [rxList,       setRxList]       = useState<{med: string; dose: string}[]>([]);
  const [saving,       setSaving]       = useState(false);

  const socketRef      = useRef<Socket | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStream    = useRef<MediaStream | null>(null);
  const localVideo     = useRef<HTMLVideoElement>(null);
  const remoteVideo    = useRef<HTMLVideoElement>(null);
  const timerRef       = useRef<any>(null);
  const patientSocketId = useRef<string | null>(null);

  const initMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    return stream;
  }, []);

  useEffect(() => {
    let stream: MediaStream;

    const setup = async () => {
      stream = await initMedia();

      const socket = io(`${WS_URL}/telemedicine`, {
        auth:       { token: getToken() },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_room', { roomToken: token, role: 'doctor', displayName: 'Médico' });
      });

      socket.on('room_peers', ({ peers }: { peers: string[] }) => {
        if (peers.length > 0) patientSocketId.current = peers[0];
      });

      socket.on('peer_joined', ({ socketId, role }: any) => {
        if (role === 'patient') patientSocketId.current = socketId;
      });

      // Paciente faz offer → médico responde
      socket.on('offer', async ({ from, sdp }: any) => {
        patientSocketId.current = from;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.ontrack = (e) => {
          if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0];
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('ice_candidate', { to: from, candidate: e.candidate });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, sdp: answer });

        // Inicia timer
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      });

      socket.on('ice_candidate', async ({ candidate }: any) => {
        try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      });

      socket.on('call_ended', () => {
        clearInterval(timerRef.current);
        setPhase('ended');
        localStream.current?.getTracks().forEach(t => t.stop());
      });

      socket.on('chat_message', (msg: any) => {
        setMessages(prev => [...prev, { senderName: msg.senderName, text: msg.text, fromMe: false }]);
      });
    };

    setup().catch(console.error);

    return () => {
      socketRef.current?.disconnect();
      pcRef.current?.close();
      localStream.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleMic = () => {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicOn(v => !v);
  };
  const toggleCam = () => {
    localStream.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOn(v => !v);
  };

  const hangUp = async () => {
    socketRef.current?.emit('end_call', { roomToken: token });
    setSaving(true);
    await fetch(`${API}/api/v1/telemedicine/rooms/${roomId}/end`, {
      method:  'PATCH',
      headers: authH(),
      body:    JSON.stringify({ notes }),
    });
    setSaving(false);
    localStream.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    clearInterval(timerRef.current);
    setPhase('ended');
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat_message', { roomToken: token, text: chatInput.trim(), senderName: 'Médico' });
    setMessages(prev => [...prev, { senderName: 'Médico', text: chatInput.trim(), fromMe: true }]);
    setChatInput('');
  };

  const addRx = () => {
    if (!rxMed.trim()) return;
    setRxList(prev => [...prev, { med: rxMed.trim(), dose: rxDose.trim() }]);
    setRxMed(''); setRxDose('');
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  if (phase === 'ended') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Consulta encerrada</h2>
        <p className="text-slate-500 text-sm mb-1">Duração: {fmt(callDuration)}</p>
        {rxList.length > 0 && (
          <div className="mt-4 text-left bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-800 mb-2">Prescrição desta consulta:</p>
            {rxList.map((r, i) => (
              <p key={i} className="text-xs text-blue-700">• {r.med}{r.dose ? ` — ${r.dose}` : ''}</p>
            ))}
          </div>
        )}
        <button onClick={() => router.push('/telemedicina')}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors">
          Voltar à sala de espera
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-900 flex">
      {/* Área de vídeo */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">Teleconsulta em andamento</span>
          </div>
          <span className="text-slate-400 text-xs font-mono">{fmt(callDuration)}</span>
        </div>

        {/* Vídeos */}
        <div className="flex-1 relative">
          <video ref={remoteVideo} autoPlay playsInline
            className="w-full h-full object-cover bg-slate-800" />
          <div className="absolute bottom-4 right-4 w-36 h-24 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-slate-700">
            <video ref={localVideo} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!camOn && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <span className="text-2xl">👨‍⚕️</span>
              </div>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="bg-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidePanel('chat')}
            className={`text-xs px-3 py-1.5 rounded-lg ${sidePanel === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}>
            💬 Chat
          </button>
          <button onClick={() => setSidePanel('notes')}
            className={`text-xs px-3 py-1.5 rounded-lg ${sidePanel === 'notes' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}>
            📝 Anotações
          </button>
          <button onClick={() => setSidePanel('rx')}
            className={`text-xs px-3 py-1.5 rounded-lg ${sidePanel === 'rx' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}>
            💊 Prescrição
          </button>
          <div className="flex-1" />
          <button onClick={toggleMic}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${micOn ? 'bg-slate-600' : 'bg-red-600'}`}>
            <span>{micOn ? '🎙️' : '🔇'}</span>
          </button>
          <button onClick={toggleCam}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${camOn ? 'bg-slate-600' : 'bg-red-600'}`}>
            <span>{camOn ? '📷' : '🚫'}</span>
          </button>
          <button onClick={hangUp} disabled={saving}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center">
            <span>📵</span>
          </button>
        </div>
      </div>

      {/* Painel lateral */}
      <div className="w-80 bg-white flex flex-col border-l border-slate-200">
        {/* Chat */}
        {sidePanel === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 && (
                <p className="text-slate-400 text-xs text-center mt-8">Nenhuma mensagem ainda.</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`text-xs px-3 py-2 rounded-xl max-w-[85%] ${m.fromMe ? 'bg-blue-600 text-white ml-auto' : 'bg-slate-100 text-slate-800'}`}>
                  <p className="font-semibold mb-0.5">{m.fromMe ? 'Você' : m.senderName}</p>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Mensagem..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 outline-none" />
              <button onClick={sendChat}
                className="bg-blue-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-700">
                Enviar
              </button>
            </div>
          </>
        )}

        {/* Anotações */}
        {sidePanel === 'notes' && (
          <div className="flex-1 p-4 flex flex-col">
            <p className="text-xs font-semibold text-slate-600 mb-2">Anotações da consulta</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Diagnóstico, observações, orientações..."
              className="flex-1 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-2">Salvo automaticamente ao encerrar a consulta.</p>
          </div>
        )}

        {/* Prescrição */}
        {sidePanel === 'rx' && (
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <p className="text-xs font-semibold text-slate-600 mb-3">Prescrição digital</p>
            <div className="space-y-2 mb-3">
              <input value={rxMed} onChange={e => setRxMed(e.target.value)}
                placeholder="Medicamento"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" />
              <input value={rxDose} onChange={e => setRxDose(e.target.value)}
                placeholder="Dose / posologia"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" />
              <button onClick={addRx}
                className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">
                + Adicionar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {rxList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center mt-4">Nenhum item ainda.</p>
              ) : (
                rxList.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-800">{r.med}</p>
                      {r.dose && <p className="text-xs text-blue-600">{r.dose}</p>}
                    </div>
                    <button onClick={() => setRxList(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
