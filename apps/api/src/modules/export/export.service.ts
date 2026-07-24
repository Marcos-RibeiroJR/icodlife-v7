// apps/api/src/modules/export/export.service.ts
// Sprint 12 — Prontuário PDF exportável
// Sprint 19 — Assinatura digital HMAC-SHA256 + QR de verificação

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { randomUUID } from 'crypto';

// ── Helpers de cor ────────────────────────────────────────────────────────────
const COLOR = {
  primary:   '#002B5C',
  accent:    '#00A896',
  danger:    '#DC2626',
  warning:   '#D97706',
  success:   '#16A34A',
  gray:      '#64748B',
  lightGray: '#F1F5F9',
  border:    '#E2E8F0',
  text:      '#1E293B',
};

const BLOOD_LABEL: Record<string, string> = {
  A_PLUS:'A+', A_MINUS:'A-', B_PLUS:'B+', B_MINUS:'B-',
  AB_PLUS:'AB+', AB_MINUS:'AB-', O_PLUS:'O+', O_MINUS:'O-', unknown:'N/D',
};

const CONTEXT_LABEL: Record<string, string> = {
  fasting:'Jejum', pre_meal:'Pré-refeição', post_meal:'Pós-refeição',
  bedtime:'Antes de dormir', random:'Aleatório', post_exercise:'Pós-exercício',
};

function fmt(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function age(dob: Date): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// ── Assinatura digital ────────────────────────────────────────────────────────

export interface SignatureInfo {
  token:     string;   // token completo para verificação
  hash:      string;   // SHA-256 do payload
  issuedAt:  string;   // ISO
  expiresAt: string;   // ISO (1 ano)
  nonce:     string;
}

export function createDocumentSignature(userId: string, userName: string): SignatureInfo {
  const secret    = process.env.JWT_SECRET ?? 'icodlife-prontuario-secret';
  const nonce     = randomUUID();
  const issuedAt  = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 365 * 86400_000).toISOString();

  const payload = { sub: userId, name: userName, iat: issuedAt, exp: expiresAt, nonce };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig     = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const token   = `${encoded}.${sig}`;
  const hash    = crypto.createHash('sha256').update(token).digest('hex');

  return { token, hash, issuedAt, expiresAt, nonce };
}

export function verifyDocumentToken(token: string): {
  valid: boolean; sub?: string; name?: string; issuedAt?: string; expiresAt?: string; reason?: string;
} {
  try {
    const secret = process.env.JWT_SECRET ?? 'icodlife-prontuario-secret';
    const parts  = token.split('.');
    if (parts.length !== 2) return { valid: false, reason: 'Formato inválido' };
    const [encoded, sig] = parts;
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    if (sig !== expected) return { valid: false, reason: 'Assinatura inválida' };
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (new Date(payload.exp) < new Date()) return { valid: false, reason: 'Documento expirado' };
    return { valid: true, sub: payload.sub, name: payload.name, issuedAt: payload.iat, expiresAt: payload.exp };
  } catch {
    return { valid: false, reason: 'Token malformado' };
  }
}

// ── Serviço ───────────────────────────────────────────────────────────────────

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async generateProntuarioPdf(userId: string, requesterId: string): Promise<Buffer> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Paciente não encontrado');

    // Buscar todos os dados em paralelo
    const [medications, examResults, bpReadings, glucoseReadings, hba1cReadings,
           appointments, vaccines, bodyMetrics] = await Promise.all([
      this.prisma.medication.findMany({
        where: { userId, isActive: true }, orderBy: { createdAt: 'desc' }, take: 20,
      }),
      this.prisma.examResult.findMany({
        where: { userId }, orderBy: { examDate: 'desc' }, take: 5,
        include: { items: { take: 10, orderBy: { marker: 'asc' } } },
      }),
      this.prisma.bloodPressureReading.findMany({
        where: { userId }, orderBy: { measuredAt: 'desc' }, take: 10,
      }),
      this.prisma.glucoseReading.findMany({
        where: { userId }, orderBy: { measuredAt: 'desc' }, take: 10,
      }).catch(() => [] as any[]),
      this.prisma.hbA1cReading.findMany({
        where: { userId }, orderBy: { measuredAt: 'desc' }, take: 5,
      }).catch(() => [] as any[]),
      this.prisma.appointment.findMany({
        where: { userId }, orderBy: { appointmentAt: 'desc' }, take: 5,
      }),
      this.prisma.vaccinationRecord.findMany({
        where: { userId, status: 'completed' }, include: { vaccine: true },
        orderBy: { appliedAt: 'desc' }, take: 10,
      }),
      this.prisma.bodyMetric.findMany({
        where: { userId }, orderBy: { measuredAt: 'desc' }, take: 3,
      }),
    ]);

    const ophthalmologyExams = await this.prisma.ophthalmologyExam.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: 3,
    }).catch(() => [] as any[]);

    // ── Assinatura digital (pré-computada antes de criar o doc) ───────────────
    const sig        = createDocumentSignature(userId, user.fullName);
    const apiUrl     = process.env.API_URL ?? 'https://api.icodlife.com';
    const verifyUrl  = `${apiUrl}/api/v1/prontuario/verify/${sig.token}`;
    const qrDataUrl  = await QRCode.toDataURL(verifyUrl, {
      width: 120, margin: 1,
      color: { dark: '#002B5C', light: '#FFFFFF' },
    });
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({
        size: 'A4', margin: 50,
        info: {
          Title:    `Prontuário — ${user.fullName}`,
          Author:   'IcodLife',
          Subject:  'Prontuário Médico Digital',
          Keywords: 'saúde, prontuário, icodlife',
          Creator:  'IcodLife Digital Health Platform',
        },
      });

      doc.on('data',  (chunk: Buffer) => chunks.push(chunk));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 100;

      // ── CABEÇALHO ──────────────────────────────────────────────────────────
      doc.rect(50, 40, W, 80).fill(COLOR.primary);
      doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('IcodLife', 65, 55);
      doc.fontSize(10).font('Helvetica').text('Prontuário Médico Digital', 65, 82);
      doc.fontSize(10).font('Helvetica')
        .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 65, 100, { align: 'right', width: W - 30 });

      // ── DADOS DO PACIENTE ──────────────────────────────────────────────────
      doc.y = 140;
      this.section(doc, W, 'Dados do Paciente');

      const patientData: [string, string][] = [
        ['Nome completo',      user.fullName],
        ['Data de nascimento', `${fmt(user.dateOfBirth)} (${age(user.dateOfBirth as Date)} anos)`],
        ['Sexo',               user.gender === 'male' ? 'Masculino' : user.gender === 'female' ? 'Feminino' : 'Outro'],
        ['Tipo sanguíneo',     BLOOD_LABEL[user.bloodType as string] ?? '—'],
        ['Doador de órgãos',   (user as any).isDonor ? 'Sim' : 'Não'],
        ['ICODE',              (user as any).icode ?? '—'],
        ['Telefone',           (user as any).phone ?? '—'],
        ['Estado',             (user as any).stateCode ?? '—'],
      ];
      this.twoColTable(doc, W, patientData);

      if ((user as any).allergies?.length > 0) {
        this.labelValue(doc, W, 'Alergias', (user as any).allergies.join(' • '), COLOR.danger);
      }
      if ((user as any).chronicConditions?.length > 0) {
        this.labelValue(doc, W, 'Condições Crônicas', (user as any).chronicConditions.join(' • '), COLOR.warning);
      }
      if ((user as any).emergencyContactName) {
        this.labelValue(doc, W, 'Contato de Emergência',
          `${(user as any).emergencyContactName} (${(user as any).emergencyContactRel ?? 'familiar'}) — ${(user as any).emergencyContactPhone ?? ''}`,
          COLOR.text);
      }

      // ── MÉTRICAS CORPORAIS ─────────────────────────────────────────────────
      if (bodyMetrics.length > 0) {
        this.section(doc, W, 'Métricas Corporais');
        const bm = bodyMetrics[0];
        const bmData: [string, string][] = [
          ['Data', fmt(bm.measuredAt)],
          ...(bm.weightKg  ? [['Peso',            `${bm.weightKg} kg`] as [string,string]] : []),
          ...(bm.heightCm  ? [['Altura',           `${bm.heightCm} cm`] as [string,string]] : []),
          ...(bm.bmi       ? [['IMC',              `${Number(bm.bmi).toFixed(1)} — ${bm.bmiCategory ?? ''}`] as [string,string]] : []),
          ...(bm.bodyFatPct? [['Gordura corporal', `${bm.bodyFatPct}%`] as [string,string]] : []),
        ];
        this.twoColTable(doc, W, bmData);
      }

      // ── MEDICAMENTOS ATIVOS ────────────────────────────────────────────────
      if (medications.length > 0) {
        this.section(doc, W, 'Medicamentos Ativos');
        medications.forEach((m, i) => {
          this.checkNewPage(doc, 40);
          const y = doc.y;
          doc.rect(50, y, W, 32).fill(i % 2 === 0 ? COLOR.lightGray : '#fff').stroke(COLOR.border);
          doc.fillColor(COLOR.text).fontSize(10).font('Helvetica-Bold').text(m.name, 60, y + 8, { width: W * 0.4 });
          doc.font('Helvetica').fontSize(9).fillColor(COLOR.gray)
            .text(m.dosage ?? '—',              W * 0.4 + 50, y + 8)
            .text(m.frequency,                  W * 0.6 + 50, y + 8)
            .text(m.prescribingDoctor ?? '—',   W * 0.8 + 50, y + 8);
          doc.y = y + 32;
        });
        doc.moveDown(0.5);
      }

      // ── PRESSÃO ARTERIAL ──────────────────────────────────────────────────
      if (bpReadings.length > 0) {
        this.section(doc, W, 'Pressão Arterial (Últimas Medições)');
        const bpRows = bpReadings.slice(0, 8).map(r => [
          fmt(r.measuredAt),
          `${r.systolic}/${r.diastolic} mmHg`,
          r.pulse ? `${r.pulse} bpm` : '—',
          r.classification,
        ]);
        this.simpleTable(doc, W, ['Data', 'Pressão', 'Pulso', 'Classificação'], bpRows);
      }

      // ── GLICEMIA ──────────────────────────────────────────────────────────
      if (glucoseReadings.length > 0) {
        this.section(doc, W, 'Glicemia (Últimas Medições)');
        const gRows = glucoseReadings.slice(0, 8).map((r: any) => [
          fmt(r.measuredAt),
          `${Number(r.value).toFixed(0)} mg/dL`,
          CONTEXT_LABEL[r.context] ?? r.context,
          r.alertLevel ?? '—',
        ]);
        this.simpleTable(doc, W, ['Data', 'Valor', 'Contexto', 'Nível'], gRows);
      }

      if (hba1cReadings.length > 0) {
        this.checkNewPage(doc, 60);
        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR.text)
          .text('HbA1c (histórico):', 50, doc.y, { underline: true });
        doc.moveDown(0.3);
        hba1cReadings.forEach((h: any) => {
          doc.fontSize(9).font('Helvetica').fillColor(COLOR.gray)
            .text(`${fmt(h.measuredAt)}: ${Number(h.value).toFixed(1)}% ${h.labName ? `— ${h.labName}` : ''}`, 60, doc.y);
          doc.moveDown(0.2);
        });
        doc.moveDown(0.5);
      }

      // ── EXAMES RECENTES ───────────────────────────────────────────────────
      if (examResults.length > 0) {
        this.section(doc, W, 'Exames Recentes');
        examResults.forEach(exam => {
          this.checkNewPage(doc, 80);
          doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR.primary)
            .text(`${fmt(exam.examDate)} — ${exam.labName ?? 'Laboratório'} (${exam.examType})`, 50, doc.y);
          doc.moveDown(0.3);
          if (exam.aiSummary) {
            doc.fontSize(9).font('Helvetica-Oblique').fillColor(COLOR.gray)
              .text(`IA: ${exam.aiSummary}`, 60, doc.y, { width: W - 20 });
            doc.moveDown(0.3);
          }
          exam.items.forEach(item => {
            this.checkNewPage(doc, 20);
            const color  = item.status === 'high' || item.status === 'critical_high' ? COLOR.danger
                         : item.status === 'low'  || item.status === 'critical_low'  ? COLOR.warning
                         : COLOR.success;
            const symbol = item.status === 'normal' ? 'OK' : item.status === 'high' ? '(alto)' : item.status === 'low' ? '(baixo)' : '(!)';
            doc.fontSize(9).font('Helvetica').fillColor(COLOR.text)
              .text(`  ${symbol} ${item.marker}:`, 60, doc.y, { continued: true, width: W * 0.45 });
            doc.fillColor(color).font('Helvetica-Bold').text(` ${item.value} ${item.unit}`, { continued: true });
            doc.fillColor(COLOR.gray).font('Helvetica').text(`  (ref: ${item.refMin}–${item.refMax})`);
            doc.moveDown(0.2);
          });
          doc.moveDown(0.5);
        });
      }

      // ── OFTALMOLOGIA ─────────────────────────────────────────────────────
      if (ophthalmologyExams.length > 0) {
        this.section(doc, W, 'Oftalmologia (Auto-exame)');
        const RISK_PT: Record<string, string> = { none: 'Sem alteracao', low: 'Baixo', moderate: 'Moderado', high: 'Alto' };
        const dptO = (v: any) => { const n = Number(v); return Number.isFinite(n) ? `${n > 0 ? '+' : ''}${n.toFixed(2)}D` : '\u2014'; };
        ophthalmologyExams.forEach((o: any) => {
          this.checkNewPage(doc, 50);
          doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR.primary)
            .text(`${fmt(o.completedAt ?? o.createdAt)} \u2014 Risco: ${RISK_PT[String(o.riskLevel)] ?? o.riskLevel}`, 50, doc.y);
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica').fillColor(COLOR.text)
            .text(`AV: OD ${o.visualAcuityRight ?? '\u2014'} / OE ${o.visualAcuityLeft ?? '\u2014'}   |   Esferico: OD ${dptO(o.estimatedMyopiaRight)} / OE ${dptO(o.estimatedMyopiaLeft)}   |   Astig.: OD ${dptO(o.estimatedAstigRight)} / OE ${dptO(o.estimatedAstigLeft)}`, 60, doc.y, { width: W - 20 });
          doc.moveDown(0.3);
          if (o.reportSummary) {
            doc.fontSize(9).font('Helvetica-Oblique').fillColor(COLOR.gray).text(o.reportSummary, 60, doc.y, { width: W - 20 });
            doc.moveDown(0.3);
          }
          doc.moveDown(0.3);
        });
      }

      // ── CONSULTAS ────────────────────────────────────────────────────────
      if (appointments.length > 0) {
        this.section(doc, W, 'Consultas Recentes');
        const apptRows = appointments.map((a: any) => [
          fmt(a.appointmentAt),
          a.specialty   ?? '—',
          a.status      ?? '—',
          (a.notes?.slice(0, 40) ?? '—'),
        ]);
        this.simpleTable(doc, W, ['Data', 'Especialidade', 'Status', 'Obs.'], apptRows);
      }

      // ── VACINAS ──────────────────────────────────────────────────────────
      if (vaccines.length > 0) {
        this.section(doc, W, 'Vacinas Aplicadas');
        const vacRows = vaccines.map(v => [
          v.vaccine?.name ?? '—',
          `Dose ${v.doseNumber}`,
          fmt(v.appliedAt),
          v.location ?? '—',
        ]);
        this.simpleTable(doc, W, ['Vacina', 'Dose', 'Data', 'Local'], vacRows);
      }

      // ── ASSINATURA DIGITAL ────────────────────────────────────────────────
      doc.addPage();
      const sigY = 60;

      // Fundo azul do header da página de assinatura
      doc.rect(50, sigY, W, 56).fill(COLOR.primary);
      doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold')
        .text('Assinatura Digital', 65, sigY + 12);
      doc.fontSize(9).font('Helvetica')
        .text('Este documento foi gerado e assinado digitalmente pela plataforma IcodeLife', 65, sigY + 36, { width: W - 90 });

      // QR Code
      const qrX = W - 10;
      const qrSize = 90;
      doc.image(qrBuffer, qrX, sigY - 5, { width: qrSize, height: qrSize });

      doc.y = sigY + 80;
      doc.moveDown(0.5);

      // Tabela de dados da assinatura
      const sigData: [string, string][] = [
        ['Documento',      `Prontuário Médico — ${user.fullName}`],
        ['Emitido em',     new Date(sig.issuedAt).toLocaleString('pt-BR')],
        ['Válido até',     new Date(sig.expiresAt).toLocaleString('pt-BR')],
        ['Hash SHA-256',   sig.hash],
        ['Nonce',          sig.nonce],
        ['ICODE Paciente', (user as any).icode ?? '—'],
      ];
      this.twoColTable(doc, W, sigData);

      doc.moveDown(0.6);
      doc.rect(50, doc.y, W, 1).fill(COLOR.border);
      doc.moveDown(0.4);

      // Como verificar
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLOR.primary)
        .text('Como verificar a autenticidade deste documento:', 50, doc.y);
      doc.moveDown(0.3);
      const steps = [
        '1. Aponte a câmera do celular para o QR Code acima.',
        '2. Acesse o link de verificação que será exibido.',
        '3. O sistema confirmará se o documento é autêntico e não foi alterado.',
        `4. URL direta: ${verifyUrl.slice(0, 80)}…`,
      ];
      steps.forEach(step => {
        this.checkNewPage(doc, 20);
        doc.fontSize(9).font('Helvetica').fillColor(COLOR.text)
          .text(step, 60, doc.y, { width: W - 20 });
        doc.moveDown(0.3);
      });

      doc.moveDown(0.4);
      doc.rect(50, doc.y, W, 44).fill('#FEF9C3').stroke('#FDE047');
      const noticeY = doc.y + 6;
      doc.fillColor('#92400E').fontSize(8).font('Helvetica-Bold')
        .text('AVISO LEGAL', 60, noticeY);
      doc.font('Helvetica').fillColor('#78350F')
        .text(
          'Este prontuário é um documento médico confidencial. Sua divulgação não autorizada pode constituir violação da LGPD (Lei 13.709/2018). '
          + 'A assinatura digital garante a integridade e autenticidade do documento no momento da geração.',
          60, noticeY + 14, { width: W - 20 }
        );
      doc.y += 44 + 6;

      // ── RODAPÉ ───────────────────────────────────────────────────────────
      doc.fontSize(8).font('Helvetica').fillColor(COLOR.gray)
        .text(
          `IcodLife — Documento gerado digitalmente em ${new Date().toLocaleString('pt-BR')} | ICODE: ${(user as any).icode ?? '—'} | Uso médico confidencial`,
          50, doc.page.height - 40, { width: W, align: 'center' }
        );

      doc.end();
    });
  }

  // ── Helpers de layout ─────────────────────────────────────────────────────

  private section(doc: any, W: number, title: string) {
    this.checkNewPage(doc, 60);
    doc.moveDown(0.8);
    doc.rect(50, doc.y, W, 26).fill(COLOR.primary);
    doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
      .text(title, 60, doc.y + 7, { width: W - 20 });
    doc.y += 26;
    doc.moveDown(0.4);
  }

  private twoColTable(doc: any, W: number, rows: [string, string][]) {
    rows.forEach(([label, value]) => {
      this.checkNewPage(doc, 22);
      const y = doc.y;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLOR.gray)
        .text(label + ':', 60, y, { width: W * 0.35 });
      doc.font('Helvetica').fillColor(COLOR.text)
        .text(value || '—', 60 + W * 0.35, y, { width: W * 0.6 });
      doc.y = Math.max(doc.y, y + 16);
    });
    doc.moveDown(0.4);
  }

  // Rótulo em negrito numa linha e valor logo abaixo, indentado — evita o "grudamento"
  // que o pdfkit causa quando se usa { continued: true } com troca de fonte no meio.
  private labelValue(doc: any, W: number, label: string, value: string, color: string) {
    this.checkNewPage(doc, 32);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(color).text(`${label}:`, 60, doc.y, { width: W - 20 });
    doc.moveDown(0.15);
    doc.font('Helvetica').fillColor(COLOR.text).text(value, 60, doc.y, { width: W - 20 });
    doc.moveDown(0.3);
  }

  private simpleTable(doc: any, W: number, headers: string[], rows: string[][]) {
    const cols = headers.length;
    const colW = W / cols;

    this.checkNewPage(doc, 30);
    doc.rect(50, doc.y, W, 22).fill(COLOR.accent);
    headers.forEach((h, i) => {
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
        .text(h, 55 + i * colW, doc.y + 6, { width: colW - 5 });
    });
    doc.y += 22;

    rows.forEach((row, ri) => {
      this.checkNewPage(doc, 22);
      const y = doc.y;
      doc.rect(50, y, W, 20).fill(ri % 2 === 0 ? COLOR.lightGray : '#fff').stroke(COLOR.border);
      row.forEach((cell, i) => {
        doc.fillColor(COLOR.text).fontSize(8).font('Helvetica')
          .text(cell?.slice(0, 30) ?? '—', 55 + i * colW, y + 5, { width: colW - 5 });
      });
      doc.y = y + 20;
    });
    doc.moveDown(0.5);
  }

  private checkNewPage(doc: any, minSpace: number) {
    if (doc.y + minSpace > doc.page.height - 60) doc.addPage();
  }
}
