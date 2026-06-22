// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
// MongooseModule removido — nenhum módulo usa Mongoose (tudo via Prisma/PostgreSQL)
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamilyModule } from './modules/family/family.module';
import { RecordsModule } from './modules/records/records.module';
import { MenstrualModule } from './modules/menstrual/menstrual.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { ShareModule } from './modules/share/share.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OphthalmologyModule } from './modules/ophthalmology/ophthalmology.module';
import { BloodPressureModule } from './modules/blood-pressure/blood-pressure.module';
import { OccupationalHealthModule } from './modules/occupational-health/occupational-health.module';
// v7
import { ExamResultsModule } from './modules/exam-results/exam-results.module';
import { LifestyleModule } from './modules/lifestyle/lifestyle.module';
// Sprint 6 — Módulo Doutor
import { DoctorModule } from './modules/doctor/doctor.module';
import { MeusMedicosModule } from './modules/meus-medicos/meus-medicos.module';
// Sprint 7 — Prontuário (QR Code sharing)
import { ProntuarioModule } from './modules/prontuario/prontuario.module';
// Sprint 8 — Módulo Cirurgia
import { SurgeryModule } from './modules/surgery/surgery.module';
// Sprint 10 — Módulo Vacinas
import { VaccinesModule } from './modules/vaccines/vaccines.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuditModule } from './common/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    AuditModule,
    AuthModule,
    UsersModule,
    FamilyModule,
    RecordsModule,
    MenstrualModule,
    AiChatModule,
    ShareModule,
    MedicationsModule,
    AppointmentsModule,
    NotificationsModule,
    // ── Especialidades ─────────────────────────────────────────────
    OphthalmologyModule,
    OccupationalHealthModule,
    // ── v7 — Novos módulos ─────────────────────────────────────────
    ExamResultsModule,
    LifestyleModule,
    BloodPressureModule,
    // ── Sprint 6 — Módulo Doutor ───────────────────────────────────
    DoctorModule,
    MeusMedicosModule,
    // ── Sprint 7 — Prontuário ──────────────────────────────────────
    ProntuarioModule,
    // ── Sprint 8 — Cirurgia ────────────────────────────────────────
    SurgeryModule,
    // ── Sprint 10 — Vacinas ────────────────────────────────────────
    VaccinesModule,
  ],
})
export class AppModule {}
