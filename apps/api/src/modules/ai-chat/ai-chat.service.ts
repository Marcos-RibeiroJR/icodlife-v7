// apps/api/src/modules/ai-chat/ai-chat.service.ts
// Chatbot de saúde periódico — mobile-first
// Motor: OpenAI GPT-4o com contexto de saúde do usuário

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// Perguntas periódicas de saúde por categoria
const DAILY_HEALTH_QUESTIONS = {
  sleep: [
    'Como foi o seu sono esta noite? Dormiu bem?',
    'Quantas horas de sono você teve?',
    'Acordou durante a noite?',
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

// Perguntas específicas para usuárias femininas
const FEMALE_QUESTIONS = {
  cycle: [
    'Você está em período menstrual atualmente?',
    'Sentiu cólicas ou desconforto relacionado ao ciclo?',
    'Notou alguma alteração no ciclo menstrual?',
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

    // Verificar se já tem sessão hoje
    let session = await this.prisma.aiHealthChat.findFirst({
      where: { userId, sessionDate: { gte: today } },
    });

    if (session?.completed) {
      return { alreadyCompleted: true, session };
    }

    // Buscar perfil do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, gender: true, chronicConditions: true, allergies: true },
    });

    // Primeira mensagem do chatbot
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, gender: true, chronicConditions: true },
    });

    const messages = (session.messages as unknown as ChatMessage[]) || [];

    // Adicionar mensagem do usuário
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    messages.push(userMsg);

    // Gerar resposta da IA
    const aiResponse = await this.generateAiResponse(
      messages,
      user!,
      session
    );

    const aiMsg: ChatMessage = {
      role: 'assistant',
      content: aiResponse.message,
      timestamp: new Date().toISOString(),
    };
    messages.push(aiMsg);

    // Verificar se a sessão está completa
    const completed = aiResponse.sessionComplete;

    // Atualizar sessão
    const updated = await this.prisma.aiHealthChat.update({
      where: { id: session.id },
      data: {
        messages: messages as any,
        healthSummary: aiResponse.healthSummary as any,
        flags: aiResponse.flags,
        sentimentScore: aiResponse.sentimentScore,
        completed,
      },
    });

    return {
      message: aiResponse.message,
      sessionComplete: completed,
      flags: aiResponse.flags,
      session: updated,
    };
  }

  // ── GERAR RESPOSTA COM IA ─────────────────────────────────────────────────

  private async generateAiResponse(
    messages: ChatMessage[],
    user: any,
    session: any,
  ) {
    const systemPrompt = this.buildSystemPrompt(user);

    // Determinar próxima pergunta baseado no progresso
    const questionCount = messages.filter(m => m.role === 'assistant').length;
    const categories = Object.keys(DAILY_HEALTH_QUESTIONS);
    const femaleCategories = user.gender === 'female' ? Object.keys(FEMALE_QUESTIONS) : [];
    const allCategories = [...categories, ...femaleCategories];

    let nextMessage: string;
    let sessionComplete = false;
    let healthSummary: any = null;
    let flags: string[] = [];
    let sentimentScore = 0;

    if (questionCount >= allCategories.length + 1) {
      // Sessão completa — gerar resumo
      sessionComplete = true;
      const analysis = await this.analyzeHealthData(messages, user);
      nextMessage = analysis.summary;
      healthSummary = analysis.structured;
      flags = analysis.flags;
      sentimentScore = analysis.sentimentScore;
    } else {
      // Próxima pergunta
      const categoryIndex = Math.min(questionCount, allCategories.length - 1);
      const category = allCategories[categoryIndex];

      const questionsForCategory = category in FEMALE_QUESTIONS
        ? (FEMALE_QUESTIONS as any)[category]
        : (DAILY_HEALTH_QUESTIONS as any)[category];

      nextMessage = questionsForCategory[0];

      // Personalizar baseado na última resposta
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        nextMessage = this.personalizeQuestion(nextMessage, lastUserMsg.content, user);
      }
    }

    return { message: nextMessage, sessionComplete, healthSummary, flags, sentimentScore };
  }

  // ── ANÁLISE FINAL DA SESSÃO ───────────────────────────────────────────────

  private async analyzeHealthData(messages: ChatMessage[], user: any) {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);

    // Análise simples de palavras-chave (substituir por OpenAI em produção)
    const negativeKeywords = ['dor', 'ruim', 'cansado', 'fraco', 'mal', 'tontura', 'febre', 'vômito'];
    const positiveKeywords = ['bem', 'ótimo', 'excelente', 'descansado', 'disposto'];

    const text = userMessages.join(' ').toLowerCase();
    const negCount = negativeKeywords.filter(k => text.includes(k)).length;
    const posCount = positiveKeywords.filter(k => text.includes(k)).length;
    const sentimentScore = Math.max(-1, Math.min(1, (posCount - negCount) / 5));

    const flags: string[] = [];
    if (text.includes('febre') || text.includes('vômito')) flags.push('possible_illness');
    if (text.includes('dor intensa') || text.includes('dor forte')) flags.push('severe_pain');
    if (text.includes('não dormi') || text.includes('insônia')) flags.push('sleep_issue');

    const summaryParts = [`Olá ${user.fullName.split(' ')[0]}! Aqui está um resumo da sua saúde hoje:`];

    if (sentimentScore > 0.3) {
      summaryParts.push('Você parece estar bem hoje! Continue assim. 💪');
    } else if (sentimentScore < -0.3) {
      summaryParts.push('Parece que não foi um dia tão fácil. Descanse bem e se precisar, consulte um médico. ❤️');
    } else {
      summaryParts.push('Dia dentro da normalidade. Registrei suas informações de saúde. 📊');
    }

    if (flags.length > 0) {
      summaryParts.push('\n⚠️ Pontos de atenção identificados:');
      if (flags.includes('possible_illness')) summaryParts.push('• Sintomas que podem indicar mal-estar. Fique de olho!');
      if (flags.includes('severe_pain')) summaryParts.push('• Dor intensa relatada. Recomendamos avaliação médica.');
      if (flags.includes('sleep_issue')) summaryParts.push('• Problema de sono detectado. O sono é essencial para a saúde!');
    }

    summaryParts.push('\nSuas informações foram salvas no seu prontuário IcodLife. Até amanhã! 🌟');

    return {
      summary: summaryParts.join('\n'),
      structured: { sentimentScore, flags, messageCount: userMessages.length },
      flags,
      sentimentScore,
    };
  }

  private buildGreeting(firstName: string): ChatMessage {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    return {
      role: 'assistant',
      content: `${period}, ${firstName}! 👋 Sou o HealthBot do IcodLife e estou aqui para um check-in rápido de saúde com você. Vamos começar?\n\nComo foi o seu sono esta noite? Dormiu bem?`,
      timestamp: new Date().toISOString(),
    };
  }

  private buildSystemPrompt(user: any): string {
    return `Você é o HealthBot do IcodLife, um assistente de saúde empático e profissional.
    
Usuário: ${user.fullName}, gênero: ${user.gender}
Condições conhecidas: ${user.chronicConditions?.join(', ') || 'nenhuma'}

Regras:
- Faça UMA pergunta por vez, de forma natural e empática
- Use linguagem simples e acolhedora em português brasileiro
- NUNCA faça diagnósticos médicos
- Se detectar sintomas graves, recomende buscar atendimento médico
- Registre informações de forma estruturada para o prontuário
- Para usuárias femininas, inclua perguntas sobre saúde feminina quando relevante`;
  }

  private personalizeQuestion(question: string, lastResponse: string, user: any): string {
    // Adicionar empatia baseada na última resposta
    const negative = ['ruim', 'mal', 'dor', 'cansado', 'não'];
    const hasNegative = negative.some(n => lastResponse.toLowerCase().includes(n));

    if (hasNegative) {
      return `Entendo, obrigado por me contar isso. ${question}`;
    }
    return question;
  }

  // ── HISTÓRICO DE SESSÕES ──────────────────────────────────────────────────

  async getChatHistory(userId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.aiHealthChat.findMany({
      where: { userId, sessionDate: { gte: since } },
      orderBy: { sessionDate: 'desc' },
      select: {
        id: true,
        sessionDate: true,
        completed: true,
        flags: true,
        sentimentScore: true,
        healthSummary: true,
      },
    });
  }
}
