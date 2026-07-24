'use client';
// apps/clinica/src/components/ui/IcodlifeUserPicker.tsx
// Campo de busca reutilizável no cadastro único iCODLIFE (por nome, ICODE ou
// e-mail). Usado em "Meus Funcionários", "Base de Consultas" e "Atendimento"
// (guichê) para garantir que a mesma pessoa seja sempre a mesma conta —
// em vez de digitar o ICODE às cegas, o usuário busca e seleciona.
import { useEffect, useRef, useState } from 'react';
import { icodlifeApi } from '@/lib/api';

export type IcodlifeUser = {
  id: string;
  fullName: string;
  email: string;
  icode: string | null;
  avatarUrl?: string | null;
  bloodType?: string;
};

export function IcodlifeUserPicker({
  onSelect,
  placeholder = 'Buscar por nome, ICODE ou e-mail...',
  selected,
  onClear,
}: {
  onSelect: (user: IcodlifeUser) => void;
  placeholder?: string;
  selected?: IcodlifeUser | null;
  onClear?: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<IcodlifeUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      icodlifeApi.search(q.trim())
        .then((r) => { setResults(r.data ?? []); setOpen(true); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 border border-green-200 bg-green-50 rounded-xl px-3 py-2.5">
        <div>
          <div className="text-sm font-semibold text-slate-800">{selected.fullName}</div>
          <div className="text-xs text-green-700 font-medium">
            ● cadastro único iCODLIFE — {selected.icode || 'sem ICODE'}
          </div>
        </div>
        {onClear && (
          <button type="button" onClick={onClear} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
            trocar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-200 focus:outline-none"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-xs text-slate-400">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-slate-400">
              Nenhum cadastro iCODLIFE encontrado{q.trim().length >= 2 ? ` para "${q.trim()}"` : ''}.
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onSelect(u); setOpen(false); setQ(''); }}
                className="w-full text-left px-3 py-2.5 hover:bg-red-50 border-b border-slate-50 last:border-0 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800">{u.fullName}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <span className="text-xs font-mono text-slate-400 flex-shrink-0">{u.icode || '—'}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
