// apps/api/src/modules/exam-results/sbpcml-references.ts
// Referências baseadas nas diretrizes SBPC/ML e SBC

export interface RefRange { min: number; max: number; unit: string; }

type GenderKey = 'male' | 'female' | 'any';

interface MarkerRef {
  male?: RefRange;
  female?: RefRange;
  any?: RefRange;
  criticalLow?: number;
  criticalHigh?: number;
}

export const SBPCML_REFERENCES: Record<string, MarkerRef> = {
  // ── Hemograma ──────────────────────────────────────────────────────────────
  'Hemoglobina':        { male: { min: 13.5, max: 17.5, unit: 'g/dL' }, female: { min: 12.0, max: 16.0, unit: 'g/dL' }, criticalLow: 7, criticalHigh: 20 },
  'Hematócrito':        { male: { min: 41, max: 53, unit: '%' }, female: { min: 36, max: 46, unit: '%' } },
  'Hemácias':           { male: { min: 4.5, max: 5.9, unit: 'x10⁶/µL' }, female: { min: 4.0, max: 5.2, unit: 'x10⁶/µL' } },
  'VCM':                { any: { min: 80, max: 100, unit: 'fL' } },
  'HCM':                { any: { min: 27, max: 33, unit: 'pg' } },
  'CHCM':               { any: { min: 31, max: 37, unit: 'g/dL' } },
  'Leucócitos':         { any: { min: 4000, max: 11000, unit: '/µL' }, criticalLow: 2000, criticalHigh: 30000 },
  'Plaquetas':          { any: { min: 150000, max: 400000, unit: '/µL' }, criticalLow: 50000, criticalHigh: 1000000 },
  'Neutrófilos':        { any: { min: 1800, max: 7700, unit: '/µL' } },
  'Linfócitos':         { any: { min: 1000, max: 4800, unit: '/µL' } },
  'Monócitos':          { any: { min: 200, max: 1000, unit: '/µL' } },
  'Eosinófilos':        { any: { min: 0, max: 500, unit: '/µL' } },
  'Basófilos':          { any: { min: 0, max: 100, unit: '/µL' } },

  // ── Glicemia / Metabólico ──────────────────────────────────────────────────
  'Glicose':            { any: { min: 70, max: 99, unit: 'mg/dL' }, criticalLow: 40, criticalHigh: 500 },
  'Glicemia de jejum':  { any: { min: 70, max: 99, unit: 'mg/dL' }, criticalLow: 40, criticalHigh: 500 },
  'Glicemia':           { any: { min: 70, max: 99, unit: 'mg/dL' }, criticalLow: 40, criticalHigh: 500 },
  'HbA1c':              { any: { min: 0, max: 5.7, unit: '%' } },
  'Hemoglobina Glicada':{ any: { min: 0, max: 5.7, unit: '%' } },
  'Insulina em jejum':  { any: { min: 2, max: 25, unit: 'µUI/mL' } },

  // ── Lipídios ───────────────────────────────────────────────────────────────
  'Colesterol Total':   { any: { min: 0, max: 199, unit: 'mg/dL' } },
  'Colesterol LDL':     { any: { min: 0, max: 129, unit: 'mg/dL' } },
  'LDL':                { any: { min: 0, max: 129, unit: 'mg/dL' } },
  'Colesterol HDL':     { male: { min: 40, max: 500, unit: 'mg/dL' }, female: { min: 50, max: 500, unit: 'mg/dL' } },
  'HDL':                { male: { min: 40, max: 500, unit: 'mg/dL' }, female: { min: 50, max: 500, unit: 'mg/dL' } },
  'Triglicerídeos':     { any: { min: 0, max: 149, unit: 'mg/dL' }, criticalHigh: 1000 },

  // ── Função renal ───────────────────────────────────────────────────────────
  'Creatinina':         { male: { min: 0.72, max: 1.25, unit: 'mg/dL' }, female: { min: 0.50, max: 1.10, unit: 'mg/dL' } },
  'Ureia':              { any: { min: 15, max: 40, unit: 'mg/dL' } },
  'Ácido Úrico':        { male: { min: 3.5, max: 7.2, unit: 'mg/dL' }, female: { min: 2.6, max: 6.0, unit: 'mg/dL' } },
  'TFG':                { any: { min: 60, max: 999, unit: 'mL/min/1.73m²' } },

  // ── Função hepática ────────────────────────────────────────────────────────
  'TGO':                { any: { min: 0, max: 40, unit: 'U/L' } },
  'TGP':                { any: { min: 0, max: 41, unit: 'U/L' } },
  'AST':                { any: { min: 0, max: 40, unit: 'U/L' } },
  'ALT':                { any: { min: 0, max: 41, unit: 'U/L' } },
  'Gama GT':            { male: { min: 0, max: 73, unit: 'U/L' }, female: { min: 0, max: 38, unit: 'U/L' } },
  'Bilirrubina Total':  { any: { min: 0.2, max: 1.2, unit: 'mg/dL' } },
  'Fosfatase Alcalina': { any: { min: 40, max: 150, unit: 'U/L' } },

  // ── Tireoide ───────────────────────────────────────────────────────────────
  'TSH':                { any: { min: 0.4, max: 4.0, unit: 'µUI/mL' } },
  'T4 livre':           { any: { min: 0.8, max: 1.9, unit: 'ng/dL' } },
  'T3':                 { any: { min: 80, max: 200, unit: 'ng/dL' } },

  // ── Eletrólitos ────────────────────────────────────────────────────────────
  'Sódio':              { any: { min: 136, max: 145, unit: 'mEq/L' }, criticalLow: 120, criticalHigh: 160 },
  'Potássio':           { any: { min: 3.5, max: 5.1, unit: 'mEq/L' }, criticalLow: 2.5, criticalHigh: 6.5 },
  'Cálcio':             { any: { min: 8.5, max: 10.5, unit: 'mg/dL' } },
  'Magnésio':           { any: { min: 1.6, max: 2.6, unit: 'mg/dL' } },
  'Fósforo':            { any: { min: 2.5, max: 4.5, unit: 'mg/dL' } },

  // ── Vitaminas e minerais ────────────────────────────────────────────────────
  'Vitamina D':         { any: { min: 30, max: 100, unit: 'ng/mL' } },
  'Vitamina B12':       { any: { min: 200, max: 900, unit: 'pg/mL' } },
  'Ferritina':          { male: { min: 22, max: 322, unit: 'ng/mL' }, female: { min: 10, max: 291, unit: 'ng/mL' } },
  'Ferro Sérico':       { male: { min: 65, max: 175, unit: 'µg/dL' }, female: { min: 50, max: 170, unit: 'µg/dL' } },
  'Transferrina':       { any: { min: 204, max: 360, unit: 'mg/dL' } },

  // ── Inflamação ──────────────────────────────────────────────────────────────
  'PCR':                { any: { min: 0, max: 5, unit: 'mg/L' } },
  'Proteína C Reativa': { any: { min: 0, max: 5, unit: 'mg/L' } },
  'VHS':                { male: { min: 0, max: 15, unit: 'mm/h' }, female: { min: 0, max: 20, unit: 'mm/h' } },
};

export function getReference(marker: string, gender: GenderKey): RefRange | null {
  const normalized = marker.trim();
  const ref = SBPCML_REFERENCES[normalized];
  if (!ref) return null;
  if (gender !== 'any' && ref[gender]) return ref[gender]!;
  if (ref.any) return ref.any;
  if (gender === 'male' && ref.female) return ref.female;
  if (gender === 'female' && ref.male) return ref.male;
  return null;
}

export function calcStatus(
  value: number, marker: string, gender: GenderKey
): { status: string; refMin: number | null; refMax: number | null; refSource: string } {
  const ref = getReference(marker, gender);
  const markerDef = SBPCML_REFERENCES[marker.trim()];

  if (!ref) return { status: 'pending', refMin: null, refMax: null, refSource: 'desconhecido' };

  if (markerDef?.criticalLow !== undefined && value < markerDef.criticalLow)
    return { status: 'critical_low', refMin: ref.min, refMax: ref.max, refSource: 'SBPC/ML' };
  if (markerDef?.criticalHigh !== undefined && value > markerDef.criticalHigh)
    return { status: 'critical_high', refMin: ref.min, refMax: ref.max, refSource: 'SBPC/ML' };
  if (value < ref.min)
    return { status: 'low', refMin: ref.min, refMax: ref.max, refSource: 'SBPC/ML' };
  if (value > ref.max)
    return { status: 'high', refMin: ref.min, refMax: ref.max, refSource: 'SBPC/ML' };

  return { status: 'normal', refMin: ref.min, refMax: ref.max, refSource: 'SBPC/ML' };
}
