// apps/api/src/modules/aso/aso-pdf.service.ts
// Sprint 19 — Geração server-side do ASO (NR-07) em PDF, com assinatura digital HMAC + QR de validação.
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

const COLOR = {
  primary:   '#7B1E1E', // vinho institucional do ASO
  accent:    '#002B5C',
  danger:    '#DC2626',
  warning:   '#D97706',
  success:   '#16A34A',
  gray:      '#64748B',
  lightGray: '#F1F5F9',
  border:    '#CBD5E1',
  text:      '#1E293B',
};

const EXAM_TYPE_LABEL: Record<string, string> = {
  admissional: 'Admissional',
  periodico: 'Periódico',
  retorno: 'Retorno ao Trabalho',
  mudanca_funcao: 'Mudança de Função',
  demissional: 'Demissional',
};

const RESULT_LABEL: Record<string, string> = {
  apto: 'APTO',
  apto_restricoes: 'APTO COM RESTRIÇÕES',
  inapto: 'INAPTO',
};

const RESULT_COLOR: Record<string, string> = {
  apto: COLOR.success,
  apto_restricoes: COLOR.warning,
  inapto: COLOR.danger,
};

const PSY_TIER_COLOR: Record<string, string> = {
  baixo: COLOR.success, moderado: COLOR.warning, alto: COLOR.warning, critico: COLOR.danger,
};
const PSY_TIER_LABEL: Record<string, string> = {
  baixo: 'BAIXO', moderado: 'MODERADO', alto: 'ALTO', critico: 'CRÍTICO',
};

function fmt(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export interface AsoPdfData {
  aso: any;
  verifyUrl: string;
  qrBuffer: Buffer;
}

@Injectable()
export class AsoPdfService {
  generate({ aso, verifyUrl, qrBuffer }: AsoPdfData): Promise<Buffer> {
    const risks: string[] = Array.isArray(aso.risks) ? aso.risks : [];
    const exams: string[] = Array.isArray(aso.complementaryExams)
      ? aso.complementaryExams.map((e: any) => (typeof e === 'string' ? e : e?.name)).filter(Boolean)
      : [];

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({
        size: 'A4',
        margin: 48,
        info: {
          Title: `ASO — ${aso.workerName}`,
          Author: 'IcodLife / Sou Doutor',
          Subject: 'Atestado de Saúde Ocupacional (NR-07)',
          Keywords: 'aso, saúde ocupacional, nr-07, medicina do trabalho',
          Creator: 'IcodLife Digital Health Platform',
        },
      });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 96; // margens de 48

      // ── CABEÇALHO ────────────────────────────────────────────────────────────
      doc.rect(48, 40, W, 62).fill(COLOR.primary);
      doc.fillColor('#fff').fontSize(17).font('Helvetica-Bold')
        .text('ATESTADO DE SAÚDE OCUPACIONAL', 60, 52, { width: W - 120 });
      const emissora = aso.clinic?.nomeFantasia || aso.clinic?.razaoSocial;
      doc.fontSize(9).font('Helvetica')
        .text(
          emissora
            ? `Emitido por ${emissora} — conforme a NR-07 — ICODLIFE / Sou Doutor`
            : 'Documento emitido conforme a NR-07 — ICODLIFE / Sou Doutor',
          60, 76, { width: W - 120 },
        );
      if (aso.status === 'canceled') {
        doc.fillColor('#FECACA').fontSize(10).font('Helvetica-Bold')
          .text('*** CANCELADO ***', 60, 88, { width: W - 120 });
      }

      doc.y = 118;

      // ── 0. CLÍNICA EMISSORA (só quando o ASO tem clínica vinculada) ──────────
      if (aso.clinic) {
        this.section(doc, W, '0. Clínica / Estabelecimento Emissor');
        this.grid(doc, W, [
          ['Nome', aso.clinic.nomeFantasia || aso.clinic.razaoSocial],
          ['CNPJ', aso.clinic.cnpj],
          ['Endereço', [aso.clinic.logradouro, aso.clinic.numero, aso.clinic.bairro, aso.clinic.cidade, aso.clinic.estado].filter(Boolean).join(', '), true],
          ['Telefone', aso.clinic.telefone],
        ]);
      }

      // ── 1. EMPRESA ───────────────────────────────────────────────────────────
      this.section(doc, W, '1. Dados da Empresa');
      this.grid(doc, W, [
        ['Razão Social', aso.companyName],
        ['CNPJ', aso.companyCnpj],
        ['Endereço', aso.companyAddress, true],
        ['Telefone', aso.companyPhone],
      ]);

      // ── 2. TRABALHADOR ───────────────────────────────────────────────────────
      this.section(doc, W, '2. Dados do Trabalhador');
      this.grid(doc, W, [
        ['Nome', aso.workerName],
        ['CPF', aso.workerCpf],
        ['RG', aso.workerRg],
        ['Nascimento', fmt(aso.workerBirthDate)],
        ['Sexo', aso.workerSex],
        ['Matrícula', aso.workerRegistration],
        ['Cargo', aso.workerRole],
        ['Setor', aso.workerSector],
        ['Admissão', fmt(aso.admissionDate)],
      ]);

      // ── 3. EXAME ─────────────────────────────────────────────────────────────
      this.section(doc, W, `3. Tipo de Exame — Data: ${fmt(aso.examDate)}`);
      this.checkboxRow(doc, W, Object.entries(EXAM_TYPE_LABEL).map(([k, label]) => ({
        label,
        checked: aso.examType === k,
      })));

      // ── 4. FUNÇÃO ────────────────────────────────────────────────────────────
      this.section(doc, W, '4. Função Exercida');
      this.paragraph(doc, W, aso.jobDescription || '—');

      // ── 5. RISCOS ────────────────────────────────────────────────────────────
      this.section(doc, W, '5. Riscos Ocupacionais');
      if (risks.length) {
        this.checkboxRow(doc, W, risks.map((r) => ({ label: r, checked: true })));
      } else {
        this.paragraph(doc, W, 'Nenhum risco informado.');
      }

      // ── 6. EXAMES COMPLEMENTARES ─────────────────────────────────────────────
      this.section(doc, W, '6. Exames Complementares');
      if (exams.length) {
        this.checkboxRow(doc, W, exams.map((e) => ({ label: e, checked: true })));
      } else {
        this.paragraph(doc, W, 'Nenhum exame complementar informado.');
      }

      // ── 6.1 RISCOS PSICOSSOCIAIS (NR-01) — só quando o paciente compartilhou o laudo ──
      if (aso.psychosocialSnapshot) {
        const psy = aso.psychosocialSnapshot;
        const psyTier = String(psy.overallTier ?? 'baixo');
        this.section(doc, W, '6.1 Riscos Psicossociais (NR-01) — Laudo Compartilhado pelo Paciente');
        this.checkNewPage(doc, 40);
        const py = doc.y;
        doc.roundedRect(60, py, 200, 26, 4).fill(PSY_TIER_COLOR[psyTier] ?? COLOR.text);
        doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
          .text(`${psy.overallScore ?? '—'}/100 — ${PSY_TIER_LABEL[psyTier] ?? psyTier.toUpperCase()}`, 60, py + 7, { width: 200, align: 'center' });
        doc.y = py + 34;
        doc.fontSize(8).font('Helvetica').fillColor(COLOR.gray)
          .text(`Avaliação realizada em ${fmt(psy.assessedAt)} — triagem de percepção do trabalhador (não é diagnóstico clínico individual).`, 58, doc.y, { width: W - 20 });
        doc.moveDown(0.3);
        const risks: string[] = Array.isArray(psy.topRisks) ? psy.topRisks : [];
        if (risks.length) {
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLOR.text).text('Principais fatores de risco identificados:', 58, doc.y);
          doc.font('Helvetica').text(risks.join('; '), { width: W - 20 });
        } else {
          doc.fontSize(8.5).font('Helvetica').fillColor(COLOR.text).text('Nenhum fator em nível alto ou crítico identificado nesta triagem.', 58, doc.y, { width: W - 20 });
        }
        doc.moveDown(0.4);
      }

      // ── 7. PARECER MÉDICO ────────────────────────────────────────────────────
      this.section(doc, W, '7. Parecer Médico');
      this.checkNewPage(doc, 46);
      const rColor = RESULT_COLOR[aso.result] ?? COLOR.text;
      const rLabel = RESULT_LABEL[aso.result] ?? aso.result;
      const by = doc.y;
      doc.roundedRect(60, by, 200, 30, 5).fill(rColor);
      doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold')
        .text(rLabel, 60, by + 9, { width: 200, align: 'center' });
      doc.y = by + 40;
      if (aso.restrictions) {
        this.labelValue(doc, W, 'Restrições', aso.restrictions, COLOR.warning);
      }
      if (aso.observations) {
        this.labelValue(doc, W, 'Observações', aso.observations, COLOR.text);
      }

      // ── 8. ASSINATURAS ───────────────────────────────────────────────────────
      this.checkNewPage(doc, 90);
      doc.moveDown(1.4);
      const sy = doc.y;
      const half = W / 2;
      doc.moveTo(60, sy).lineTo(60 + half - 40, sy).strokeColor('#333').stroke();
      doc.moveTo(60 + half, sy).lineTo(60 + half + half - 40, sy).strokeColor('#333').stroke();
      doc.fillColor(COLOR.text).fontSize(9).font('Helvetica-Bold')
        .text(aso.doctorName || 'Médico Examinador', 60, sy + 4, { width: half - 40, align: 'center' });
      doc.font('Helvetica').fillColor(COLOR.gray)
        .text(
          `CRM ${aso.doctorCrm ?? ''}/${aso.doctorUf ?? ''}${aso.doctorSpecialty ? ' — ' + aso.doctorSpecialty : ''}`,
          60, sy + 16, { width: half - 40, align: 'center' },
        )
        .text('Médico Examinador', 60, sy + 28, { width: half - 40, align: 'center' });
      doc.fillColor(COLOR.text).font('Helvetica-Bold')
        .text('Ciência do Trabalhador', 60 + half, sy + 4, { width: half - 40, align: 'center' });
      doc.font('Helvetica').fillColor(COLOR.gray)
        .text(aso.workerName || '', 60 + half, sy + 16, { width: half - 40, align: 'center' });

      // ── PÁGINA DE VALIDAÇÃO / ASSINATURA DIGITAL ─────────────────────────────
      doc.addPage();
      const hy = 48;
      doc.rect(48, hy, W, 54).fill(COLOR.accent);
      doc.fillColor('#fff').fontSize(15).font('Helvetica-Bold')
        .text('Assinatura Digital & Validação', 60, hy + 11);
      doc.fontSize(8).font('Helvetica')
        .text('Este ASO foi gerado e assinado digitalmente pela plataforma IcodLife.', 60, hy + 33, { width: W - 130 });

      const qrSize = 92;
      doc.image(qrBuffer, 48 + W - qrSize, hy - 2, { width: qrSize, height: qrSize });

      doc.y = hy + 78;
      this.grid(doc, W, [
        ['Documento', `ASO — ${EXAM_TYPE_LABEL[aso.examType] ?? aso.examType}`],
        ['Trabalhador', aso.workerName],
        ['Empresa', aso.companyName],
        ['Parecer', rLabel],
        ['Emitido em', aso.signedAt ? new Date(aso.signedAt).toLocaleString('pt-BR') : fmt(aso.examDate)],
        ['Válido até', aso.signatureExpiresAt ? new Date(aso.signatureExpiresAt).toLocaleString('pt-BR') : '—'],
        ['Situação', aso.status === 'canceled' ? 'CANCELADO' : 'Válido'],
        ['Hash SHA-256', aso.signatureHash ?? '—', true],
      ]);

      doc.moveDown(0.5);
      doc.rect(48, doc.y, W, 1).fill(COLOR.border);
      doc.moveDown(0.5);

      doc.fillColor(COLOR.accent).fontSize(10).font('Helvetica-Bold')
        .text('Como verificar a autenticidade deste documento:', 48, doc.y);
      doc.moveDown(0.3);
      [
        '1. Aponte a câmera do celular para o QR Code acima.',
        '2. Acesse o link de verificação exibido.',
        '3. O sistema confirmará se o ASO é autêntico, válido e não foi cancelado.',
        `4. URL direta: ${verifyUrl}`,
      ].forEach((s) => {
        this.checkNewPage(doc, 18);
        doc.fontSize(9).font('Helvetica').fillColor(COLOR.text).text(s, 58, doc.y, { width: W - 20 });
        doc.moveDown(0.3);
      });

      doc.moveDown(0.4);
      const ny = doc.y;
      doc.rect(48, ny, W, 46).fill('#FEF9C3').strokeColor('#FDE047').stroke();
      doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold').text('AVISO LEGAL', 58, ny + 7);
      doc.font('Helvetica').fillColor('#78350F').text(
        'O ASO é documento médico ocupacional confidencial (NR-07). A assinatura digital garante a integridade e '
        + 'autenticidade do documento no momento da geração. Sua divulgação não autorizada pode violar a LGPD (Lei 13.709/2018).',
        58, ny + 20, { width: W - 20 },
      );

      doc.fontSize(8).font('Helvetica').fillColor(COLOR.gray)
        .text(
          `IcodLife / Sou Doutor — ASO gerado digitalmente em ${new Date().toLocaleString('pt-BR')} | Uso ocupacional confidencial`,
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

  private grid(doc: any, W: number, rows: [string, any, boolean?][]) {
    const colW = W / 2;
    let col = 0;
    rows.forEach(([label, value, full]) => {
      if (full && col === 1) { col = 0; doc.moveDown(0.9); }
      this.checkNewPage(doc, 20);
      const x = 58 + col * colW;
      const y = doc.y;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(COLOR.gray).text(`${label}:`, x, y);
      doc.font('Helvetica').fillColor(COLOR.text)
        .text(value ? String(value) : '—', x, y + 11, { width: (full ? W : colW) - 24 });
      if (full) { col = 0; doc.y = y + 26; }
      else if (col === 0) { col = 1; doc.y = y; }
      else { col = 0; doc.moveDown(1.9); }
    });
    if (col === 1) doc.moveDown(1.9);
    doc.moveDown(0.3);
  }

  private checkboxRow(doc: any, W: number, items: { label: string; checked: boolean }[]) {
    const perRow = 3;
    const colW = W / perRow;
    let i = 0;
    while (i < items.length) {
      this.checkNewPage(doc, 16);
      const y = doc.y;
      for (let c = 0; c < perRow && i < items.length; c++, i++) {
        const it = items[i];
        doc.fontSize(9).font('Helvetica').fillColor(it.checked ? COLOR.text : COLOR.gray)
          .text(`${it.checked ? '[X]' : '[  ]'} ${it.label}`, 58 + c * colW, y, { width: colW - 8 });
      }
      doc.y = y + 15;
    }
    doc.moveDown(0.3);
  }

  private paragraph(doc: any, W: number, text: string) {
    this.checkNewPage(doc, 20);
    doc.fontSize(9).font('Helvetica').fillColor(COLOR.text).text(text, 58, doc.y, { width: W - 20 });
    doc.moveDown(0.3);
  }

  private labelValue(doc: any, W: number, label: string, value: string, color: string) {
    this.checkNewPage(doc, 24);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(color).text(`${label}: `, 58, doc.y, { continued: true });
    doc.font('Helvetica').fillColor(COLOR.text).text(value, { width: W - 30 });
    doc.moveDown(0.3);
  }

  private checkNewPage(doc: any, minSpace: number) {
    if (doc.y + minSpace > doc.page.height - 56) doc.addPage();
  }
}
