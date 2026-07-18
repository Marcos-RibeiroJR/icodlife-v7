'use client';
// apps/doutor/src/components/ui/AutocompleteInput.tsx
// Campo de texto com autocomplete assíncrono (busca com debounce).
import { useEffect, useRef, useState } from 'react';

export interface AutoOption { label: string; sub?: string; [k: string]: any; }

interface Props {
  value: string;
  onChange: (v: string) => void;
  fetcher: (q: string) => Promise<AutoOption[]>;
  onSelect?: (opt: AutoOption) => void;
  placeholder?: string;
  className?: string;
  minChars?: number;
}

export function AutocompleteInput({ value, onChange, fetcher, onSelect, placeholder, className, minChars = 2 }: Props) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<AutoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<any>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const runQuery = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q || q.trim().length < minChars) { setOpts([]); setOpen(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const list = await fetcher(q.trim());
        setOpts(list || []);
        setOpen((list || []).length > 0);
      } catch {
        setOpts([]); setOpen(false);
      } finally { setLoading(false); }
    }, 230);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); runQuery(e.target.value); }}
        onFocus={() => { if (value && opts.length) setOpen(true); }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
          {opts.map((o, i) => (
            <button
              type="button"
              key={i}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.label); onSelect?.(o); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center justify-between gap-2"
            >
              <span className="truncate">{o.label}</span>
              {o.sub && <span className="text-slate-400 text-xs flex-shrink-0">{o.sub}</span>}
            </button>
          ))}
          {loading && <div className="px-3 py-1.5 text-xs text-slate-400">Buscando…</div>}
        </div>
      )}
    </div>
  );
}
