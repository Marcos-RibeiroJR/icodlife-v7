'use client';
// apps/doutor/src/app/token/page.tsx
// Sprint 14 — TOKEN / QR Code
// Lê o QR Code do paciente ICODLIFE (câmera ou input) e exibe o prontuário compartilhado.

import { useEffect, useRef, useState, useCallback } from 'react';
import DoctorShell from '@/components/ui/DoctorShell';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ─── Ícones ───────────────────────────────────────────────────────────────────
const QrIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75V16.5zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
  </svg>
);
const CameraIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

// ─── BP labels ────────────────────────────────────────────────────────────────
const BP_CLASS: Record<string, { label: string; color: string }> = {
  normal:       { label: 'Normal',        color: 'bg-green-100 text-green-700'   },
  elevado:      { label: 'Elevado',       color: 'bg-yellow-100 text-yellow-700' },
  hipertensao1: { label: 'Hipert. G1',    color: 'bg-orange-100 text-orange-700' },
  hipertensao2: { label: 'Hipert. G2',    color: 'bg-red-100 text-red-700'       },
  crise:        { label: 'Crise Hipert.', color: 'bg-red-200 text-red-900'       },
};

// ─── Scanner QR por câmera ────────────────────────────────────────────────────
function QrScanner({ onDetect }: { onDetect: (token: string) => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);
  const [active,   setActive]   = useState(false);
  const [error,    setError]    = useState('');
  const [support,  setSupport]  = useState<boolean | null>(null);

  useEffect(() => {
    setSupport(typeof window !== 'undefined' && 'BarcodeDetector' in window);
    return () => { stopCamera(); };
  }, []);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      scanLoop();
    } catch (e: any) {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const scanLoop = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(videoRef.current);
      if (barcodes.length > 0) {
        const raw: string = barcodes[0].rawValue;
        // Extrai UUID do token (pode estar em URL ou ser o token direto)
        const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const token = uuidMatch ? uuidMatch[0] : raw.trim();
        stopCamera();
        onDetect(token);
        return;
      }
    } catch { /* ignora frames sem barcode */ }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onDetect]);

  if (support === false) return null;

  return (
    <div className="mb-5">
      {!active ? (
        <button
          onClick={startCamera}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <CameraIcon />
          Abrir câmera para ler QR Code
        </button>
      ) : (
        <div className="relative rounded-xl overflow-hidden border-2 border-blue-400 shadow-lg bg-black" style={{ maxWidth: 400, aspectRatio: '4/3' }}>
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          {/* Guia visual */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-4 border-blue-400 rounded-xl opacity-80">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-300 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-300 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-300 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-300 rounded-br-lg" />
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
            Posicione o QR Code do paciente no enquadramento
          </div>
          <button
            onClick={stopCamera}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white text-xs px-2 py-1 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Visualizador do prontuário ───────────────────────────────────────────────
function ProntuarioCard({ data }: { data: any }) {
  const { meta, personal, allergies, chronicConditions, emergency,
          medications, lifestyle, examResults, bloodPressureReadings } = data;

  const levelLabel: Record<string, string> = {
    basic: 'Básico', medium: 'Médio', complete: 'Completo', full: 'Completo',
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Banner de acesso */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <QrIcon />
          <span className="text-blue-700 text-sm font-semibold">
            Prontuário {levelLabel[meta?.level] ?? meta?.level} — {personal?.fullName}
          </span>
        </div>
        <span className="ml-auto text-xs text-blue-500">
          Expira {new Date(meta?.expiresAt).toLocaleString('pt-BR')}
        </span>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dados pessoais</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {personal?.dateOfBirth && (
            <div>
              <span className="text-slate-500 text-xs">Nascimento</span>
              <p className="font-medium text-slate-800">
                {new Date(personal.dateOfBirth).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          {personal?.gender && (
            <div>
              <span className="text-slate-500 text-xs">Gênero</span>
              <p className="font-medium text-slate-800">
                {personal.gender === 'male' ? 'Masculino' : personal.gender === 'female' ? 'Feminino' : 'Outro'}
              </p>
            </div>
          )}
          {personal?.bloodType && personal.bloodType !== 'unknown' && (
            <div>
              <span className="text-slate-500 text-xs">Tipo sanguíneo</span>
              <p className="font-medium text-red-600">
                {personal.bloodType.replace('_PLUS', '+').replace('_MINUS', '-')}
              </p>
            </div>
          )}
          {personal?.isDonor && (
            <div>
              <span className="text-slate-500 text-xs">Doador</span>
              <p className="font-medium text-green-700">Sim</p>
            </div>
          )}
        </div>
      </div>

      {/* Alergias e condições */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Alergias</p>
          {allergies?.length
            ? allergies.map((a: string) => (
                <span key={a} className="inline-block bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full mr-1 mb-1">{a}</span>
              ))
            : <p className="text-xs text-slate-400">Nenhuma</p>}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Condições crônicas</p>
          {chronicConditions?.length
            ? chronicConditions.map((c: string) => (
                <span key={c} className="inline-block bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full mr-1 mb-1">{c}</span>
              ))
            : <p className="text-xs text-slate-400">Nenhuma</p>}
        </div>
      </div>

      {/* Emergência */}
      {emergency?.name && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contato de emergência</p>
          <p className="text-sm font-medium text-slate-800">{emergency.name}</p>
          <p className="text-xs text-slate-500">{emergency.phone} {emergency.relationship ? `· ${emergency.relationship}` : ''}</p>
        </div>
      )}

      {/* Medicamentos */}
      {medications?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Medicamentos ativos</p>
          <div className="space-y-2">
            {medications.map((m: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-500">
                    {[m.dosage, m.frequency, m.form].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exames recentes */}
      {examResults?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Exames recentes</p>
          {examResults.map((ex: any, i: number) => (
            <div key={i} className="border-b border-slate-100 last:border-0 pb-2 mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">{ex.examType}</p>
                <span className="text-xs text-slate-400">{new Date(ex.examDate).toLocaleDateString('pt-BR')}</span>
              </div>
              {ex.aiSummary && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{ex.aiSummary}</p>}
              {ex.aiRiskLevel && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                  ex.aiRiskLevel === 'critical' ? 'bg-red-100 text-red-700'
                  : ex.aiRiskLevel === 'warning' ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
                }`}>
                  {ex.aiRiskLevel === 'critical' ? 'Crítico' : ex.aiRiskLevel === 'warning' ? 'Atenção' : 'Normal'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pressão arterial */}
      {bloodPressureReadings?.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pressão arterial recente</p>
          <div className="space-y-1.5">
            {bloodPressureReadings.slice(0, 5).map((bp: any, i: number) => {
              const cls = BP_CLASS[bp.classification] ?? { label: bp.classification, color: 'bg-slate-100 text-slate-600' };
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-xs text-slate-400 w-20">{new Date(bp.measuredAt).toLocaleDateString('pt-BR')}</span>
                  <span className="font-mono font-bold text-slate-800">{bp.systolic}/{bp.diastolic}</span>
                  <span className="text-xs text-slate-500">{bp.pulse ?? '—'} bpm</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls.color}`}>{cls.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estilo de vida */}
      {lifestyle && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estilo de vida</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {lifestyle.bmi && (
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{Number(lifestyle.bmi).toFixed(1)}</p>
                <p className="text-slate-500">IMC</p>
                {lifestyle.bmiCategory && (
                  <p className="text-xs mt-0.5 text-blue-600 capitalize">{lifestyle.bmiCategory.replace('_', ' ')}</p>
                )}
              </div>
            )}
            {lifestyle.smokingStatus && (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 capitalize">{lifestyle.smokingStatus}</p>
                <p className="text-slate-500">Tabagismo</p>
              </div>
            )}
            {lifestyle.exerciseFrequency && (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">{lifestyle.exerciseFrequency}x/sem</p>
                <p className="text-slate-500">Exercício</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TokenPage() {
  const [token,      setToken]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [prontuario, setProntuario] = useState<any>(null);
  const [linking,    setLinking]    = useState(false);
  const [linked,     setLinked]     = useState(false);

  const readProntuario = useCallback(async (tk: string) => {
    if (!tk.trim()) { setError('Informe o token do QR Code.'); return; }
    setLoading(true);
    setError('');
    setProntuario(null);
    setLinked(false);
    try {
      const doctorUser = getStoredUser();
      const name = doctorUser?.fullName ?? 'Médico IcodLife';
      const r = await fetch(
        `${API_URL}/prontuario/public/${tk.trim()}?name=${encodeURIComponent(name)}`
      );
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.message || 'Token inválido ou expirado');
      }
      const data = await r.json();
      setProntuario(data);
      setToken(tk.trim());
    } catch (e: any) {
      setError(e.message || 'Erro ao ler prontuário');
    } finally { setLoading(false); }
  }, []);

  const handleDetect = useCallback((tk: string) => {
    setToken(tk);
    readProntuario(tk);
  }, [readProntuario]);

  // Vincular paciente após leitura do QR (se tiver icode)
  const linkPatient = async () => {
    const icode = prontuario?.personal?.icode;
    if (!icode) { setError('Este prontuário não contém um ICODE para vinculação automática.'); return; }
    setLinking(true);
    try {
      await api.post('/doutor/patients', { icode });
      setLinked(true);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao vincular paciente');
    } finally { setLinking(false); }
  };

  return (
    <DoctorShell>
      <div className="p-6 max-w-2xl">
        {/* Cabeçalho */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <QrIcon />
            <h1 className="text-xl font-bold text-slate-800">Leitura de QR Code</h1>
          </div>
          <p className="text-sm text-slate-500">
            O paciente gera um QR Code no ICODLIFE e mostra ao médico.
            Leia com a câmera ou cole o token abaixo para acessar o prontuário compartilhado.
          </p>
        </div>

        {/* Scanner de câmera */}
        <QrScanner onDetect={handleDetect} />

        {/* Divisor */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-slate-200" />
          <span className="text-xs text-slate-400">ou cole o token</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        {/* Input manual */}
        <div className="flex gap-2 mb-2">
          <input
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && readProntuario(token)}
            placeholder="Cole o token UUID aqui (ex: a3f8c1d2-...)"
            className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={() => readProntuario(token)}
            disabled={loading || !token.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Lendo...' : 'Ler'}
          </button>
        </div>

        {error && (
          <div className="mt-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Resultado */}
        {prontuario && (
          <>
            {/* Botão vincular paciente */}
            {!linked && prontuario?.personal?.icode && (
              <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {prontuario.personal.fullName}
                  </p>
                  <p className="text-xs text-green-600 font-mono">{prontuario.personal.icode}</p>
                </div>
                <button
                  onClick={linkPatient}
                  disabled={linking}
                  className="flex-shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {linking ? 'Vinculando...' : 'Adicionar como Paciente'}
                </button>
              </div>
            )}
            {linked && (
              <div className="mt-5 p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm font-medium text-green-700">
                  ✓ Paciente adicionado ao seu painel com sucesso!
                </p>
              </div>
            )}

            <ProntuarioCard data={prontuario} />

            {/* Botão limpar */}
            <button
              onClick={() => { setProntuario(null); setToken(''); setLinked(false); setError(''); }}
              className="mt-6 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 hover:border-slate-400 rounded-lg transition-colors"
            >
              Limpar e ler outro
            </button>
          </>
        )}
      </div>
    </DoctorShell>
  );
}
