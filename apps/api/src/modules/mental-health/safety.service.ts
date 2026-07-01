// apps/api/src/modules/mental-health/safety.service.ts
// Fluxo de segurança clínica — detecção de risco (ideação suicida / crise) e acionamento do cuidado.
// NÃO trata risco como "mais um escore": destaca alerta, oferece recursos de ajuda e notifica o médico.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { ScoringResult } from './scales';

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
}

export interface SafetyOutcome {
  suicideRisk: boolean;
  crisisRisk: boolean;
  message?: string;
  resources: CrisisResource[];
}

const BR_RESOURCES: CrisisResource[] = [
  { name: 'CVV — Centro de Valorização da Vida', contact: '188',
    description: 'Apoio emocional e prevenção do suicídio, gratuito e 24 horas, por telefone, chat ou e-mail.' },
  { name: 'SAMU', contact: '192',
    description: 'Atendimento móvel de urgência em caso de emergência médica.' },
  { name: 'CAPS / Emergência psiquiátrica', contact: 'Serviço de saúde mais próximo',
    description: 'Procure o CAPS de referência ou a emergência de um hospital em caso de risco imediato.' },
];

@Injectable()
export class SafetyService {
  private readonly logger = new Logger('MentalHealthSafety');

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  /** Monta a resposta acolhedora exibida ao paciente quando há sinal de risco. */
  build(result: ScoringResult): SafetyOutcome {
    const suicideRisk = !!result.flags?.suicideRisk;
    const crisisRisk = !!result.flags?.crisisRisk;

    if (!suicideRisk && !crisisRisk) {
      return { suicideRisk: false, crisisRisk: false, resources: [] };
    }

    const message = suicideRisk
      ? 'Percebemos que você indicou pensamentos de que seria melhor estar morto(a) ou de se machucar. ' +
        'Você não está sozinho(a) e existe ajuda disponível agora. Se estiver em risco imediato, ligue 188 (CVV) ' +
        'ou procure a emergência mais próxima. Estes resultados serão compartilhados com sua equipe de cuidado.'
      : 'Seus resultados indicam sofrimento significativo. Considere buscar apoio profissional. ' +
        'Se precisar conversar agora, o CVV atende gratuitamente pelo 188, 24 horas por dia.';

    return { suicideRisk, crisisRisk, message, resources: BR_RESOURCES };
  }

  /** Notifica o próprio paciente e, se houver, o médico vinculado ativo. Fire-and-forget seguro. */
  async notifyCareTeam(userId: string, scaleName: string, result: ScoringResult): Promise<void> {
    try {
      if (!result.flags?.suicideRisk && !result.flags?.crisisRisk) return;

      const priority = result.flags?.suicideRisk ? 'RISCO DE IDEAÇÃO SUICIDA' : 'sofrimento significativo';

      // Notifica o paciente com recursos de apoio.
      await this.notifications.create(userId, {
        type: 'alert',
        title: 'Apoio disponível — Saúde Mental',
        body: 'Identificamos sinais que merecem atenção. Ajuda gratuita: CVV 188 (24h). Sua equipe de cuidado foi avisada.',
        data: { module: 'mental-health', scale: scaleName, suicideRisk: !!result.flags?.suicideRisk },
      });

      // Notifica o(s) médico(s) vinculado(s) ativo(s).
      const links = await this.prisma.patientDoctor.findMany({
        where: { userId, status: 'active', doctorId: { not: null } },
        include: { doctor: { select: { userId: true } } },
      });

      const patient = await this.prisma.user.findUnique({
        where: { id: userId }, select: { fullName: true },
      });

      const doctorUserIds = Array.from(
        new Set(links.map(l => l.doctor?.userId).filter((x): x is string => !!x)),
      );

      await Promise.all(doctorUserIds.map(docUserId =>
        this.notifications.create(docUserId, {
          type: 'alert',
          title: `⚠️ Alerta de Saúde Mental — ${priority}`,
          body: `O paciente ${patient?.fullName ?? ''} apresentou sinais de ${priority} na escala ${scaleName}. Revisão prioritária recomendada.`,
          data: { module: 'mental-health', patientUserId: userId, scale: scaleName },
        }),
      ));
    } catch (err) {
      // Nunca deixar a falha de notificação quebrar o registro da avaliação.
      this.logger.error(`Falha ao notificar equipe de cuidado: ${(err as Error).message}`);
    }
  }
}
