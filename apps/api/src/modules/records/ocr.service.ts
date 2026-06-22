// apps/api/src/modules/records/ocr.service.ts
// Extração de texto de PDFs + parsing de marcadores laboratoriais

import { Injectable, Logger } from '@nestjs/common';
import { SBPCML_REFERENCES } from '../exam-results/sbpcml-references';

// Todos os nomes de marcadores conhecidos (ordenado por comprimento desc para match greedy)
const KNOWN_MARKERS = Object.keys(SBPCML_REFERENCES).sort((a, b) => b.length - a.length);

// Aliases comuns em laudos brasileiros → nome canônico
const ALIASES: Record<string, string> = {
  'GLICOSE':              'Glicose',
  'GLICEMIA':             'Glicose',
  'GLICEMIA DE JEJUM':    'Glicemia de jejum',
  'HEMOGLOBINA GLICADA':  'Hemoglobina Glicada',
  'HBA1C':                'HbA1c',
  'COLESTEROL TOTAL':     'Colesterol Total',
  'COL TOTAL':            'Colesterol Total',
  'LDL':                  'Colesterol LDL',
  'LDL COLESTEROL':       'Colesterol LDL',
  'HDL':                  'Colesterol HDL',
  'HDL COLESTEROL':       'Colesterol HDL',
  'TRIGLICERIDEOS':       'Triglicerideos',
  'TRIGLICERÍDEOS':       'Triglicerideos',
  'TRIGLICERIDES':        'Triglicerideos',
  'HEMOGLOBINA':          'Hemoglobina',
  'HB':                   'Hemoglobina',
  'HEMATOCRITO':          'Hematocrito',
  'HT':                   'Hematocrito',
  'LEUCOCITOS':           'Leucocitos',
  'LEUCOCITOS TOTAIS':    'Leucocitos',
  'PLAQUETAS':            'Plaquetas',
  'CREATININA':           'Creatinina',
  'UREIA':                'Ureia',
  'ACIDO URICO':          'Acido Urico',
  'TGO':                  'TGO',
  'AST':                  'TGO',
  'TGP':                  'TGP',
  'ALT':                  'TGP',
  'GAMA GT':              'Gama GT',
  'GGT':                  'Gama GT',
  'TSH':                  'TSH',
  'T4 LIVRE':             'T4 livre',
  'VITAMINA D':           'Vitamina D',
  'VIT D':                'Vitamina D',
  'VITAMINA B12':         'Vitamina B12',
  'VIT B12':              'Vitamina B12',
  'FERRITINA':            'Ferritina',
  'FERRO SERICO':         'Ferro Serico',
  'FERRO':                'Ferro Serico',
  'PCR':                  'Proteina C Reativa',
  'PROTEINA C REATIVA':   'Proteina C Reativa',
  'SODIO':                'Sodio',
  'NA':                   'Sodio',
  'POTASSIO':             'Potassio',
  'K':                    'Potassio',
};

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
  confidence: number; // 0-100
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractFromPdf(buffer: Buffer): Promise<OcrResult> {
    let text = '';
    try {
      // Importação dinâmica para evitar erros em testes
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      text = data.text;
    } catch (e) {
      this.logger.warn('pdf-parse falhou: ' + e);
      return { success: false, text: '', markers: [], examDate: null, labName: null, patientName: null, confidence: 0 };
    }

    const markers  = this.parseMarkers(text);
    const examDate = this.extractDate(text);
    const labName  = this.extractLabName(text);
    const patientName = this.extractPatientName(text);
    const confidence = Math.min(100, markers.length * 12 + (examDate ? 10 : 0) + (labName ? 10 : 0));

    return { success: markers.length > 0, text, markers, examDate, labName, patientName, confidence };
  }

  private parseMarkers(text: string): OcrMarker[] {
    const results: OcrMarker[] = [];
    const seen = new Set<string>();

    // Normaliza o texto: remove acentos extras, padroniza espaços
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      // Padrão principal: "MARCADOR ...... 95,00 mg/dL"
      // Variações: separadores (tab, espaço, :, |), valor com vírgula ou ponto, unidade opcional
      const patterns = [
        // Marcador: valor unidade  (mais comum em laudos digitais)
        /^([A-Za-zÀ-ú\s\/\(\)]+?)[\s:\.]{1,8}([\d]+[,\.][\d]+|[\d]+)\s*(mg\/dL|g\/dL|mEq\/L|U\/L|ng\/mL|µg\/dL|pg\/mL|µUI\/mL|mUI\/L|nmol\/L|%|x10[⁶³]\/µL|\/µL|mm\/h|fL|pg|g\/L|mL\/min.*)?/i,
        // Valor ao final da linha: "... 95.00"
        /^([A-Za-zÀ-ú\s\/\(\)]+?)\s+([\d]+[,\.][\d]+)\s*$/i,
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (!match) continue;

        const rawName = match[1].trim().toUpperCase()
          .replace(/\s+/g, ' ')
          .replace(/[^A-ZÀ-Ú\s\/\(\)0-9]/g, '');

        const rawValue = match[2].replace(',', '.');
        const value = parseFloat(rawValue);
        if (isNaN(value) || value <= 0 || value > 999999) continue;

        const unit = (match[3] ?? '').trim();

        // Tentar resolver o alias ou nome canônico
        const canonical = ALIASES[rawName] ?? this.findClosestMarker(rawName);
        if (!canonical) continue;
        if (seen.has(canonical)) continue;
        seen.add(canonical);

        results.push({ marker: canonical, value, unit: unit || this.guessUnit(canonical), rawLine: line });
        break;
      }
    }

    return results;
  }

  private findClosestMarker(name: string): string | null {
    // Busca exata primeiro
    for (const known of KNOWN_MARKERS) {
      if (known.toUpperCase() === name) return known;
    }
    // Busca parcial (começa com)
    for (const known of KNOWN_MARKERS) {
      if (name.startsWith(known.toUpperCase()) || known.toUpperCase().startsWith(name)) return known;
    }
    return null;
  }

  private guessUnit(marker: string): string {
    const ref = SBPCML_REFERENCES[marker];
    if (!ref) return '';
    const anyRef = ref.any ?? ref.male ?? ref.female;
    return anyRef?.unit ?? '';
  }

  private extractDate(text: string): string | null {
    // Padrões de data brasileiros: 01/06/2024, 01-06-2024, 2024-06-01
    const patterns = [
      /data.*?(\d{2}\/\d{2}\/\d{4})/i,
      /data.*?(\d{2}-\d{2}-\d{4})/i,
      /coleta.*?(\d{2}\/\d{2}\/\d{4})/i,
      /emissao.*?(\d{2}\/\d{2}\/\d{4})/i,
      /(\d{2}\/\d{2}\/\d{4})/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        // Converte para ISO
        const parts = m[1].split(/[\/\-]/);
        if (parts.length === 3) {
          // DD/MM/YYYY ou YYYY-MM-DD
          if (parts[0].length === 4) return `${parts[0]}-${parts[1]}-${parts[2]}`;
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
    }
    return null;
  }

  private extractLabName(text: string): string | null {
    const labs = ['Fleury', 'Sabin', 'DASA', 'Hermes Pardini', 'Lavoisier', 'Hilab', 'DB Molecular',
                  'Grupo Alliar', 'Synlab', 'Einstein', 'Hcor', 'Sírio-Libanês', 'Santa Casa'];
    const upper = text.toUpperCase();
    for (const lab of labs) {
      if (upper.includes(lab.toUpperCase())) return lab;
    }
    // Tenta extrair da primeira linha não-vazia
    const firstLines = text.split('\n').filter(l => l.trim().length > 3).slice(0, 3);
    for (const line of firstLines) {
      if (/laborat|clinic|saude|diagn/i.test(line)) return line.trim().slice(0, 60);
    }
    return null;
  }

  private extractPatientName(text: string): string | null {
    const m = text.match(/paciente[:\s]+([A-Za-zÀ-ú\s]{5,60})/i);
    if (m) return m[1].trim();
    const m2 = text.match(/nome[:\s]+([A-Za-zÀ-ú\s]{5,60})/i);
    if (m2) return m2[1].trim();
    return null;
  }
}
