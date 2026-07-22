// apps/api/src/modules/occupational-health/psychosocial-pdf.service.ts
// Geração server-side do Laudo de Riscos Psicossociais Ocupacionais (NR-01) em PDF —
// mesmo padrão visual (pdfkit) já usado no ASO e no laudo oftalmológico. Cada dimensão
// ganha seu próprio mini-gráfico (tendência das respostas na escala Likert), com um
// pré-laudo textual, e ao final um gráfico consolidado com o escore das 9 dimensões.
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

const COLOR = {
  primary:   '#1E1B4B', // índigo escuro institucional da Medicina do Trabalho
  accent:    '#4F46E5',
  danger:    '#DC2626',
  warning:   '#D97706',
  moderate:  '#CA8A04',
  success:   '#16A34A',
  gray:      '#64748B',
  lightGray: '#F1F5F9',
  border:    '#CBD5E1',
  text:      '#1E293B',
  bar:       '#6366F1',
};

const TIER_COLOR: Record<string, string> = {
  baixo: COLOR.success, moderado: COLOR.moderate, alto: COLOR.warning, critico: COLOR.danger,
};
const TIER_LABEL: Record<string, string> = {
  baixo: 'BAIXO', moderado: 'MODERADO', alto: 'ALTO', critico: 'CRÍTICO',
};

function fmt(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export interface PsychosocialPdfData {
  result: any; // shape produzido por OccupationalHealthService.toResponse()
  patientName: string;
}

@Injectable()
export class PsychosocialPdfService {
  generate({ result, patientName }: PsychosocialPdfData): Promise<Buffer> {
    const categories: any[] = Array.isArray(result.categories) ? result.categories : [];
    const topRisks: string[] = Array.isArray(result.topRisks) ? result.topRisks : [];
    const recommendations: string[] = Array.isArray(result.recommendations) ? result.recommendations : [];
    const tier = String(result.overallTier ?? 'baixo');

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({
        size: 'A4',
        margin: 48,
        info: {
          Title: `Laudo de Riscos Psicossociais — ${patientName}`,
          Author: 'IcodLife / Sou Doutor',
          Subject: 'Triagem de Riscos Psicossociais Ocupacionais (NR-01)',
          Keywords: 'nr-01, psicossocial, pgr, pcmso, saude ocupacional',
          Creator: 'IcodLife Digital Health Platform',
        },
      });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 96;

      // ── CABEÇALHO ────────────────────────────────────────────────────────────
      doc.rect(48, 40, W, 62).fill(COLOR.primary);
      doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold')
        .text('LAUDO DE RISCOS PSICOSSOCIAIS OCUPACIONAIS', 60, 50, { width: W - 120 });
      doc.fontSize(9).font('Helvetica')
        .text('NR-01, item 1.5.1.6.2 (Portaria MTE nº 1.419/2024) — ICODLIFE / Sou Doutor', 60, 78, { width: W - 120 });
      doc.y = 118;

      // ── 1. IDENTIFICAÇÃO ─────────────────────────────────────────────────────
      this.section(doc, W, '1. Identificação');
      this.grid(doc, W, [
        ['Trabalhador', patientName],
        ['Data da avaliação', fmt(result.createdAt)],
        ['Setor', result.sector || '—'],
        ['Cargo/Função', result.role || '—'],
        ['Regime de trabalho', result.workRegime || '—'],
        ['Horas extras semanais (aprox.)', result.weeklyOvertimeHours != null ? `${result.weeklyOvertimeHours}h` : '—'],
      ]);

      // ── 2. ESCORE GERAL ──────────────────────────────────────────────────────
      this.section(doc, W, '2. Escore Geral de Risco Psicossocial');
      this.checkNewPage(doc, 46);
      const gColor = TIER_COLOR[tier] ?? COLOR.text;
      const gy = doc.y;
      doc.roundedRect(60, gy, 260, 32, 5).fill(gColor);
      doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold')
        .text(`${result.overallScore ?? '—'}/100 — ${TIER_LABEL[tier] ?? tier.toUpperCase()}`, 60, gy + 10, { width: 260, align: 'center' });
      doc.y = gy + 44;

      // ── 3. TENDÊNCIA DAS RESPOSTAS POR DIMENSÃO (um mini-gráfico por item avaliado) ──
      this.section(doc, W, '3. Tendência das Respostas por Dimensão Avaliada');
      this.paragraph(doc, W,
        'Cada dimensão abaixo mostra a proporção das respostas do trabalhador na escala Likert '
        + '(Nunca · Raramente · Às vezes · Frequentemente · Sempre), seguida de um pré-laudo interpretativo.');

      categories.forEach((cat: any, i: number) => {
        this.checkNewPage(doc, 130);
        doc.moveDown(0.5);
        const cy = doc.y;
        const tColor = TIER_COLOR[cat.tier] ?? COLOR.text;

        // título da dimensão + badge de score
        doc.fillColor(COLOR.text).fontSize(10).font('Helvetica-Bold')
          .text(`${i + 1}. ${cat.label}`, 58, cy, { width: W - 140 });
        doc.roundedRect(58 + W - 140, cy - 2, 80, 16, 3).fill(tColor);
        doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold')
          .text(`${cat.score0to100}/100`, 58 + W - 140, cy + 2, { width: 80, align: 'center' });
        doc.y = cy + 16;
        doc.fontSize(7.5).font('Helvetica').fillColor(COLOR.gray)
          .text(cat.nrReference ?? '', 58, doc.y, { width: W - 20 });
        doc.moveDown(0.4);

        // mini-gráfico de barras horizontais — distribuição da escala Likert
        const dist = Array.isArray(cat.distribution) ? cat.distribution : [];
        this.likertBars(doc, W, dist);

        // pré-laudo da dimensão
        doc.fontSize(8.5).font('Helvetica').fillColor(COLOR.text)
          .text(cat.miniLaudo ?? '', 58, doc.y, { width: W - 20 });
        doc.moveDown(0.5);
        doc.rect(48, doc.y, W, 0.5).fill(COLOR.border);
        doc.moveDown(0.4);
      });

      // ── 4. GRÁFICO FINAL CONSOLIDADO ─────────────────────────────────────────
      this.section(doc, W, '4. Gráfico Final Consolidado — Visão Geral das 9 Dimensões');
      this.paragraph(doc, W, 'Escore de risco (0–100) de cada dimensão, embasado nos pré-laudos acima, do maior para o menor risco.');
      this.checkNewPage(doc, categories.length * 20 + 20);
      categories.forEach((cat: any) => {
        this.checkNewPage(doc, 20);
        const rowY = doc.y;
        const tColor = TIER_COLOR[cat.tier] ?? COLOR.bar;
        doc.fontSize(8).font('Helvetica').fillColor(COLOR.text)
          .text(cat.label, 58, rowY, { width: 170 });
        const barX = 58 + 175;
        const barMaxW = W - 175 - 60;
        const barW = Math.max(2, (cat.score0to100 / 100) * barMaxW);
        doc.rect(barX, rowY, barMaxW, 10).fill(COLOR.lightGray);
        doc.rect(barX, rowY, barW, 10).fill(tColor);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLOR.text)
          .text(`${cat.score0to100}`, barX + barMaxW + 6, rowY, { width: 50 });
        doc.y = rowY + 16;
      });

      // ── 5. PRINCIPAIS RISCOS ─────────────────────────────────────────────────
      if (topRisks.length) {
        this.section(doc, W, '5. Principais Riscos Identificados (Alto/Crítico)');
        topRisks.forEach((r) => {
          this.checkNewPage(doc, 16);
          doc.fontSize(9).font('Helvetica').fillColor(COLOR.danger).text(`• ${r}`, 58, doc.y, { width: W - 20 });
          doc.moveDown(0.25);
        });
      }

      // ── 6. RECOMENDAÇÕES ─────────────────────────────────────────────────────
      if (recommendations.length) {
        this.section(doc, W, '6. Recomendações');
        recommendations.forEach((r) => {
          this.checkNewPage(doc, 18);
          doc.fontSize(9).font('Helvetica').fillColor(COLOR.text).text(`• ${r}`, 58, doc.y, { width: W - 20 });
          doc.moveDown(0.3);
        });
      }

      // ── 7. LAUDO NARRATIVO ───────────────────────────────────────────────────
      if (result.laudo) {
        this.section(doc, W, '7. Laudo Narrativo Completo');
        this.paragraph(doc, W, result.laudo);
      }

      // ── AVISO LEGAL ──────────────────────────────────────────────────────────
      this.checkNewPage(doc, 70);
      doc.moveDown(0.6);
      const ny = doc.y;
      doc.rect(48, ny, W, 60).fill('#FEF9C3').strokeColor('#FDE047').stroke();
      doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold').text('AVISO IMPORTANTE', 58, ny + 7);
      doc.font('Helvetica').fillColor('#78350F').text(
        result.disclaimer ?? '',
        58, ny + 20, { width: W - 20 },
      );

      doc.fontSize(8).font('Helvetica').fillColor(COLOR.gray)
        .text(
          `IcodLife / Sou Doutor — Laudo gerado em ${new Date().toLocaleString('pt-BR')} | Documento confidencial (LGPD)`,
          48, doc.page.height - 38, { width: W, align: 'center' },
        );

      doc.end();
    });
  }

  // ── Mini-gráfico: barras horizontais da distribuição Likert de uma dimensão ─
  private likertBars(doc: any, W: number, distribution: { value: number; label: string; count: number; pct: number }[]) {
    const rowH = 12;
    const labelW = 95;
    const barMaxW = W - labelW - 60;
    distribution.forEach((b) => {
      this.checkNewPage(doc, rowH + 2);
      const y = doc.y;
      doc.fontSize(7.5).font('Helvetica').fillColor(COLOR.gray).text(b.label, 58, y + 1, { width: labelW - 6 });
      const barX = 58 + labelW;
      const barW = Math.max(1, (b.pct / 100) * barMaxW);
      doc.rect(barX, y, barMaxW, 8).fill(COLOR.lightGray);
      doc.rect(barX, y, barW, 8).fill(COLOR.bar);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLOR.text)
        .text(`${b.pct}%`, barX + barMaxW + 6, y, { width: 46 });
      doc.y = y + rowH;
    });
    doc.moveDown(0.2);
  }

  // ── Helpers de layout (mesmo padrão do ASO / laudo oftalmológico) ───────────
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
