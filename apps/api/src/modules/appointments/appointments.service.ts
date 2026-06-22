import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}
  list(userId: string) { return this.prisma.appointment.findMany({ where: { userId }, orderBy: { appointmentAt: 'asc' } }); }
  create(userId: string, d: any) { return this.prisma.appointment.create({ data: { userId, doctorName: d.doctorName, specialty: d.specialty, location: d.location, appointmentAt: new Date(d.appointmentAt), notes: d.notes, cnesCode: d.cnesCode } }); }
  update(userId: string, id: string, d: any) { return this.prisma.appointment.updateMany({ where: { id, userId }, data: { ...d, ...(d.appointmentAt&&{appointmentAt:new Date(d.appointmentAt)}) } }); }
  remove(userId: string, id: string) { return this.prisma.appointment.deleteMany({ where: { id, userId } }); }
}
