// apps/api/src/modules/family/family.service.ts
import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { AuditService } from '../../common/audit/audit.service';
import { InviteFamilyDto } from './dto/invite-family.dto';
import { AcceptFamilyInviteDto } from './dto/accept-invite.dto';

@Injectable()
export class FamilyService {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
    private audit: AuditService,
  ) {}

  // ── CONVIDAR FAMILIAR ─────────────────────────────────────────────────────
  // Regra: o familiar convidado deve ser usuário ATIVO para aceitar

  async invite(userId: string, dto: InviteFamilyDto, ip: string) {
    // Verificar se quem convida é usuário ativo
    const inviter = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!inviter || inviter.status !== 'active') {
      throw new ForbiddenException('Apenas usuários ativos podem convidar familiares');
    }

    // Verificar se e-mail do convidado é usuário existente
    let invitedUser = null;
    if (dto.email) {
      invitedUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
    }

    // Criar entrada na árvore familiar
    const member = await this.prisma.familyMember.create({
      data: {
        userId,
        memberUserId: invitedUser?.id ?? null,
        relationship: dto.relationship as any,
        customLabel: dto.customLabel,
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender as any,
        shareHereditary: dto.shareHereditary ?? false,
        shareConditions: dto.shareConditions ?? false,
        inviteEmail: dto.email,
        inviteStatus: invitedUser ? 'pending' : 'pending',
      },
    });

    // Enviar notificação/e-mail de convite se tiver e-mail
    if (dto.email) {
      await this.notification.sendFamilyInvite({
        to: dto.email,
        inviterName: inviter.fullName,
        relationship: dto.relationship,
        inviteToken: member.inviteToken,
        invitedUserId: invitedUser?.id,
      });
    }

    await this.audit.log(userId, 'family.invite', 'family_member', member.id, ip);

    return member;
  }

  // ── ACEITAR CONVITE ───────────────────────────────────────────────────────
  // REGRA DE NEGÓCIO PRINCIPAL: só usuário ativo pode aceitar

  async acceptInvite(inviteToken: string, userId: string, ip: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        inviteToken,
        inviteStatus: 'pending',
        inviteExpiresAt: { gt: new Date() },
      },
    });

    if (!member) throw new NotFoundException('Convite não encontrado ou expirado');

    // *** REGRA CRÍTICA: verificar se quem aceita é USUÁRIO ATIVO ***
    const acceptingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!acceptingUser) throw new NotFoundException('Usuário não encontrado');

    if (acceptingUser.status !== 'active') {
      throw new ForbiddenException(
        'Você precisa ser um usuário ativo no IcodLife para aceitar convites familiares. ' +
        'Verifique seu e-mail para ativar sua conta.'
      );
    }

    // Vincular usuário ativo ao familiar
    const updated = await this.prisma.familyMember.update({
      where: { id: member.id },
      data: {
        memberUserId: userId,
        inviteStatus: 'accepted',
        acceptedAt: new Date(),
      },
    });

    await this.audit.log(userId, 'family.invite_accepted', 'family_member', member.id, ip);

    return { message: 'Convite aceito! Você agora faz parte da árvore familiar.', member: updated };
  }

  // ── LISTAR FAMÍLIA ────────────────────────────────────────────────────────

  async getFamily(userId: string) {
    const members = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        memberUser: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            status: true,
            gender: true,
            bloodType: true,
            allergies: true,
            chronicConditions: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filtrar dados sensíveis conforme permissão de compartilhamento
    return members.map(m => ({
      ...m,
      memberUser: m.memberUser ? {
        ...m.memberUser,
        allergies: m.shareConditions ? m.memberUser.allergies : undefined,
        chronicConditions: m.shareConditions ? m.memberUser.chronicConditions : undefined,
      } : null,
    }));
  }

  // ── HEREDITARY DATA ───────────────────────────────────────────────────────

  async getHereditaryData(userId: string) {
    const family = await this.prisma.familyMember.findMany({
      where: { userId, shareHereditary: true, inviteStatus: 'accepted' },
      include: {
        memberUser: {
          select: {
            fullName: true,
            gender: true,
            chronicConditions: true,
            bloodType: true,
            dateOfBirth: true,
          },
        },
      },
    });

    // Consolidar condições hereditárias
    const allConditions: Record<string, string[]> = {};
    family.forEach(f => {
      if (f.memberUser?.chronicConditions) {
        f.memberUser.chronicConditions.forEach(condition => {
          if (!allConditions[condition]) allConditions[condition] = [];
          allConditions[condition].push(f.memberUser!.fullName);
        });
      }
    });

    return {
      familyCount: family.length,
      hereditaryConditions: allConditions,
      riskFactors: this.calculateRiskFactors(allConditions, family),
    };
  }

  private calculateRiskFactors(conditions: Record<string, string[]>, family: any[]) {
    const risks: { condition: string; riskLevel: string; affectedMembers: string[] }[] = [];

    Object.entries(conditions).forEach(([condition, members]) => {
      const pct = (members.length / Math.max(family.length, 1)) * 100;
      risks.push({
        condition,
        riskLevel: pct >= 50 ? 'high' : pct >= 25 ? 'medium' : 'low',
        affectedMembers: members,
      });
    });

    return risks.sort((a, b) =>
      ['high','medium','low'].indexOf(a.riskLevel) - ['high','medium','low'].indexOf(b.riskLevel)
    );
  }
}
