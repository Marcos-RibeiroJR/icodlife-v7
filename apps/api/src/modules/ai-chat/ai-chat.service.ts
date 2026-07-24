// apps/api/src/modules/ai-chat/ai-chat.service.ts
// HealthBot — check-in diário de saúde. Cada resposta é interpretada em sinais
// estruturados (health_signals) e consolidada num check-in diário (health_checkins)
// com flags de risco, score e tendência. As mensagens do chat continuam em
// ai_health_chats (uma linha por mensagem, agrupadas por sessionId).

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  DAILY_QUESTIONS,
  buildDailyQuestions,
  interpretAnswer,
  computeRisk,
  buildSummaryMessage,
  ExtractedSignal,
  DailyQuestion,
} from './health-signals';

@Injectable()
export class AiChatService {
  constructor(private prisma: PrismaService) {}

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Perguntas específicas por medicamento ativo do usuário (nome + horário agendado). */
  private async loadQuestionsForUser(userId: string): Promise<DailyQuestion[]> {
    const meds = await this.prisma.medication.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, dosage: true, scheduledTimes: true },
    });
    return buildDailyQuestions(meds);
  }

  private questionsOf(checkin: any): DailyQuestion[] {
    return Array.isArray(checkin?.questions) && checkin.questions.length ? checkin.questions : DAILY_QUESTIONS;
  }

  private questionMessage(questions: DailyQuestion[], index: number): { role: 'assistant'; content: string; timestamp: string } {
    return { role: 'assistant', content: questions[index].text, timestamp: new Date().toISOString() };
  }

  // ── INICIAR / RETOMAR SESSÃO DIÁRIA ───────────────────────────────────────
  async startDailySession(userId: string) {
    const today = this.startOfToday();
    const checkin = await this.prisma.healthCheckin.findUnique({
      where: { userId_checkinDate: { userId, checkinDate: today } },
    });

    if (checkin?.completed) {
      return {
        alreadyCompleted: true,
        sessionId: checkin.sessionId,
        session: { flags: (checkin.flags as string[]) ?? [], riskLevel: checkin.riskLevel },
      };
    }

    if (checkin) {
      // Retoma de onde parou.
      return {
        alreadyCompleted: false,
        sessionId: checkin.sessionId,
        nextQuestion: this.questionMessage(this.questionsOf(checkin), checkin.questionIndex),
      };
    }

    // Nova sessão do dia — monta as perguntas (fixas + 1 por medicamento/horário ativo).
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { fullName: true },
    });
    const firstName = user?.fullName?.split(' ')[0] ?? 'tudo bem';
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const questions = await this.loadQuestionsForUser(userId);
    const greeting = `${period}, ${firstName}! 👋 Sou o HealthBot do IcodLife. Vamos fazer um check-in rápido de saúde?\n\n${questions[0].text}`;

    const sessionId = randomUUID();
    try {
      await this.prisma.healthCheckin.create({
        data: { userId, sessionId, checkinDate: today, questionIndex: 0, flags: [], questions: questions as any },
      });
      await this.prisma.aiHealthChat.create({
        data: { userId, sessionId, role: 'assistant', content: greeting, metadata: { questionIndex: 0 } as any },
      });
      return {
        alreadyCompleted: false,
        sessionId,
        nextQuestion: { role: 'assistant' as const, content: greeting, timestamp: new Date().toISOString() },
      };
    } catch (e: any) {
      // Corrida (ex.: React StrictMode dispara /start duas vezes): o check-in de
      // hoje já foi criado pela outra chamada. Retoma em vez de estourar.
      if (e?.code === 'P2002') {
        const existing = await this.prisma.healthCheckin.findUnique({
          where: { userId_checkinDate: { userId, checkinDate: today } },
        });
        if (existing) {
          if (existing.completed) {
            return {
              alreadyCompleted: true,
              sessionId: existing.sessionId,
              session: { flags: (existing.flags as string[]) ?? [], riskLevel: existing.riskLevel },
            };
          }
          return {
            alreadyCompleted: false,
            sessionId: existing.sessionId,
            nextQuestion: this.questionMessage(this.questionsOf(existing), existing.questionIndex),
          };
        }
      }
      throw e;
    }
  }

  // ── ENVIAR MENSAGEM ───────────────────────────────────────────────────────
  async sendMessage(userId: string, userMessage: string) {
    const today = this.startOfToday();
    let checkin = await this.prisma.healthCheckin.findUnique({
      where: { userId_checkinDate: { userId, checkinDate: today } },
    });
    if (!checkin) {
      await this.startDailySession(userId);
      checkin = await this.prisma.healthCheckin.findUnique({
        where: { userId_checkinDate: { userId, checkinDate: today } },
      });
    }
    if (!checkin) throw new Error('Falha ao iniciar o check-in');

    if (checkin.completed) {
      return {
        message: 'Você já concluiu o check-in de hoje! Volte amanhã. 🌟',
        sessionComplete: true,
        flags: (checkin.flags as string[]) ?? [],
        sessionId: checkin.sessionId,
      };
    }

    // Registra a resposta do usuário.
    await this.prisma.aiHealthChat.create({
      data: { userId, sessionId: checkin.sessionId, role: 'user', content: userMessage },
    });

    // Interpreta a resposta em sinais estruturados e persiste.
    const questions = this.questionsOf(checkin);
    const currentQuestion = questions[checkin.questionIndex];
    const extracted = currentQuestion ? interpretAnswer(currentQuestion.key, userMessage) : [];
    if (extracted.length) {
      await this.prisma.healthSignal.createMany({
        data: extracted.map((s) => ({
          userId,
          checkinId: checkin!.id,
          type: s.type,
          valueNum: s.valueNum ?? null,
          valueText: s.valueText ?? null,
          polarity: s.polarity,
        })),
      });
    }

    // Pergunta específica de medicamento respondida → grava no histórico de
    // adesão real (MedicationLog), fechando o ciclo com a Agenda/Biblioteca
    // de medicamentos em vez de deixar a resposta só no chat.
    if (currentQuestion?.key === 'medication_check' && currentQuestion.medicationId) {
      const sig = extracted.find((s) => s.type === 'medication_adherence');
      if (sig) {
        const todayStr = today.toISOString().split('T')[0];
        const time = currentQuestion.scheduledTime ?? '00:00';
        await this.prisma.medicationLog.create({
          data: {
            medicationId: currentQuestion.medicationId,
            userId,
            takenAt: new Date(`${todayStr}T${time}:00`),
            wasSkipped: sig.valueText === 'faltou',
            skipReason: sig.valueText === 'faltou' ? 'Relatado via HealthBot' : undefined,
            notes: `Registrado via HealthBot (check-in diário) — ${currentQuestion.medicationName ?? ''} às ${time}`.trim(),
          },
        });
      }
    }

    const nextIndex = checkin.questionIndex + 1;
    const empathyPrefix = extracted.some((s) => s.polarity === 'negative')
      ? 'Entendo, obrigado por compartilhar. '
      : '';

    // Ainda há perguntas.
    if (nextIndex < questions.length) {
      const content = `${empathyPrefix}${questions[nextIndex].text}`;
      await this.prisma.aiHealthChat.create({
        data: { userId, sessionId: checkin.sessionId, role: 'assistant', content, metadata: { questionIndex: nextIndex } as any },
      });
      await this.prisma.healthCheckin.update({
        where: { id: checkin.id }, data: { questionIndex: nextIndex },
      });
      return { message: content, sessionComplete: false, sessionId: checkin.sessionId };
    }

    // Fim do questionário → consolida risco.
    return this.finalizeCheckin(userId, checkin.id);
  }

  private async finalizeCheckin(userId: string, checkinId: string) {
    const signals = await this.prisma.healthSignal.findMany({ where: { checkinId } });
    const extracted: ExtractedSignal[] = signals.map((s) => ({
      type: s.type,
      valueNum: s.valueNum ?? undefined,
      valueText: s.valueText ?? undefined,
      polarity: s.polarity as any,
    }));
    const risk = computeRisk(extracted);
    const trend = await this.computeTrend(userId, risk.riskScore);
    const summary = buildSummaryMessage(risk);

    const checkin = await this.prisma.healthCheckin.findUnique({ where: { id: checkinId } });

    await this.prisma.aiHealthChat.create({
      data: {
        userId, sessionId: checkin!.sessionId, role: 'assistant', content: summary,
        metadata: { sessionComplete: true, flags: risk.flags } as any,
      },
    });

    const msgCount = await this.prisma.aiHealthChat.count({
      where: { sessionId: checkin!.sessionId, role: 'user' },
    });

    await this.prisma.healthCheckin.update({
      where: { id: checkinId },
      data: {
        completed: true,
        sentimentScore: risk.sentimentScore,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        trend,
        flags: risk.flags,
        healthSummary: { messageCount: msgCount, bpFactors: risk.bpFactors, notes: risk.notes } as any,
      },
    });

    return { message: summary, sessionComplete: true, flags: risk.flags, riskLevel: risk.riskLevel, trend, sessionId: checkin!.sessionId };
  }

  /** Compara o risco de hoje com a média dos últimos check-ins concluídos. */
  private async computeTrend(userId: string, todayScore: number): Promise<string> {
    const prev = await this.prisma.healthCheckin.findMany({
      where: { userId, completed: true },
      orderBy: { checkinDate: 'desc' },
      take: 7,
    });
    if (prev.length === 0) return 'stable';
    const avg = prev.reduce((a, c) => a + c.riskScore, 0) / prev.length;
    if (todayScore < avg - 5) return 'improving';
    if (todayScore > avg + 5) return 'worsening';
    return 'stable';
  }

  // ── HISTÓRICO (para a aba Histórico do chat) ──────────────────────────────
  async getCheckinHistory(userId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const checkins = await this.prisma.healthCheckin.findMany({
      where: { userId, checkinDate: { gte: since } },
      orderBy: { checkinDate: 'desc' },
    });
    return checkins.map((c) => ({
      id: c.id,
      sessionDate: c.checkinDate,
      completed: c.completed,
      sentimentScore: c.sentimentScore,
      riskScore: c.riskScore,
      riskLevel: c.riskLevel,
      trend: c.trend,
      flags: (c.flags as string[]) ?? [],
      healthSummary: c.healthSummary,
    }));
  }

  // ── TENDÊNCIAS AGREGADAS (base do futuro dashboard) ───────────────────────
  async getTrends(userId: string, period: 'daily' | 'weekly' | 'monthly' | 'annual' = 'daily') {
    const days = period === 'annual' ? 365 : period === 'monthly' ? 30 : period === 'weekly' ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const checkins = await this.prisma.healthCheckin.findMany({
      where: { userId, completed: true, checkinDate: { gte: since } },
      orderBy: { checkinDate: 'asc' },
    });

    const bucketOf = (d: Date): string => {
      const dt = new Date(d);
      if (period === 'annual') return `${dt.getFullYear()}`;
      if (period === 'monthly') return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (period === 'weekly') {
        const onejan = new Date(dt.getFullYear(), 0, 1);
        const week = Math.ceil((((dt.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
        return `${dt.getFullYear()}-S${String(week).padStart(2, '0')}`;
      }
      return dt.toISOString().slice(0, 10);
    };

    const buckets = new Map<string, { count: number; risk: number; sentiment: number; flags: number }>();
    const flagTotals: Record<string, number> = {};
    for (const c of checkins) {
      const k = bucketOf(c.checkinDate);
      const b = buckets.get(k) ?? { count: 0, risk: 0, sentiment: 0, flags: 0 };
      b.count += 1;
      b.risk += c.riskScore;
      b.sentiment += Number(c.sentimentScore ?? 0);
      const fl = (c.flags as string[]) ?? [];
      b.flags += fl.length;
      for (const f of fl) flagTotals[f] = (flagTotals[f] ?? 0) + 1;
      buckets.set(k, b);
    }

    const series = Array.from(buckets.entries()).map(([bucket, b]) => ({
      bucket,
      checkins: b.count,
      avgRisk: Math.round(b.risk / b.count),
      avgSentiment: Number((b.sentiment / b.count).toFixed(2)),
      flagCount: b.flags,
    }));

    const totalRisk = checkins.reduce((a, c) => a + c.riskScore, 0);
    return {
      period,
      totalCheckins: checkins.length,
      avgRisk: checkins.length ? Math.round(totalRisk / checkins.length) : 0,
      currentTrend: checkins.length ? (checkins[checkins.length - 1].trend ?? 'stable') : 'stable',
      series,
      topFlags: Object.entries(flagTotals).sort((a, b) => b[1] - a[1]).map(([flag, count]) => ({ flag, count })),
    };
  }
}
