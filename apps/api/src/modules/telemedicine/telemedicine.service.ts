// apps/api/src/modules/telemedicine/telemedicine.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TelemedicineService {
  constructor(private prisma: PrismaService) {}

  /** Médico cria sala de espera */
  async createRoom(doctorId: string, appointmentId?: string) {
    return this.prisma.telemedicineRoom.create({
      data: { doctorId, appointmentId, status: 'waiting' },
    });
  }

  /** Lista salas do médico (waiting + active) */
  async listDoctorRooms(doctorId: string) {
    return this.prisma.telemedicineRoom.findMany({
      where: { doctorId, status: { in: ['waiting', 'active'] } },
      include: { patient: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Histórico de salas do médico */
  async listDoctorHistory(doctorId: string, limit = 20) {
    return this.prisma.telemedicineRoom.findMany({
      where: { doctorId, status: { in: ['ended', 'cancelled'] } },
      include: { patient: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Busca sala pelo token (acesso público do paciente) */
  async getRoomByToken(token: string) {
    const room = await this.prisma.telemedicineRoom.findUnique({
      where: { token },
      include: {
        doctor: { select: { id: true, fullName: true, avatarUrl: true } },
        patient: { select: { id: true, fullName: true } },
      },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return room;
  }

  /** Paciente entra na sala de espera */
  async patientJoin(token: string, patientId: string | null, patientName: string, reason?: string) {
    const room = await this.prisma.telemedicineRoom.findUnique({ where: { token } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status === 'ended' || room.status === 'cancelled')
      throw new ForbiddenException('Esta consulta foi encerrada');

    return this.prisma.telemedicineRoom.update({
      where: { token },
      data: {
        patientId:   patientId ?? undefined,
        patientName: patientName,
        reason:      reason,
        status:      'waiting',
      },
      include: { doctor: { select: { id: true, fullName: true } } },
    });
  }

  /** Médico admite o paciente (inicia consulta) */
  async admitPatient(roomId: string, doctorId: string) {
    const room = await this.prisma.telemedicineRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.doctorId !== doctorId) throw new ForbiddenException();
    return this.prisma.telemedicineRoom.update({
      where: { id: roomId },
      data: { status: 'active', startedAt: new Date() },
    });
  }

  /** Encerra a consulta */
  async endRoom(roomId: string, doctorId: string, notes?: string) {
    const room = await this.prisma.telemedicineRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.doctorId !== doctorId) throw new ForbiddenException();

    const now = new Date();
    const durationSecs = room.startedAt
      ? Math.floor((now.getTime() - room.startedAt.getTime()) / 1000)
      : null;

    return this.prisma.telemedicineRoom.update({
      where: { id: roomId },
      data: { status: 'ended', endedAt: now, durationSecs: durationSecs ?? undefined, notes },
    });
  }

  /** Cancela sala */
  async cancelRoom(roomId: string, doctorId: string) {
    const room = await this.prisma.telemedicineRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException();
    if (room.doctorId !== doctorId) throw new ForbiddenException();
    return this.prisma.telemedicineRoom.update({
      where: { id: roomId },
      data: { status: 'cancelled' },
    });
  }
}
