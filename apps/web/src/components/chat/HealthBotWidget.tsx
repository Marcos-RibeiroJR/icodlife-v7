'use client';
// apps/web/src/components/chat/HealthBotWidget.tsx
// HealthBot flutuante — bolha no canto inferior direito que abre um painel estilo celular.
// Disponível em qualquer página (montado no AppLayout). Escondido na rota /chat.
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { chatApi } from '../../lib/api';

// Respostas rápidas: Sim/Não em destaque + contextuais
const QUICK_YESNO = ['Sim', 'Não'];
const QUICK_REPLIES = [
  'Estou bem hoje', 'Mais ou menos', 'Não estou bem',
  'Dormi bem', 'Não dormi bem', 'Tenho dor', 'Sem dor',
];

const FLAG_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  possible_illness:  { icon: '🤒', label: 'Possível mal-estar',      color: 'text-amber-700 bg-amber-50 border-amber-200' },
  severe_pain:       { icon: '🔴', label: 'Dor intensa relatada',     color: 'text-red-700 bg-red-50 border-red-200' },
  sleep_issue:       { icon: '😴', label: 'Problema de sono',         color: 'text-blue-700 bg-blue-50 border-blue-200' },
  missed_medication: { icon: '💊', label: 'Medicação não tomada',      color: 'text-orange-700 bg-orange-50 border-orange-200' },
  bp_risk_factors:   { icon: '❤️', label: 'Fatores de risco para PA', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  bp_symptom:        { icon: '🩺', label: 'Sintoma relacionado à PA', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export function HealthBotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const startedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Inicia a sessão apenas quando o painel é aberto pela 1ª vez (lazy)
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      startSession();
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const startSession = async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.start();
      if (data.alreadyCompleted) {
        setSessionComplete(true);
        setFlags(data.session?.flags ?? []);
        setMessages([{ id: 'done', role: 'assistant', content: 'Você já completou o check-in de saúde de hoje! Volte amanhã. 🌟', timestamp: new Date().toISOString() }]);
      } else if (data.nextQuestion) {
        setMessages([{ id: '1', ...data.nextQuestion }]);
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
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.message, timestamp: new Date().toISOString() }]);
      if (data.sessionComplete) { setSessionComplete(true); setFlags(data.flags ?? []); }
    } catch {} finally { setLoading(false); }
  };

  // Não mostrar a bolha na página cheia do HealthBot
  if (pathname === '/chat') return null;

  return (
    <>
      {/* Bolha flutuante (fechada) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir HealthBot"
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#002B5C] text-white text-2xl shadow-lg hover:bg-[#003a7a] transition-all flex items-center justify-center"
        >
          🤖
          <span className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${sessionComplete ? 'bg-green-400' : 'bg-teal-400'}`} />
        </button>
      )}

      {/* Painel (aberto) — estilo celular */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col
                        w-[calc(100vw-2.5rem)] sm:w-[380px]
                        h-[70vh] sm:h-[600px] max-h-[calc(100vh-2.5rem)]
                        bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="bg-[#002B5C] px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-lg">🤖</div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight">HealthBot</div>
              <div className="text-white/60 text-[11px]">Check-in de saúde diário</div>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ml-1 ${sessionComplete ? 'bg-green-400' : 'bg-blue-400'}`} />
            <button onClick={() => setOpen(false)} aria-label="Minimizar"
              className="ml-auto w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center text-lg">
              ✕
            </button>
          </div>

          {/* Flags banner */}
          {flags.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex-shrink-0">
              <div className="text-amber-700 text-[11px] font-semibold mb-1">⚠️ Pontos de atenção hoje:</div>
              <div className="flex flex-wrap gap-1.5">
                {flags.map(f => {
                  const fl = FLAG_LABELS[f]; if (!fl) return null;
                  return <span key={f} className={`text-[10px] font-medium border px-2 py-0.5 rounded-full ${fl.color}`}>{fl.icon} {fl.label}</span>;
                })}
              </div>
            </div>
          )}

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs flex-shrink-0 mt-1">🤖</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line
                  ${m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'}`}>
                  {m.content}
                  <div className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs">🤖</div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-slate-100">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}

            {sessionComplete && flags.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
                <div className="text-[11px] font-semibold text-slate-500 mb-2">Ações recomendadas:</div>
                <div className="flex flex-wrap gap-1.5">
                  {(flags.includes('bp_risk_factors') || flags.includes('bp_symptom')) && (
                    <a href="/vida/pressao" className="text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full hover:bg-rose-100 transition-colors">❤️ Registrar pressão</a>
                  )}
                  {flags.includes('sleep_issue') && (
                    <a href="/vida" className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors">😴 Módulo Vida</a>
                  )}
                  {flags.includes('missed_medication') && (
                    <a href="/medications" className="text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full hover:bg-orange-100 transition-colors">💊 Medicamentos</a>
                  )}
                  {(flags.includes('possible_illness') || flags.includes('severe_pain')) && (
                    <a href="/appointments" className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors">📅 Agendar consulta</a>
                  )}
                  <a href="/saude-tendencia" className="text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors">📊 Tendência</a>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Respostas rápidas */}
          {!sessionComplete && !loading && messages.length > 0 && (
            <div className="bg-white border-t border-slate-100 flex-shrink-0">
              {/* Sim / Não em destaque */}
              <div className="flex gap-2 px-4 pt-2.5">
                <button onClick={() => send('Sim')}
                  className="flex-1 text-sm font-bold text-green-700 bg-green-50 border-2 border-green-200 py-2 rounded-xl hover:bg-green-100 transition-colors">
                  ✓ Sim
                </button>
                <button onClick={() => send('Não')}
                  className="flex-1 text-sm font-bold text-red-600 bg-red-50 border-2 border-red-200 py-2 rounded-xl hover:bg-red-100 transition-colors">
                  ✕ Não
                </button>
              </div>
              {/* Contextuais */}
              <div className="flex gap-2 overflow-x-auto px-4 py-2">
                {QUICK_REPLIES.map(r => (
                  <button key={r} onClick={() => send(r)}
                    className="flex-shrink-0 text-xs font-medium border-2 border-blue-200 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 px-4 py-3 bg-white border-t border-slate-200 flex-shrink-0">
            <textarea
              className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm resize-none outline-none focus:border-blue-400 max-h-24 transition-colors"
              rows={1} placeholder={sessionComplete ? 'Check-in concluído ✓' : 'Digite sua resposta...'}
              value={input} onChange={e => setInput(e.target.value)}
              disabled={sessionComplete || loading}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading || sessionComplete}
              className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-xl font-bold">
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
