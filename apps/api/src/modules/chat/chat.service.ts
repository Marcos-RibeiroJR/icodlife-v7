// apps/api/src/modules/chat/chat.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  // Busca ou cria sala entre médico e paciente
  async getOrCreateRoom(doctorUserId: string, patientId: string) {
    const doc = await this.getDoctor(doctorUserId);
    return this.prisma.chatRoom.upsert({
      where:  { doctorId_patientId: { doctorId: doc.id, patientId } },
      create: { doctorId: doc.id, patientId },
      update: {},
      include: {
        patient: { select: { id: true, fullName: true, icode: true, avatarUrl: true } },
      },
    });
  }

  // Lista todas as salas do médico
  async listRooms(doctorUserId: string) {
    const doc = await this.getDoctor(doctorUserId);
    return this.prisma.chatRoom.findMany({
      where:   { doctorId: doc.id },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      include: {
        patient: { select: { id: true, fullName: true, icode: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  // Histórico de mensagens de uma sala
  async getMessages(roomId: string, before?: string, limit = 40) {
    const where: any = { roomId };
    if (before) where.createdAt = { lt: new Date(before) };
    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
    return messages.reverse(); // cronológico
  }

  // Salva mensagem e atualiza lastMessageAt da sala
  async saveMessage(roomId: string, senderId: string, body: string) {
    const [msg] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { roomId, senderId, body },
        include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
      }),
      this.prisma.chatRoom.update({
        where: { id: roomId },
        data:  { lastMessageAt: new Date() },
      }),
    ]);
    return msg;
  }

  // Marcar mensagens de uma sala como lidas por um userId
  async markRead(roomId: string, userId: string) {
    return this.prisma.chatMessage.updateMany({
      where: { roomId, readAt: null, senderId: { not: userId } },
      data:  { readAt: new Date() },
    });
  }

  // Verifica se userId tem acesso à sala (é o médico ou o paciente)
  async verifyAccess(roomId: string, userId: string): Promise<boolean> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { doctor: { select: { userId: true } } },
    });
    if (!room) return false;
    return room.patientId === userId || room.doctor.userId === userId;
  }
}
