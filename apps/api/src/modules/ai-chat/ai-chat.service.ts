// apps/api/src/modules/ai-chat/ai-chat.service.ts
// HealthBot — check-in diário com contexto completo de saúde

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const DAILY_HEALTH_QUESTIONS = {
  sleep: [
    'Como foi o seu sono esta noite? Dormiu bem? 😴',
    'Quantas horas de sono você teve?',
    'Acordou durante a noite?',
  ],
  bloodpressure: [
    'Fez alguma aferição de pressão arterial hoje? Se sim, qual foi o resultado?',
    'Sentiu alguma dor de cabeça, tontura ou batimento acelerado hoje?',
  ],
  pain: [
    'Está sentindo alguma dor hoje?',
    'Em uma escala de 0 a 10, qual a intensidade da dor?',
    'Onde está localizada a dor?',
  ],
  energy: [
    'Como está seu nível de energia hoje?',
    'Sentiu cansaço ou fadiga incomum?',
  ],
  mood: [
    'Como está seu humor hoje?',
    'Sentiu ansiedade ou tristeza?',
  ],
  lifestyle: [
    'Comeu alguma refeição pesada hoje (churrasco, fritura, muito sal)? 🥩',
    'Consumiu bebidas alcoólicas hoje? 🍺',
    'Tomou muito café ou energético? ☕',
  ],
  symptoms: [
    'Teve algum sintoma incomum hoje? (dor de cabeça, tontura, náusea...)',
    'Tomou todos os medicamentos nos horários certos?',
    'Praticou alguma atividade física?',
  ],
  nutrition: [
    'Como foi sua alimentação hoje?',
    'Bebeu água suficiente?',
  ],
};

const FEMALE_QUESTIONS = {
  cycle: [
    'Você está em período menstrual atualmente?',
    'Sentiu cólicas ou desconforto relacionado ao ciclo?',
    'Notou alguma alteração no ciclo menstrual recentemente?',
  ],
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

    let session = await this.prisma.aiHealthChat.findFirst({
      where: { userId, sessionDate: { gte: today } },
    });

    if (session?.completed) {
      return { alreadyCompleted: true, session };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, gender: true, chronicConditions: true, allergies: true },
    });

    const firstName = user!.fullName.split(' ')[0];
    const greeting = this.buildGreeting(firstName);

    if (!session) {
      session = await this.prisma.aiHealthChat.create({
        data: {
          userId,
          sessionDate: new Date(),
          messages: [greeting] as any,
          completed: false,
        },
      });
    }

    return { session, nextQuestion: greeting };
  }

  // ── ENVIAR MENSAGEM ───────────────────────────────────────────────────────

  async sendMessage(userId: string, userMessage: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let session = await this.prisma.aiHealthChat.findFirst({
      where: { userId, sessionDate: { gte: today } },
    });

    if (!session) {
      const { session: newSession } = await this.startDailySession(userId);
      session = newSession;
    }

    const [user, recentBp, cycleStats] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, gender: true, chronicConditions: true },
      }),
      (this.prisma as any).bloodPressureReading?.findMany({
        where: { userId, measuredAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
        orderBy: { measuredAt: 'desc' },
        take: 3,
      }).catch(() => []),
      // Buscar fase atual do ciclo para usuárias femininas
      this.getMenstrualContext(userId),
    ]);

    const messages = (session.messages as unknown as ChatMessage[]) || [];

    const userMsg: ChatMessage = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    messages.push(userMsg);

    const aiResponse = await this.generateAiResponse(
      messages,
      { ...user!, recentBp: recentBp ?? [], cycleStats },
      session,
    );

    const aiMsg: ChatMessage = { role: 'assistant', content: aiResponse.message, timestamp: new Date().toISOString() };
    messages.push(aiMsg);

    const updated = await this.prisma.aiHealthChat.update({
      where: { id: session.id },
      data: {
        messages: messages as any,
        healthSummary: aiResponse.healthSummary as any,
        flags: aiResponse.flags,
        sentimentScore: aiResponse.sentimentScore,
        completed: aiResponse.sessionComplete,
      },
    });

    return {
      message: aiResponse.message,
      sessionComplete: aiResponse.sessionComplete,
      flags: aiResponse.flags,
      session: updated,
    };
  }

  // ── CONTEXTO MENSTRUAL ────────────────────────────────────────────────────

  private async getMenstrualContext(userId: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { gender: true } });
      if (!user || !['female', 'other'].includes(user.gender)) return null;

      const lastCycle = await this.prisma.menstrualCycle.findFirst({
        where: { userId },
        orderBy: { cycleStart: 'desc' },
      });
      if (!lastCycle) return null;

      const dayOfCycle = Math.round((Date.now() - new Date(lastCycle.cycleStart).getTime()) / (1000 * 60 * 60 * 24));
      const cycleLen = lastCycle.cycleLength || 28;
      const ovDay = Math.round(cycleLen / 2) - 1;

      let phase: string;
      if (dayOfCycle < (lastCycle.periodLength || 5)) phase = 'menstrual';
      else if (dayOfCycle < ovDay - 1) phase = 'folicular';
      else if (dayOfCycle <= ovDay + 1) phase = 'ovulação';
      else phase = 'lútea';

      const nextPredicted = lastCycle.nextCyclePredicted;
      const daysUntilNext = nextPredicted
        ? Math.round((new Date(nextPredicted).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return { phase, dayOfCycle, daysUntilNext, cycleLen };
    } catch {
      return null;
    }
  }

  // ── GERAR RESPOSTA ────────────────────────────────────────────────────────

  private async generateAiResponse(messages: ChatMessage[], user: any, session: any) {
    const questionCount = messages.filter(m => m.role === 'assistant').length;
    const categories = Object.keys(DAILY_HEALTH_QUESTIONS);
    const femaleCategories = ['female', 'other'].includes(user.gender) ? Object.keys(FEMALE_QUESTIONS) : [];
    const allCategories = [...categories, ...femaleCategories];

    let nextMessage: string;
    let sessionComplete = false;
    let healthSummary: any = null;
    let flags: string[] = [];
    let sentimentScore = 0;

    if (questionCount >= allCategories.length + 1) {
      sessionComplete = true;
      const analysis = await this.analyzeHealthData(messages, user);
      nextMessage = analysis.summary;
      healthSummary = analysis.structured;
      flags = analysis.flags;
      sentimentScore = analysis.sentimentScore;
    } else {
      const categoryIndex = Math.min(questionCount, allCategories.length - 1);
      const category = allCategories[categoryIndex];
      const questionsForCategory = category in FEMALE_QUESTIONS
        ? (FEMALE_QUESTIONS as any)[category]
        : (DAILY_HEALTH_QUESTIONS as any)[category];

      nextMessage = questionsForCategory[0];

      // Inserir contexto de ciclo na pergunta de ciclo
      if (category === 'cycle' && user.cycleStats) {
        const { phase, daysUntilNext } = user.cycleStats;
        nextMessage = `Estou vendo que você está na fase ${phase} do ciclo${daysUntilNext !== null ? ` (próximo ciclo em ~${daysUntilNext} dias)` : ''}. ${questionsForCategory[0]}`;
      }

      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        nextMessage = this.personalizeQuestion(nextMessage, lastUserMsg.content, user);
      }
    }

    return { message: nextMessage, sessionComplete, healthSummary, flags, sentimentScore };
  }

  // ── ANÁLISE FINAL ─────────────────────────────────────────────────────────

  private async analyzeHealthData(messages: ChatMessage[], user: any) {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const text = userMessages.join(' ').toLowerCase();

    const negativeKeywords = ['dor', 'ruim', 'cansado', 'fraco', 'mal', 'tontura', 'febre', 'vômito'];
    const positiveKeywords = ['bem', 'ótimo', 'excelente', 'descansado', 'disposto', 'energia'];
    const negCount = negativeKeywords.filter(k => text.includes(k)).length;
    const posCount = positiveKeywords.filter(k => text.includes(k)).length;
    const sentimentScore = Math.max(-1, Math.min(1, (posCount - negCount) / 5));

    const flags: string[] = [];
    if (/febre|vômito|vomit/.test(text)) flags.push('possible_illness');
    if (/dor intensa|dor forte|dor 8|dor 9|dor 10/.test(text)) flags.push('severe_pain');
    if (/não dormi|dormi mal|insônia|acordei várias/.test(text)) flags.push('sleep_issue');
    if (/não tomei|esqueci o remédio|esqueci a medicação/.test(text)) flags.push('missed_medication');

    // Fatores de PA
    const drankAlcohol = /álcool|cerveja|vinho|bebida alcoolica|drink/i.test(text);
    const hadHeavyMeal = /churrasco|fritura|salgado|gorduroso|pizza|hamburguer/i.test(text);
    const hadPoorSleep = /não dormi|dormi mal|insônia|acordei|pesadelo/i.test(text);
    const hadHighStress = /estressad|ansios|nervos|pressão no trabalho|preocupad/i.test(text);
    const hadCaffeine   = /café|energético|cafeína/i.test(text);
    const headacheOrDizz = /dor de cabeça|cefaleia|tontura|cabeça doend/i.test(text);

    const bpFactors: string[] = [];
    if (drankAlcohol)  bpFactors.push('🍺 Consumo de álcool');
    if (hadHeavyMeal)  bpFactors.push('🥩 Refeição pesada/gordurosa');
    if (hadPoorSleep)  bpFactors.push('😴 Sono insuficiente');
    if (hadHighStress) bpFactors.push('😰 Estresse elevado');
    if (hadCaffeine)   bpFactors.push('☕ Excesso de cafeína');
    if (bpFactors.length > 0) flags.push('bp_risk_factors');
    if (headacheOrDizz) flags.push('bp_symptom');

    const firstName = user.fullName.split(' ')[0];
    const parts: string[] = [`${firstName}, aqui está o resumo do seu check-in de hoje:`];

    if (sentimentScore > 0.3) {
      parts.push('\n✅ Você parece estar bem hoje! Continue assim. 💪');
    } else if (sentimentScore < -0.3) {
      parts.push('\n💛 Não parece ter sido um dia fácil. Descanse bem. Se persistir, consulte um médico.');
    } else {
      parts.push('\n📊 Dia dentro da normalidade. Informações registradas.');
    }

    if (flags.includes('possible_illness')) parts.push('⚠️ Sintomas que podem indicar mal-estar — fique atento.');
    if (flags.includes('severe_pain'))      parts.push('🔴 Dor intensa relatada — recomendamos avaliação médica.');
    if (flags.includes('sleep_issue'))      parts.push('😴 Sono insuficiente detectado — isso pode elevar a pressão arterial.');
    if (flags.includes('missed_medication')) parts.push('💊 Medicação não tomada — tente manter a regularidade.');

    if (bpFactors.length > 0) {
      parts.push('\n❤️ Fatores que podem influenciar sua pressão arterial hoje:');
      bpFactors.forEach(f => parts.push(`   ${f}`));
      parts.push('👉 Registre sua PA no Mapa de Pressão para acompanhar o impacto.');
    }

    if (headacheOrDizz) {
      parts.push('\n🩺 Dor de cabeça/tontura podem estar relacionadas à PA. Considere aferir agora.');
    }

    if (user.recentBp?.length) {
      const last = user.recentBp[0];
      if (last.classification === 'crise') {
        parts.push(`\n🔴 ATENÇÃO: última PA foi ${last.systolic}/${last.diastolic} (CRISE). Procure atendimento médico imediatamente.`);
      } else if (last.classification === 'hipertensao2') {
        parts.push(`\n🟠 Sua última PA (${last.systolic}/${last.diastolic}) foi Hipertensão G2. Monitoramento diário importante.`);
      } else if (last.classification === 'hipertensao1') {
        parts.push(`\n🟡 PA recente (${last.systolic}/${last.diastolic}) em limiar hipertensivo — fatores do dia podem influenciar.`);
      }
    }

    // Contexto de ciclo menstrual
    if (user.cycleStats) {
      const { phase } = user.cycleStats;
      const phaseAdvice: Record<string, string> = {
        menstrual: '🩸 Você está na fase menstrual — hidratar-se bem e descansar ajudam a reduzir cólicas.',
        folicular: '🌱 Fase folicular — boa energia! Aproveite para atividades físicas.',
        ovulação: '🌸 Período de ovulação — pico de energia e disposição.',
        lútea: '🌙 Fase lútea — possível TPM. Reduza sódio e cafeína para controlar retenção.',
      };
      if (phaseAdvice[phase]) parts.push(`\n${phaseAdvice[phase]}`);
    }

    parts.push('\nRegistros salvos no seu prontuário IcodLife. Até amanhã! 🌟');

    return {
      summary: parts.join('\n'),
      structured: { sentimentScore, flags, messageCount: userMessages.length, bpFactors },
      flags,
      sentimentScore,
    };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private buildGreeting(firstName: string): ChatMessage {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    return {
      role: 'assistant',
      content: `${period}, ${firstName}! 👋 Sou o HealthBot do IcodLife. Vamos fazer um check-in rápido de saúde?\n\nComo foi o seu sono esta noite? Dormiu bem? 😴`,
      timestamp: new Date().toISOString(),
    };
  }

  private buildSystemPrompt(user: any): string {
    let bpContext = '';
    if (user.recentBp?.length) {
      const last = user.recentBp[0];
      bpContext = `\nÚltima PA: ${last.systolic}/${last.diastolic} mmHg (${last.classification}) em ${new Date(last.measuredAt).toLocaleDateString('pt-BR')}.`;
      if (user.recentBp.length >= 2) {
        const avg = Math.round(user.recentBp.reduce((s: number, r: any) => s + r.systolic, 0) / user.recentBp.length);
        bpContext += ` Média sistólica: ${avg} mmHg.`;
      }
    }
    let cycleContext = '';
    if (user.cycleStats) {
      cycleContext = `\nFase do ciclo menstrual: ${user.cycleStats.phase} (dia ${user.cycleStats.dayOfCycle}).`;
    }
    return `Você é o HealthBot do IcodLife, assistente de saúde empático e profissional.
Usuário: ${user.fullName}, gênero: ${user.gender}
Condições crônicas: ${user.chronicConditions?.join(', ') || 'nenhuma'}${bpContext}${cycleContext}

Regras:
- Uma pergunta por vez, linguagem simples e acolhedora em português brasileiro
- NUNCA faça diagnósticos médicos
- Sintomas graves → recomende atendimento médico
- Sono ruim, álcool, estresse, refeição pesada → mencione impacto na PA
- PA elevada recente → personalize perguntas sobre fatores de risco
- Para usuárias femininas, relacione sintomas com fase do ciclo quando relevante`;
  }

  private personalizeQuestion(question: string, lastResponse: string, user: any): string {
    const negative = ['ruim', 'mal', 'dor', 'cansado', 'não', 'péssimo'];
    const hasNegative = negative.some(n => lastResponse.toLowerCase().includes(n));
    if (hasNegative) return `Entendo, obrigado por compartilhar. ${question}`;
    return question;
  }

  // ── HISTÓRICO ─────────────────────────────────────────────────────────────

  async getChatHistory(userId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.aiHealthChat.findMany({
      where: { userId, sessionDate: { gte: since } },
      orderBy: { sessionDate: 'desc' },
      select: {
        id: true, sessionDate: true, completed: true,
        flags: true, sentimentScore: true, healthSummary: true,
      },
    });
  }
}
