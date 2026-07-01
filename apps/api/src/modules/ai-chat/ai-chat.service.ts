// apps/api/src/modules/ai-chat/ai-chat.service.ts
// HealthBot — schema stores one row per message (sessionId groups them)

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const DAILY_HEALTH_QUESTIONS = {
  sleep:       ['Como foi o seu sono esta noite? Dormiu bem? 😴'],
  bloodpressure: ['Fez alguma aferição de pressão arterial hoje? Se sim, qual foi o resultado?'],
  pain:        ['Está sentindo alguma dor hoje? Em uma escala de 0 a 10, qual a intensidade?'],
  energy:      ['Como está seu nível de energia hoje? Sentiu cansaço ou fadiga incomum?'],
  mood:        ['Como está seu humor hoje? Sentiu ansiedade ou tristeza?'],
  lifestyle:   ['Comeu alguma refeição pesada hoje (churrasco, fritura, muito sal)?'],
  symptoms:    ['Teve algum sintoma incomum hoje? Tomou todos os medicamentos nos horários certos?'],
  nutrition:   ['Como foi sua alimentação hoje? Bebeu água suficiente?'],
};

@Injectable()
export class AiChatService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ── INICIAR SESSÃO DIÁRIA ─────────────────────────────────────────────────

  async startDailySession(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if we already have messages today
    const todayMessage = await this.prisma.aiHealthChat.findFirst({
      where: { userId, createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
    });

    if (todayMessage) {
      const sessionId = todayMessage.sessionId;
      const messages = await this.getSessionMessages(userId, sessionId);
      return { sessionId, messages, alreadyStarted: true };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, gender: true },
    });

    const firstName = user!.fullName.split(' ')[0];
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const greeting = `${period}, ${firstName}! 👋 Sou o HealthBot do IcodLife. Vamos fazer um check-in rápido de saúde?\n\nComo foi o seu sono esta noite? Dormiu bem? 😴`;

    const sessionId = randomUUID();

    const msg = await this.prisma.aiHealthChat.create({
      data: {
        userId,
        sessionId,
        role: 'assistant',
        content: greeting,
        metadata: { questionIndex: 0 } as any,
      },
    });

    return { sessionId, messages: [msg], alreadyStarted: false, nextQuestion: greeting };
  }

  // ── ENVIAR MENSAGEM ───────────────────────────────────────────────────────

  async sendMessage(userId: string, userMessage: string, sessionId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create session
    let sid = sessionId;
    if (!sid) {
      const todayMsg = await this.prisma.aiHealthChat.findFirst({
        where: { userId, createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' },
      });
      if (todayMsg) {
        sid = todayMsg.sessionId;
      } else {
        const { sessionId: newSid } = await this.startDailySession(userId);
        sid = newSid;
      }
    }

    // Save user message
    await this.prisma.aiHealthChat.create({
      data: { userId, sessionId: sid!, role: 'user', content: userMessage },
    });

    // Get conversation history for this session
    const history = await this.getSessionMessages(userId, sid!);
    const assistantCount = history.filter(m => m.role === 'assistant').length;
    const categories = Object.values(DAILY_HEALTH_QUESTIONS);
    const isComplete = assistantCount >= categories.length + 1;

    let aiContent: string;

    if (isComplete) {
      // Session wrap-up
      const userMessages = history.filter(m => m.role === 'user').map(m => m.content);
      aiContent = this.buildSummary(userMessages);
    } else {
      const categoryIndex = Math.min(assistantCount, categories.length - 1);
      aiContent = categories[categoryIndex][0];
      const lastUser = [...history].reverse().find(m => m.role === 'user');
      if (lastUser) {
        const negative = ['ruim', 'mal', 'dor', 'cansado', 'não', 'péssimo'];
        if (negative.some(n => lastUser.content.toLowerCase().includes(n))) {
          aiContent = `Entendo, obrigado por compartilhar. ${aiContent}`;
        }
      }
    }

    const aiMsg = await this.prisma.aiHealthChat.create({
      data: {
        userId,
        sessionId: sid!,
        role: 'assistant',
        content: aiContent,
        metadata: { questionIndex: assistantCount, sessionComplete: isComplete } as any,
      },
    });

    return {
      message: aiContent,
      sessionId: sid,
      sessionComplete: isComplete,
      messageId: aiMsg.id,
    };
  }

  // ── HISTÓRICO ─────────────────────────────────────────────────────────────

  async getChatHistory(userId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const messages = await this.prisma.aiHealthChat.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    // Group by sessionId
    const sessions = new Map<string, typeof messages>();
    for (const msg of messages) {
      if (!sessions.has(msg.sessionId)) sessions.set(msg.sessionId, []);
      sessions.get(msg.sessionId)!.push(msg);
    }

    return Array.from(sessions.entries()).map(([sid, msgs]) => ({
      sessionId: sid,
      startedAt: msgs[0].createdAt,
      messageCount: msgs.length,
      preview: msgs.find(m => m.role === 'user')?.content?.slice(0, 80) ?? '',
    })).reverse();
  }

  async getSession(userId: string, sessionId: string) {
    return this.getSessionMessages(userId, sessionId);
  }

  // ── MENSTRUAL CONTEXT ─────────────────────────────────────────────────────

  private async getMenstrualContext(userId: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { gender: true } });
      if (!user || !['female', 'other'].includes(user.gender)) return null;

      const lastCycle = await this.prisma.menstrualCycle.findFirst({
        where: { userId },
        orderBy: { startDate: 'desc' },
      });
      if (!lastCycle) return null;

      const dayOfCycle = Math.round((Date.now() - lastCycle.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const cycleLen = lastCycle.cycleLength || 28;
      const ovDay = Math.round(cycleLen / 2) - 1;

      let phase: string;
      if (dayOfCycle < (lastCycle.periodLength || 5)) phase = 'menstrual';
      else if (dayOfCycle < ovDay - 1) phase = 'folicular';
      else if (dayOfCycle <= ovDay + 1) phase = 'ovulação';
      else phase = 'lútea';

      const daysUntilNext = cycleLen - dayOfCycle;
      return { phase, dayOfCycle, daysUntilNext, cycleLen };
    } catch {
      return null;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private async getSessionMessages(userId: string, sessionId: string) {
    return this.prisma.aiHealthChat.findMany({
      where: { userId, sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private buildSummary(userMessages: string[]): string {
    const text = userMessages.join(' ').toLowerCase();
    const negativeKeywords = ['dor', 'ruim', 'cansado', 'fraco', 'mal', 'tontura', 'febre'];
    const positiveKeywords = ['bem', 'ótimo', 'excelente', 'descansado', 'disposto', 'energia'];
    const negCount = negativeKeywords.filter(k => text.includes(k)).length;
    const posCount = positiveKeywords.filter(k => text.includes(k)).length;

    const parts = ['Aqui está o resumo do seu check-in de hoje:'];

    if (posCount > negCount) {
      parts.push('\n✅ Você parece estar bem hoje! Continue assim. 💪');
    } else if (negCount > posCount) {
      parts.push('\n💛 Não parece ter sido um dia fácil. Descanse bem. Se persistir, consulte um médico.');
    } else {
      parts.push('\n📊 Dia dentro da normalidade. Informações registradas.');
    }

    if (/febre|vômito/.test(text)) parts.push('⚠️ Sintomas que podem indicar mal-estar — fique atento.');
    if (/dor intensa|dor forte|dor 8|dor 9|dor 10/.test(text)) parts.push('🔴 Dor intensa relatada — recomendamos avaliação médica.');
    if (/não dormi|dormi mal|insônia/.test(text)) parts.push('😴 Sono insuficiente detectado — isso pode elevar a pressão arterial.');
    if (/não tomei|esqueci o remédio/.test(text)) parts.push('💊 Medicação não tomada — tente manter a regularidade.');

    parts.push('\nRegistros salvos no seu prontuário IcodLife. Até amanhã! 🌟');
    return parts.join('\n');
  }
}
