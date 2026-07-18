'use client';
// apps/web/src/app/telemedicina/[token]/page.tsx
// Tela de videochamada WebRTC — lado do paciente
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter }     from 'next/navigation';
import { io, Socket } from 'socket.io-client';

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/v1\/?$/, '');

type ChatMsg = { senderName: string; text: string; time: string; fromMe: boolean };

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCallPatientPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = params.token as string;
  const myName       = searchParams.get('name') ?? 'Paciente';

  const [phase, setPhase]       = useState<'waiting' | 'call' | 'ended'>('waiting');
  const [chatInput, setChatInput] = useState('');
  const [messages,  setMessages]  = useState<ChatMsg[]>([]);
  const [micOn,  setMicOn]  = useState(true);
  const [camOn,  setCamOn]  = useState(true);
  const [doctorName, setDoctorName] = useState('Médico');
  const [callDuration, setCallDuration] = useState(0);
  const [roomInfo, setRoomInfo] = useState<any>(null);

  const socketRef   = useRef<Socket | null>(null);
  const pcRef       = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const localVideo  = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const timerRef    = useRef<any>(null);
  const doctorSocketId = useRef<string | null>(null);

  // Busca info da sala
  useEffect(() => {
    const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/v1\/?$/, '');
    fetch(`${API}/api/v1/telemedicine/join/${token}`)
      .then(r => r.json())
      .then(d => { setRoomInfo(d); setDoctorName(d.doctor?.name ?? 'Médico'); })
      .catch(() => {});
  }, [token]);

  const initMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      return stream;
    } catch {
      alert('Permita acesso à câmera e microfone para iniciar a consulta.');
      return null;
    }
  }, []);

  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && doctorSocketId.current) {
        socketRef.current?.emit('ice_candidate', {
          to:        doctorSocketId.current,
          candidate: e.candidate,
        });
      }
    };

    return pc;
  }, []);

  useEffect(() => {
    const socket = io(`${WS_URL}/telemedicine`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', { roomToken: token, role: 'patient', displayName: myName });
    });

    // Médico já está na sala — guarda o socketId dele
    socket.on('room_peers', ({ peers }: { peers: string[] }) => {
      if (peers.length > 0) doctorSocketId.current = peers[0];
    });

    // Médico entrou depois
    socket.on('peer_joined', ({ socketId, role }: any) => {
      if (role === 'doctor') doctorSocketId.current = socketId;
    });

    // Médico admitiu o paciente
    socket.on('patient_admitted', async () => {
      setPhase('call');
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);

      const stream = await initMedia();
      if (!stream) return;

      const pc = createPeerConnection(stream);

      // Paciente faz a oferta
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: doctorSocketId.current!, sdp: offer });
    });

    // Médico respondeu
    socket.on('answer', async ({ sdp }: any) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    // ICE candidates do médico
    socket.on('ice_candidate', async ({ candidate }: any) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    // Médico encerrou
    socket.on('call_ended', () => {
      clearInterval(timerRef.current);
      setPhase('ended');
      localStream.current?.getTracks().forEach(t => t.stop());
    });

    // Chat
    socket.on('chat_message', (msg: any) => {
      setMessages(prev => [...prev, { ...msg, fromMe: false }]);
    });

    socket.on('peer_left', () => {
      if (phase === 'call') setPhase('ended');
    });

    return () => {
      socket.disconnect();
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
  const hangUp = () => {
    socketRef.current?.emit('end_call', { roomToken: token });
    localStream.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    clearInterval(timerRef.current);
    setPhase('ended');
  };
  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat_message', { roomToken: token, text: chatInput.trim(), senderName: myName });
    setMessages(prev => [...prev, { senderName: myName, text: chatInput.trim(), time: new Date().toISOString(), fromMe: true }]);
    setChatInput('');
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  // ── Sala de espera ────────────────────────────────────────────────────────
  if (phase === 'waiting') return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⏳</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sala de espera</h2>
        <p className="text-slate-500 text-sm mb-1">Você está aguardando <strong>{doctorName}</strong></p>
        {roomInfo?.reason && <p className="text-slate-400 text-xs mb-4">Motivo: {roomInfo.reason}</p>}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-xs text-slate-400 mt-4">O médico irá admiti-lo em breve</p>
      </div>
    </div>
  );

  // ── Consulta encerrada ────────────────────────────────────────────────────
  if (phase === 'ended') return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Consulta encerrada</h2>
        <p className="text-slate-500 text-sm mb-1">Duração: {fmt(callDuration)}</p>
        <p className="text-slate-400 text-xs mt-2 mb-6">Obrigado por usar o IcodLife. Cuide-se!</p>
        <button onClick={() => router.push('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors">
          Voltar ao início
        </button>
      </div>
    </div>
  );

  // ── Videochamada ──────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">{doctorName}</span>
        </div>
        <span className="text-slate-400 text-xs font-mono">{fmt(callDuration)}</span>
      </div>

      {/* Vídeos */}
      <div className="flex-1 relative">
        {/* Remoto (médico) — ocupa tela toda */}
        <video ref={remoteVideo} autoPlay playsInline
          className="w-full h-full object-cover bg-slate-800" />

        {/* Local (paciente) — miniatura */}
        <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-slate-700">
          <video ref={localVideo} autoPlay playsInline muted
            className="w-full h-full object-cover" />
          {!camOn && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          )}
        </div>

        {/* Chat overlay */}
        {messages.length > 0 && (
          <div className="absolute bottom-4 left-4 w-64 max-h-40 overflow-y-auto space-y-1">
            {messages.slice(-5).map((m, i) => (
              <div key={i} className={`text-xs px-3 py-1.5 rounded-lg max-w-xs ${m.fromMe ? 'bg-blue-600 text-white ml-auto' : 'bg-black/60 text-white'}`}>
                <span className="font-medium">{m.fromMe ? 'Você' : m.senderName}: </span>{m.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3">
        {/* Chat input */}
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChat()}
          placeholder="Mensagem..."
          className="flex-1 bg-slate-700 text-white text-sm px-3 py-2 rounded-lg outline-none placeholder-slate-400"
        />
        <button onClick={sendChat} className="text-slate-300 hover:text-white p-2">💬</button>

        <div className="flex-1" />

        {/* Mic */}
        <button onClick={toggleMic}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-slate-600 hover:bg-slate-500' : 'bg-red-600'}`}>
          <span className="text-lg">{micOn ? '🎙️' : '🔇'}</span>
        </button>

        {/* Cam */}
        <button onClick={toggleCam}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${camOn ? 'bg-slate-600 hover:bg-slate-500' : 'bg-red-600'}`}>
          <span className="text-lg">{camOn ? '📷' : '🚫'}</span>
        </button>

        {/* Hang up */}
        <button onClick={hangUp}
          className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors">
          <span className="text-lg">📵</span>
        </button>
      </div>
    </div>
  );
}
