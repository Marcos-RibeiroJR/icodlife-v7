// apps/api/src/modules/ophthalmology/ophthalmology-pdf.service.ts
// Geração server-side do Laudo Oftalmológico (auto-exame) em PDF — mesmo padrão visual do ASO.
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

const COLOR = {
  primary:   '#002B5C',
  accent:    '#3b82f6',
  danger:    '#DC2626',
  warning:   '#D97706',
  success:   '#16A34A',
  gray:      '#64748B',
  lightGray: '#F1F5F9',
  border:    '#CBD5E1',
  text:      '#1E293B',
};

const RISK_LABEL: Record<string, string> = {
  none: 'Sem alterações relevantes',
  low: 'Risco baixo',
  moderate: 'Risco moderado',
  high: 'Risco alto',
};
const RISK_COLOR: Record<string, string> = {
  none: COLOR.success,
  low: COLOR.success,
  moderate: COLOR.warning,
  high: COLOR.danger,
};

function fmt(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function dpt(v: any): string {
  const n = num(v);
  if (n === null) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)} D`;
}

export interface OphthalmoPdfData {
  exam: any;
  patientName: string;
}

@Injectable()
export class OphthalmologyPdfService {
  generate({ exam, patientName }: OphthalmoPdfData): Promise<Buffer> {
    const recommendations: string[] = Array.isArray(exam.recommendations) ? exam.recommendations : [];
    const symptoms: string[] = Array.isArray(exam.symptoms) ? exam.symptoms : [];
    const risk = String(exam.riskLevel ?? 'none');

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({
        size: 'A4',
        margin: 48,
        info: {
          Title: `Laudo Oftalmológico — ${patientName}`,
          Author: 'IcodLife / Sou Doutor',
          Subject: 'Laudo de auto-exame oftalmológico',
          Keywords: 'oftalmologia, laudo, acuidade, refração, astigmatismo',
          Creator: 'IcodLife Digital Health Platform',
        },
      });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 96;

      // ── CABEÇALHO ────────────────────────────────────────────────────────────
      doc.rect(48, 40, W, 62).fill(COLOR.primary);
      doc.fillColor('#fff').fontSize(17).font('Helvetica-Bold')
        .text('LAUDO OFTALMOLÓGICO', 60, 52, { width: W - 120 });
      doc.fontSize(9).font('Helvetica')
        .text('Auto-exame de triagem visual — ICODLIFE / Sou Doutor', 60, 76, { width: W - 120 });
      doc.y = 118;

      // ── 1. IDENTIFICAÇÃO ─────────────────────────────────────────────────────
      this.section(doc, W, '1. Identificação');
      this.grid(doc, W, [
        ['Paciente', patientName],
        ['Data do exame', fmt(exam.completedAt ?? exam.createdAt)],
        ['Idade informada', exam.userAge != null ? `${exam.userAge} anos` : '—'],
        ['Confiança da estimativa', num(exam.confidenceScore) != null ? `${Math.round(num(exam.confidenceScore)! * 100)}%` : '—'],
      ]);

      // ── 2. ACUIDADE VISUAL ───────────────────────────────────────────────────
      this.section(doc, W, '2. Acuidade Visual (Snellen)');
      this.grid(doc, W, [
        ['Olho Direito (OD)', exam.visualAcuityRight ?? '—'],
        ['Olho Esquerdo (OE)', exam.visualAcuityLeft ?? '—'],
      ]);

      // ── 3. ESTIMATIVA REFRATIVA ──────────────────────────────────────────────
      this.section(doc, W, '3. Estimativa Refrativa');
      this.grid(doc, W, [
        ['Esférico estimado OD', dpt(exam.estimatedMyopiaRight)],
        ['Esférico estimado OE', dpt(exam.estimatedMyopiaLeft)],
        ['Astigmatismo estimado OD', dpt(exam.estimatedAstigRight)],
        ['Astigmatismo estimado OE', dpt(exam.estimatedAstigLeft)],
        ['Eixo do astigmatismo OD', exam.astigmatismAxisRight != null ? `${exam.astigmatismAxisRight}°` : '—'],
        ['Eixo do astigmatismo OE', exam.astigmatismAxisLeft != null ? `${exam.astigmatismAxisLeft}°` : '—'],
      ]);

      // ── 4. SENSIBILIDADE AO CONTRASTE ────────────────────────────────────────
      if (num(exam.contrastScoreRight) != null || num(exam.contrastScoreLeft) != null) {
        this.section(doc, W, '4. Sensibilidade ao Contraste');
        this.grid(doc, W, [
          ['Contraste OD', num(exam.contrastScoreRight) != null ? num(exam.contrastScoreRight)!.toFixed(2) : '—'],
          ['Contraste OE', num(exam.contrastScoreLeft) != null ? num(exam.contrastScoreLeft)!.toFixed(2) : '—'],
        ]);
      }

      // ── 5. SINTOMAS RELATADOS ────────────────────────────────────────────────
      if (symptoms.length) {
        this.section(doc, W, '5. Sintomas Relatados');
        this.paragraph(doc, W, symptoms.join(' · '));
      }

      // ── 6. CLASSIFICAÇÃO DE RISCO ────────────────────────────────────────────
      this.section(doc, W, '6. Classificação de Risco');
      this.checkNewPage(doc, 46);
      const rColor = RISK_COLOR[risk] ?? COLOR.text;
      const by = doc.y;
      doc.roundedRect(60, by, 260, 30, 5).fill(rColor);
      doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
        .text((RISK_LABEL[risk] ?? risk).toUpperCase(), 60, by + 9, { width: 260, align: 'center' });
      doc.y = by + 40;

      // ── 7. RESUMO ────────────────────────────────────────────────────────────
      if (exam.reportSummary) {
        this.section(doc, W, '7. Resumo');
        this.paragraph(doc, W, exam.reportSummary);
      }

      // ── 8. RECOMENDAÇÕES ─────────────────────────────────────────────────────
      if (recommendations.length) {
        this.section(doc, W, '8. Recomendações');
        recommendations.forEach((r) => {
          this.checkNewPage(doc, 18);
          doc.fontSize(9).font('Helvetica').fillColor(COLOR.text)
            .text(`• ${r}`, 58, doc.y, { width: W - 20 });
          doc.moveDown(0.3);
        });
      }

      // ── AVISO LEGAL ──────────────────────────────────────────────────────────
      this.checkNewPage(doc, 60);
      doc.moveDown(0.6);
      const ny = doc.y;
      doc.rect(48, ny, W, 50).fill('#FEF9C3').strokeColor('#FDE047').stroke();
      doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold').text('AVISO IMPORTANTE', 58, ny + 7);
      doc.font('Helvetica').fillColor('#78350F').text(
        'Este laudo é resultado de um auto-exame de triagem e NÃO substitui uma consulta oftalmológica presencial. '
        + 'As estimativas são aproximadas. Procure um oftalmologista para diagnóstico e prescrição.',
        58, ny + 20, { width: W - 20 },
      );

      doc.fontSize(8).font('Helvetica').fillColor(COLOR.gray)
        .text(
          `IcodLife / Sou Doutor — Laudo gerado em ${new Date().toLocaleString('pt-BR')} | Documento de triagem`,
          48, doc.page.height - 38, { width: W, align: 'center' },
        );

      doc.end();
    });
  }

  // ── Helpers de layout ───────────────────────────────────────────────────────
  private section(doc: any, W: number, title: string) {
    this.checkNewPage(doc, 50);
    doc.moveDown(0.6);
    doc.rect(48, doc.y, W, 22).fill(COLOR.primary);
    doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold').text(title, 58, doc.y + 6, { width: W - 20 });
    doc.y += 22;
    doc.moveDown(0.3);
  }

  private grid(doc: any, W: number, rows: [string, any][]) {
    const colW = W / 2;
    let col = 0;
    rows.forEach(([label, value]) => {
      this.checkNewPage(doc, 20);
      const x = 58 + col * colW;
      const y = doc.y;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLOR.gray).text(`${label}:`, x, y);
      doc.font('Helvetica').fillColor(COLOR.text)
        .text(value != null && value !== '' ? String(value) : '—', x, y + 11, { width: colW - 24 });
      if (col === 0) { col = 1; doc.y = y; }
      else { col = 0; doc.moveDown(1.9); }
    });
    if (col === 1) doc.moveDown(1.9);
    doc.moveDown(0.3);
  }

  private paragraph(doc: any, W: number, text: string) {
    this.checkNewPage(doc, 20);
    doc.fontSize(9).font('Helvetica').fillColor(COLOR.text).text(text, 58, doc.y, { width: W - 20 });
    doc.moveDown(0.3);
  }

  private checkNewPage(doc: any, minSpace: number) {
    if (doc.y + minSpace > doc.page.height - 56) doc.addPage();
  }
}
