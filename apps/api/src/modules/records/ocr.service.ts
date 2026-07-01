// apps/api/src/modules/records/ocr.service.ts
// Parser dedicado para laudos brasileiros (Hermes Pardini / IPC / Bradesco e similares)

import { Injectable, Logger } from '@nestjs/common';

export interface OcrMarker {
  marker: string;
  value: number;
  unit: string;
  rawLine: string;
}

export interface OcrResult {
  success: boolean;
  text: string;
  markers: OcrMarker[];
  examDate: string | null;
  labName: string | null;
  patientName: string | null;
  confidence: number;
}

// ── Mapa canônico: chave em MAIÚSCULO SEM ESPAÇOS → nome exibido ─────────────
const SECTION_MAP: Record<string, { marker: string; unit: string }> = {
  'CALCIO':                        { marker: 'Cálcio',             unit: 'mg/dL' },
  'CÁLCIO':                        { marker: 'Cálcio',             unit: 'mg/dL' },
  'GLICOSE':                       { marker: 'Glicose',            unit: 'mg/dL' },
  'GLICEMIA':                      { marker: 'Glicose',            unit: 'mg/dL' },
  'ACIDOURICO':                    { marker: 'Ácido Úrico',        unit: 'mg/dL' },
  'ÁCIDOÚRICO':                    { marker: 'Ácido Úrico',        unit: 'mg/dL' },
  'SODIO':                         { marker: 'Sódio',              unit: 'mEq/L' },
  'SÓDIO':                         { marker: 'Sódio',              unit: 'mEq/L' },
  'POTASSIO':                      { marker: 'Potássio',           unit: 'mEq/L' },
  'POTÁSSIO':                      { marker: 'Potássio',           unit: 'mEq/L' },
  'UREIA':                         { marker: 'Ureia',              unit: 'mg/dL' },
  'URÉIA':                         { marker: 'Ureia',              unit: 'mg/dL' },
  'UREIASANGUINEA':                { marker: 'Ureia',              unit: 'mg/dL' },
  'CREATININA':                    { marker: 'Creatinina',         unit: 'mg/dL' },
  'FERROSERICO':                   { marker: 'Ferro Sérico',       unit: 'mcg/dL' },
  'FERROSÉRICO':                   { marker: 'Ferro Sérico',       unit: 'mcg/dL' },
  'FERRO':                         { marker: 'Ferro Sérico',       unit: 'mcg/dL' },
  'FERRITINA':                     { marker: 'Ferritina',          unit: 'ng/mL' },
  'FOSFATASEALCALINA':             { marker: 'Fosfatase Alcalina', unit: 'U/L' },
  'TGO':                           { marker: 'TGO',                unit: 'U/L' },
  'TGP':                           { marker: 'TGP',                unit: 'U/L' },
  'AST':                           { marker: 'TGO',                unit: 'U/L' },
  'ALT':                           { marker: 'TGP',                unit: 'U/L' },
  'TSH':                           { marker: 'TSH',                unit: 'µUI/mL' },
  'T4LIVRE':                       { marker: 'T4 Livre',           unit: 'ng/dL' },
  'VITAMINAD':                     { marker: 'Vitamina D',         unit: 'ng/mL' },
  'VITAMINAB12':                   { marker: 'Vitamina B12',       unit: 'pg/mL' },
  'PCREATIVA':                     { marker: 'Proteína C Reativa', unit: 'mg/dL' },
  'PROTEINACREATIVA':              { marker: 'Proteína C Reativa', unit: 'mg/dL' },
  'ALBUMINA':                      { marker: 'Albumina',           unit: 'g/dL' },
  'TESTOSTERONA':                  { marker: 'Testosterona',       unit: 'ng/dL' },
  'INSULINA':                      { marker: 'Insulina',           unit: 'µUI/mL' },
  'HEMOGLOBINAGLICADA':            { marker: 'Hemoglobina Glicada',unit: '%' },
  'PSATOTAL':                      { marker: 'PSA Total',          unit: 'ng/mL' },
  'PSA':                           { marker: 'PSA Total',          unit: 'ng/mL' },
  'MAGNESIO':                      { marker: 'Magnésio',           unit: 'mg/dL' },
  'MAGNÉSIO':                      { marker: 'Magnésio',           unit: 'mg/dL' },
  'FOSFORO':                       { marker: 'Fósforo',            unit: 'mg/dL' },
  'FÓSFORO':                       { marker: 'Fósforo',            unit: 'mg/dL' },
};

// Marcadores do hemograma (linha pontilhada)
const HEMOGRAMA_MAP: Record<string, { marker: string; unit: string }> = {
  'HEMÁCIAS':          { marker: 'Hemácias',    unit: 'milhões/mm³' },
  'HEMACIAS':          { marker: 'Hemácias',    unit: 'milhões/mm³' },
  'HEMOGLOBINA':       { marker: 'Hemoglobina', unit: 'g/dL' },
  'HEMATOCRITO':       { marker: 'Hematócrito', unit: '%' },
  'HEMATÓCRITO':       { marker: 'Hematócrito', unit: '%' },
  'VCM':               { marker: 'VCM',         unit: 'fL' },
  'HCM':               { marker: 'HCM',         unit: 'pg' },
  'CHCM':              { marker: 'CHCM',        unit: 'g/dL' },
  'RDW':               { marker: 'RDW',         unit: '%' },
  'LEUCÓCITOSTOTAIS':  { marker: 'Leucócitos',  unit: '/mm³' },
  'LEUCOCITOSTOTAIS':  { marker: 'Leucócitos',  unit: '/mm³' },
  'SEGMENTADOS':       { marker: 'Neutrófilos', unit: '%' },
  'EOSINÓFILOS':       { marker: 'Eosinófilos', unit: '%' },
  'EOSINOFILOS':       { marker: 'Eosinófilos', unit: '%' },
  'BASÓFILOS':         { marker: 'Basófilos',   unit: '%' },
  'BASOFILOS':         { marker: 'Basófilos',   unit: '%' },
  'LINFÓCITOSTÍPICOS': { marker: 'Linfócitos',  unit: '%' },
  'LINFOCITOSTIPICOS': { marker: 'Linfócitos',  unit: '%' },
  'MONÓCITOS':         { marker: 'Monócitos',   unit: '%' },
  'MONOCITOS':         { marker: 'Monócitos',   unit: '%' },
  'PLAQUETAS':         { marker: 'Plaquetas',   unit: '/mm³' },
};

// Colesterol: extraído de linhas especiais
const COLESTEROL_MAP: Record<string, string> = {
  'COLESTEROLTOTAL':    'Colesterol Total',
  'COLESTEROLHDL':      'Colesterol HDL',
  'COLESTEROLLDL':      'Colesterol LDL',
  'COLESTEROLVLDL':     'Colesterol VLDL',
  'COLESTEROLNAOHD':    'Colesterol não-HDL',
  'TRIGLICERIDEOS':     'Triglicerídeos',
  'TRIGLICERÍDEOS':     'Triglicerídeos',
};

// Gama-GT e enzimas com nome longo na header
const LONG_SECTION_MAP: Array<{ test: RegExp; marker: string; unit: string }> = [
  { test: /GAMAGLUTAMIL|GAMAGT|GAMA.GT/i, marker: 'Gama GT',            unit: 'U/L' },
  { test: /ASPARTATO|AMINOTRANSF.*AST|TGO/i, marker: 'TGO',             unit: 'U/L' },
  { test: /ALANINA|AMINOTRANSF.*ALT|TGP/i,   marker: 'TGP',             unit: 'U/L' },
  { test: /BILIRRUBINA.*TOTAL/i,              marker: 'Bilirrubina Total',  unit: 'mg/dL' },
  { test: /BILIRRUBINA.*DIRETA/i,             marker: 'Bilirrubina Direta', unit: 'mg/dL' },
  { test: /PROTEÍNA.*C.*REATIVA|PCR/i,        marker: 'Proteína C Reativa', unit: 'mg/dL' },
  { test: /HEMOGLOBINA.*GLICADA|HBA1C/i,      marker: 'Hemoglobina Glicada',unit: '%' },
  { test: /FOSFATASE.*ALCALINA/i,             marker: 'Fosfatase Alcalina', unit: 'U/L' },
  { test: /VITAMINA.*D/i,                     marker: 'Vitamina D',         unit: 'ng/mL' },
  { test: /VITAMINA.*B12/i,                   marker: 'Vitamina B12',       unit: 'pg/mL' },
  { test: /FERRO.*SÉRICO|FERRO.*SERICO/i,     marker: 'Ferro Sérico',       unit: 'mcg/dL' },
  { test: /ÁCIDO.*ÚRICO|ACIDO.*URICO/i,       marker: 'Ácido Úrico',       unit: 'mg/dL' },
  { test: /COLESTEROL.*TOTAL.*FRA/i,          marker: '_colesterol_block',  unit: '' },
  { test: /TESTOSTERONA/i,                    marker: 'Testosterona',       unit: 'ng/dL' },
  { test: /PSA.*TOTAL|ANTÍGENO.*PROS/i,       marker: 'PSA Total',          unit: 'ng/mL' },
];

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractFromPdf(buffer: Buffer): Promise<OcrResult> {
    let text = '';
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      text = data.text;
    } catch (e) {
      this.logger.warn('pdf-parse falhou: ' + e);
      return { success: false, text: '', markers: [], examDate: null, labName: null, patientName: null, confidence: 0 };
    }

    const markers     = this.parseMarkers(text);
    const examDate    = this.extractDate(text);
    const labName     = this.extractLabName(text);
    const patientName = this.extractPatientName(text);
    const confidence  = Math.min(100, markers.length * 10 + (examDate ? 10 : 0) + (labName ? 5 : 0));

    return { success: markers.length > 0, text, markers, examDate, labName, patientName, confidence };
  }

  private parseMarkers(text: string): OcrMarker[] {
    const results: OcrMarker[] = [];
    const seen = new Set<string>();

    const add = (marker: string, value: number, unit: string, rawLine: string) => {
      if (seen.has(marker)) return;
      if (isNaN(value) || value < 0 || value > 9_999_999) return;
      seen.add(marker);
      results.push({ marker, value, unit, rawLine });
    };

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let currentSection: { marker: string; unit: string } | null = null;
    let inColesterolBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upper = line.toUpperCase().replace(/\s+/g, '');

      // ── 1. HEMOGRAMA: "Hemoglobina.............:16.0g/dL" ──────────────────
      // Formato: NomeDotsDots:valor[unidade]
      const hemaMatch = line.match(/^([A-Za-zÀ-ú][A-Za-zÀ-ú\s]+?)\.{2,}:?\s*([\d]+[,\.][\d]*)\s*(milhões\/mm³|\/mm³|g\/dL|%|fL|pg|mg\/dL|U\/L)?/i);
      if (hemaMatch) {
        const rawName = hemaMatch[1].trim().toUpperCase().replace(/\s+/g, '');
        const meta = HEMOGRAMA_MAP[rawName];
        if (meta) {
          const rawVal = hemaMatch[2].replace(',', '.');
          let value = parseFloat(rawVal);
          const unit = hemaMatch[3] ?? meta.unit;
          // Para porcentagens com hífen no final como "50,1%-4093/mm³", extrai só %
          const pctMatch = line.match(/:([\d,\.]+)%/);
          if (pctMatch && (meta.unit === '%' || meta.marker === 'Neutrófilos')) {
            value = parseFloat(pctMatch[1].replace(',', '.'));
          }
          add(meta.marker, value, unit || meta.unit, line);
          continue;
        }
      }

      // ── 2. PLAQUETAS com separador de milhar: "PLAQUETAS.............:286.000/mm³" ──
      const plaqMatch = line.match(/PLAQUETAS\.{2,}:?\s*([\d]+\.[\d]{3})\s*\/mm³/i);
      if (plaqMatch) {
        const value = parseFloat(plaqMatch[1].replace('.', ''));
        add('Plaquetas', value, '/mm³', line);
        continue;
      }

      // ── 3. LEUCÓCITOS com separador de milhar: "LEUCÓCITOSTOTAIS.......:8.170/mm³" ──
      const leucMatch = line.match(/LEUC.{0,10}TOTAIS\.{2,}:?\s*([\d]+\.[\d]{3})\s*\/mm³/i);
      if (leucMatch) {
        const value = parseFloat(leucMatch[1].replace('.', ''));
        add('Leucócitos', value, '/mm³', line);
        continue;
      }

      // ── 4. SEÇÃO STANDALONE: "CALCIO", "GLICOSE", "POTÁSSIO" ────────────────
      // Linha curta, somente letras, sem número
      if (/^[A-ZÀ-Ú\-\s\(\)]{3,50}$/.test(line) && !/MÉTODO|MATERIAL|COLETA|ADULTO|CRIANÇA|VALOR|RESULT|EXAME|NOME|CONF|ASSIN|ANTERI|DATA/i.test(line)) {
        // Testa short section map
        const noSpace = upper;
        if (SECTION_MAP[noSpace]) {
          currentSection = SECTION_MAP[noSpace];
          inColesterolBlock = false;
          continue;
        }
        // Testa long section map
        const longMeta = LONG_SECTION_MAP.find(m => m.test.test(line));
        if (longMeta) {
          if (longMeta.marker === '_colesterol_block') {
            inColesterolBlock = true;
            currentSection = null;
          } else {
            currentSection = { marker: longMeta.marker, unit: longMeta.unit };
            inColesterolBlock = false;
          }
          continue;
        }
      }

      // ── 5. RESULTADO simples: "RESULTADO:9,0mg/dL" ou "RESULTADO..............:31mg/dL" ──
      const resultMatch = line.match(/^RESULTADO[\.:]{1,20}\s*([\d]+[,\.]?[\d]*)\s*(mg\/dL|mEq\/L|mcg\/dL|ng\/mL|µUI\/mL|mUI\/L|U\/L|UI\/L|%|g\/dL|pg\/mL|IU\/L)?/i);
      if (resultMatch && currentSection) {
        const value = parseFloat(resultMatch[1].replace(',', '.'));
        const unit = resultMatch[2] ?? currentSection.unit;
        add(currentSection.marker, value, unit, line);
        currentSection = null;
        continue;
      }

      // ── 6. COLESTEROL BLOCO: "RESULTADO:-COLESTEROLTOTAL:212mg/dL" ─────────
      if (inColesterolBlock) {
        // "RESULTADO:-COLESTEROLTOTAL:212mg/dL"
        const colRes = line.match(/RESULTADO[:\s]*-?COLESTEROL([A-ZÁÉÍÓÚ\-]+)[:\s]*([\d]+)\s*(mg\/dL)?/i);
        if (colRes) {
          const key = 'COLESTEROL' + colRes[1].toUpperCase().replace(/[^A-Z]/g, '');
          const markerName = COLESTEROL_MAP[key] ?? ('Colesterol ' + colRes[1]);
          const value = parseFloat(colRes[2]);
          add(markerName, value, 'mg/dL', line);
          continue;
        }
        // "-COLESTEROLHDL:39mg/dL"
        const colLine = line.match(/^-?COLESTEROL([A-ZÁÉÍÓÚ\-]+)[:\s]*([\d]+)\s*(mg\/dL)?/i);
        if (colLine) {
          const key = 'COLESTEROL' + colLine[1].toUpperCase().replace(/[^A-Z]/g, '');
          const markerName = COLESTEROL_MAP[key] ?? ('Colesterol ' + colLine[1]);
          const value = parseFloat(colLine[2]);
          add(markerName, value, 'mg/dL', line);
          continue;
        }
        // Fim do bloco de colesterol
        if (/VALORES|REFERÊNCIA|NOTA|CONFERIDO|ASSINADO|Nome/i.test(line)) {
          inColesterolBlock = false;
        }
      }

      // ── 7. Triglicer linha própria: "TRIGLICERÍDEOS:120mg/dL" ───────────────
      const trigMatch = line.match(/TRIGLICERI[DÉ]{1,2}EOS[:\s\.]+([\d]+[,\.]?[\d]*)\s*(mg\/dL)?/i);
      if (trigMatch) {
        add('Triglicerídeos', parseFloat(trigMatch[1].replace(',', '.')), 'mg/dL', line);
        continue;
      }
    }

    return results;
  }

  private extractDate(text: string): string | null {
    const patterns = [
      /[Cc]oleta.*?(\d{2}\/\d{2}\/\d{4})/,
      /[Ee]ntrada.*?(\d{2}\/\d{2}\/\d{4})/,
      /(\d{2}\/\d{2}\/\d{4})/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const parts = m[1].split('/');
        if (parts.length === 3 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
    }
    return null;
  }

  private extractLabName(text: string): string | null {
    const labs = [
      'Hermes Pardini', 'Fleury', 'Sabin', 'DASA', 'Lavoisier', 'Hilab',
      'Grupo Alliar', 'Synlab', 'Einstein', 'Hcor', 'Sírio-Libanês',
      'IPC', 'DB Molecular', 'Santa Casa',
    ];
    const upper = text.toUpperCase();
    for (const lab of labs) {
      if (upper.includes(lab.toUpperCase())) return lab;
    }
    const m = text.match(/LABORATÓRIO[:\s]+([A-Za-zÀ-ú\s]+)/i);
    if (m) return m[1].trim().slice(0, 60);
    return null;
  }

  private extractPatientName(text: string): string | null {
    // Formato normal
    const m = text.match(/[Pp]aciente[:\s]+([A-Za-zÀ-ú\s]{5,60})/);
    if (m) return m[1].trim();
    // Formato concatenado: "NomeMARCOSFRANCORIBEIROJUNIOR"
    const m2 = text.match(/Nome([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]{4,60}?)(?:Idade|Dr|Data|Convênio)/);
    if (m2) {
      // insere espaço antes de maiúsculas consecutivas (heurística)
      return m2[1].replace(/([A-Z])(?=[A-Z]{2})/g, '$1 ').trim();
    }
    return null;
  }
}
