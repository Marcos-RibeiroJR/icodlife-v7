// apps/api/src/modules/family/family.service.ts
import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { AuditService } from '../../common/audit/audit.service';
import { InviteFamilyDto } from './dto/invite-family.dto';

@Injectable()
export class FamilyService {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
    private audit: AuditService,
  ) {}

  async invite(userId: string, dto: InviteFamilyDto, ip: string) {
    const inviter = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!inviter || inviter.status !== 'active') {
      throw new ForbiddenException('Apenas usuários ativos podem convidar familiares');
    }

    let invitedUser = null;
    if (dto.email) {
      invitedUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
    }

    const member = await this.prisma.familyMember.create({
      data: {
        ownerId: userId,
        linkedUserId: invitedUser?.id ?? null,
        relationship: dto.relationship as any,
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender as any,
        inviteEmail: dto.email,
        inviteStatus: 'pending',
      },
    });

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

  async acceptInvite(inviteToken: string, userId: string, ip: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: {
        inviteToken,
        inviteStatus: 'pending',
        inviteExpiry: { gt: new Date() },
      },
    });

    if (!member) throw new NotFoundException('Convite não encontrado ou expirado');

    const acceptingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!acceptingUser) throw new NotFoundException('Usuário não encontrado');
    if (acceptingUser.status !== 'active') {
      throw new ForbiddenException(
        'Você precisa ser um usuário ativo no IcodLife para aceitar convites familiares. ' +
        'Verifique seu e-mail para ativar sua conta.'
      );
    }

    const updated = await this.prisma.familyMember.update({
      where: { id: member.id },
      data: {
        linkedUserId: userId,
        inviteStatus: 'accepted',
      },
    });

    await this.audit.log(userId, 'family.invite_accepted', 'family_member', member.id, ip);

    return { message: 'Convite aceito! Você agora faz parte da árvore familiar.', member: updated };
  }

  async getFamily(userId: string) {
    return this.prisma.familyMember.findMany({
      where: { ownerId: userId },
      include: {
        linkedUser: {
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
  }

  async removeMember(userId: string, id: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id, ownerId: userId },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    await this.prisma.familyMember.delete({ where: { id } });
    return { message: 'Removido' };
  }

  async getHereditaryData(userId: string) {
    const family = await this.prisma.familyMember.findMany({
      where: { ownerId: userId, inviteStatus: 'accepted' },
      include: {
        linkedUser: {
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

    const allConditions: Record<string, string[]> = {};
    family.forEach(f => {
      if (f.linkedUser?.chronicConditions) {
        f.linkedUser.chronicConditions.forEach(condition => {
          if (!allConditions[condition]) allConditions[condition] = [];
          allConditions[condition].push(f.linkedUser!.fullName);
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
