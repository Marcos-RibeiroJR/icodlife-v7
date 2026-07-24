'use client';
// apps/web/src/app/carteirinha/page.tsx
// Carteirinha digital do paciente — logo, nome, tipo sanguíneo, doação de órgãos e número iCODLIFE.
import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../store/auth.store';
import { usersApi } from '../../lib/api';
import QRCode from 'qrcode.react';

function formatBloodType(bt?: string | null) {
  if (!bt || bt === 'unknown') return 'Não informado';
  return bt;
}

function formatDate(d?: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

export default function CarteirinhaPage() {
  const { user, setUser } = useAuthStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // busca dados atualizados do usuário (o cache do login pode estar desatualizado)
    usersApi.getMe().then(({ data }) => setUser(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    setError('');
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement('a');
      const nomeArquivo = (user?.fullName || 'carteirinha').trim().split(' ')[0].toLowerCase();
      link.download = `carteirinha-icodlife-${nomeArquivo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setError('Não foi possível gerar a imagem da carteirinha. Tente novamente.');
    } finally {
      setDownloading(false);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="p-8 max-w-lg mx-auto text-center text-slate-500">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Minha Carteirinha</h1>
        <p className="text-slate-500 text-sm mb-6">Sua identificação digital iCODLIFE. Apresente ou baixe para levar sempre com você.</p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        {/* Cartão — este é o elemento exportado como imagem */}
        <div className="flex justify-center mb-6">
          <div
            ref={cardRef}
            style={{
              width: 380,
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #7B1E1E 0%, #4a1010 100%)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            }}
          >
            <div style={{ padding: '20px 22px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <img src="/logo.svg" alt="IcodLife" style={{ height: 36, width: 'auto' }} />
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                CARTEIRINHA DIGITAL
              </span>
            </div>

            <div style={{ background: '#fff', margin: '0 12px', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 2 }}>
                NOME
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', marginBottom: 14, lineHeight: 1.2 }}>
                {user.fullName}
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 2 }}>
                    TIPO SANGUÍNEO
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#B91C1C' }}>
                    {formatBloodType(user.bloodType)}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 2 }}>
                    DOADOR DE ÓRGÃOS
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: user.isDonor ? '#0F766E' : '#64748B' }}>
                    {user.isDonor ? 'Sim' : 'Não'}
                  </div>
                </div>
              </div>

              {user.dateOfBirth && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 2 }}>
                    DATA DE NASCIMENTO
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    {formatDate(user.dateOfBirth)}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #E2E8F0', paddingTop: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: 2 }}>
                    NÚMERO ICODLIFE
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: '#7B1E1E', letterSpacing: '0.02em' }}>
                    {user.icode || '—'}
                  </div>
                </div>
                {user.icode && (
                  <div style={{ background: '#fff', padding: 4, border: '1px solid #E2E8F0', borderRadius: 6 }}>
                    <QRCode value={user.icode} size={54} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 22px 20px', textAlign: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9.5 }}>
                icodlife.com.br · documento pessoal e intransferível
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-[#7B1E1E] hover:bg-[#5f1616] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {downloading ? 'Gerando...' : '⬇ Baixar carteirinha'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
