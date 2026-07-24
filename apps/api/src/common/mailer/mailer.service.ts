// apps/api/src/common/mailer/mailer.service.ts
// Serviço mínimo de envio de e-mail (nodemailer já era dependência instalada
// mas nunca usada). Fica silencioso/loga em vez de derrubar a requisição
// quando SMTP não está configurado (ambiente de dev sem credenciais).
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return this.transporter;
  }

  async send(opts: MailOptions): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP não configurado — e-mail não enviado (destinatário: ${opts.to}, assunto: "${opts.subject}")`);
      return false;
    }
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      return true;
    } catch (e: any) {
      this.logger.error(`Falha ao enviar e-mail para ${opts.to}: ${e?.message ?? e}`);
      return false;
    }
  }
}
