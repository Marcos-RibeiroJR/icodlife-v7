'use client';
// apps/web/src/app/chat/page.tsx
import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { chatApi } from '../../lib/api';

const QUICK_REPLIES = ['Sim, dormi bem ✓', 'Não dormi bem', 'Mais ou menos', 'Estou bem hoje', 'Não estou bem', 'Sim, tenho dor', 'Não tenho dor'];

const FLAG_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  possible_illness:  { icon: '🤒', label: 'Possível mal-estar',      color: 'text-amber-700 bg-amber-50 border-amber-200' },
  severe_pain:       { icon: '🔴', label: 'Dor intensa relatada',     color: 'text-red-700 bg-red-50 border-red-200' },
  sleep_issue:       { icon: '😴', label: 'Problema de sono',         color: 'text-blue-700 bg-blue-50 border-blue-200' },
  missed_medication: { icon: '💊', label: 'Medicação não tomada',      color: 'text-orange-700 bg-orange-50 border-orange-200' },
  bp_risk_factors:   { icon: '❤️', label: 'Fatores de risco para PA', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  bp_symptom:        { icon: '🩺', label: 'Sintoma relacionado à PA', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

const sentimentLabel = (score: number) => {
  if (score > 0.3)  return { icon: '😊', label: 'Dia positivo', color: 'text-green-600' };
  if (score < -0.3) return { icon: '😔', label: 'Dia difícil',  color: 'text-red-500' };
  return { icon: '😐', label: 'Dia neutro', color: 'text-slate-500' };
};

export default function ChatPage() {
  const [view, setView] = useState<'chat'|'history'>('chat');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { startSession(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startSession = async () => {
    setLoading(true);
    try {
      const { data } = await chatApi.start();
      if (data.alreadyCompleted) {
        setSessionComplete(true);
        setFlags(data.session?.flags ?? []);
        setMessages([{ id:'done', role:'assistant', content:'Você já completou o check-in de saúde de hoje! Volte amanhã. 🌟', timestamp: new Date().toISOString() }]);
      } else if (data.nextQuestion) {
        setMessages([{ id:'1', ...data.nextQuestion }]);
      }
    } catch {} finally { setLoading(false); }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try { const { data } = await chatApi.getHistory(14); setHistory(data); }
    catch {} finally { setHistoryLoading(false); }
  };

  const handleViewChange = (v: 'chat'|'history') => {
    setView(v);
    if (v === 'history' && history.length === 0) loadHistory();
  };

  const send = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading || sessionComplete) return;
    setInput('');
    setLoading(true);
    const userMsg = { id: Date.now().toString(), role:'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    try {
      const { data } = await chatApi.sendMessage(msg);
      setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:'assistant', content: data.message, timestamp: new Date().toISOString() }]);
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
          <div className={`w-2.5 h-2.5 rounded-full ml-1 ${sessionComplete ? 'bg-green-400' : 'bg-blue-400'}`} />
          <div className="ml-auto flex gap-1 bg-white/10 rounded-lg p-1">
            {(['chat','history'] as const).map(v => (
              <button key={v} onClick={() => handleViewChange(v)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${view === v ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}>
                {v === 'chat' ? '💬 Chat' : '📋 Histórico'}
              </button>
            ))}
          </div>
        </div>

        {/* ── CHAT ──────────────────────────────────────────────────────────── */}
        {view === 'chat' && <>
          {/* Flags banner */}
          {flags.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex-shrink-0">
              <div className="text-amber-700 text-xs font-semibold mb-1.5">⚠️ Pontos de atenção registrados hoje:</div>
              <div className="flex flex-wrap gap-2">
                {flags.map(f => {
                  const fl = FLAG_LABELS[f]; if (!fl) return null;
                  return <span key={f} className={`text-xs font-medium border px-2.5 py-1 rounded-full ${fl.color}`}>{fl.icon} {fl.label}</span>;
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm flex-shrink-0 mt-1">🤖</div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line
                  ${m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'}`}>
                  {m.content}
                  <div className={`text-[10px] mt-1.5 ${m.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
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
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay:`${i*0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}

            {/* Session complete actions */}
            {sessionComplete && flags.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="text-xs font-semibold text-slate-500 mb-3">Ações recomendadas:</div>
                <div className="flex flex-wrap gap-2">
                  {(flags.includes('bp_risk_factors') || flags.includes('bp_symptom')) && (
                    <a href="/vida/pressao" className="text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-full hover:bg-rose-100 transition-colors">
                      ❤️ Registrar pressão arterial
                    </a>
                  )}
                  {flags.includes('sleep_issue') && (
                    <a href="/vida" className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                      😴 Ver Módulo Vida
                    </a>
                  )}
                  {flags.includes('missed_medication') && (
                    <a href="/medications" className="text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors">
                      💊 Ver Medicamentos
                    </a>
                  )}
                  {(flags.includes('possible_illness') || flags.includes('severe_pain')) && (
                    <a href="/appointments" className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors">
                      📅 Agendar consulta
                    </a>
                  )}
                  <button onClick={() => handleViewChange('history')}
                    className="text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
                    📋 Ver histórico
                  </button>
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
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-blue-400 max-h-28 transition-colors"
              rows={1} placeholder={sessionComplete ? 'Check-in concluído para hoje ✓' : 'Digite sua resposta...'}
              value={input} onChange={e => setInput(e.target.value)}
              disabled={sessionComplete || loading}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading || sessionComplete}
              className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-xl font-bold">
              ›
            </button>
          </div>
        </>}

        {/* ── HISTORY ───────────────────────────────────────────────────────── */}
        {view === 'history' && (
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-6 max-w-2xl mx-auto space-y-3">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Últimas 2 semanas de check-ins</h2>

              {historyLoading && <div className="text-center text-slate-400 py-12 text-sm">Carregando...</div>}

              {!historyLoading && history.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🤖</div>
                  <div className="text-slate-500 text-sm">Nenhum check-in nos últimos 14 dias.</div>
                  <button onClick={() => setView('chat')} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Fazer check-in agora →
                  </button>
                </div>
              )}

              {history.map((s: any) => {
                const date = new Date(s.sessionDate);
                const sent = s.sentimentScore != null ? sentimentLabel(Number(s.sentimentScore)) : null;
                const isExp = expandedSession === s.id;
                const summary = s.healthSummary as any;
                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedSession(isExp ? null : s.id)}>
                      <div className="w-12 text-center flex-shrink-0">
                        <div className="text-xl font-bold text-slate-800 leading-none">{date.getDate()}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{date.toLocaleDateString('pt-BR', { month:'short' })}</div>
                      </div>
                      <div className="w-px h-8 bg-slate-100 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.completed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {s.completed ? '✓ Completo' : '⏸ Incompleto'}
                          </span>
                          {sent && <span className={`text-xs ${sent.color}`}>{sent.icon} {sent.label}</span>}
                        </div>
                        {s.flags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(s.flags as string[]).slice(0, 3).map((f: string) => {
                              const fl = FLAG_LABELS[f];
                              return fl ? <span key={f} className={`text-[10px] font-medium border px-2 py-0.5 rounded-full ${fl.color}`}>{fl.icon} {fl.label}</span> : null;
                            })}
                          </div>
                        )}
                      </div>
                      <span className={`text-slate-400 text-lg transition-transform ${isExp ? 'rotate-90' : ''}`}>›</span>
                    </button>
                    {isExp && (
                      <div className="px-4 pb-4 border-t border-slate-50 pt-3 space-y-2">
                        {summary?.bpFactors?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-slate-500 mb-1">Fatores de PA:</div>
                            <div className="flex flex-wrap gap-1">
                              {(summary.bpFactors as string[]).map((f: string) => (
                                <span key={f} className="text-xs bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full">{f}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-slate-400">
                          {summary?.messageCount ?? 0} respostas · {date.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
