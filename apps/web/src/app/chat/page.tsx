'use client';
// apps/web/src/app/chat/page.tsx
import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { chatApi } from '../../lib/api';

const QUICK_REPLIES = ['Sim, dormi bem ✓','Não dormi bem','Mais ou menos','Estou bem hoje','Não estou bem','Sim, tenho dor','Não tenho dor'];

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { startSession(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startSession = async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.start();
      if (data.alreadyCompleted) {
        setSessionComplete(true);
        setMessages([{ id:'done', role:'assistant', content:'Você já completou o check-in de saúde de hoje! Volte amanhã. 🌟', timestamp: new Date().toISOString() }]);
      } else if (data.nextQuestion) {
        setMessages([{ id:'1', ...data.nextQuestion }]);
      }
    } catch {} finally { setLoading(false); }
  };

  const send = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading || sessionComplete) return;
    setInput('');
    setLoading(true);
    const userMsg = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    try {
      const { data } = await chatApi.sendMessage(msg);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.message, timestamp: new Date().toISOString() }]);
      if (data.sessionComplete) { setSessionComplete(true); setFlags(data.flags ?? []); }
    } catch {} finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-screen max-h-screen">
        {/* Header */}
        <div className="bg-[#002B5C] px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-xl">🤖</div>
          <div>
            <div className="text-white font-bold">HealthBot</div>
            <div className="text-white/60 text-xs">Check-in de saúde diário</div>
          </div>
          <div className={`ml-auto w-2.5 h-2.5 rounded-full ${sessionComplete ? 'bg-green-400' : 'bg-blue-400'}`} />
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <div className="text-amber-700 text-sm font-semibold">⚠️ Pontos de atenção registrados:</div>
            {flags.map(f => (
              <div key={f} className="text-amber-600 text-xs mt-1">
                {f === 'severe_pain' ? '• Dor intensa — considere consultar um médico' :
                 f === 'possible_illness' ? '• Possível mal-estar detectado' :
                 f === 'sleep_issue' ? '• Problema de sono registrado' : `• ${f}`}
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {messages.map(m => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm flex-shrink-0 mt-1">🤖</div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'}`}>
                {m.content}
                <div className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">🤖</div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        {!sessionComplete && !loading && messages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-6 py-2 bg-white border-t border-slate-100 flex-shrink-0">
            {QUICK_REPLIES.map(r => (
              <button key={r} onClick={() => send(r)}
                className="flex-shrink-0 text-xs font-medium border-2 border-blue-200 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors">
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-3 px-6 py-4 bg-white border-t border-slate-200 flex-shrink-0">
          <textarea
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-blue-400 max-h-28"
            rows={1} placeholder={sessionComplete ? 'Check-in concluído para hoje ✓' : 'Digite sua resposta...'}
            value={input} onChange={e => setInput(e.target.value)} disabled={sessionComplete || loading}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading || sessionComplete}
            className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
            →
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
