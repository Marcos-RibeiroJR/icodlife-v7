// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
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
import { CatalogModule } from './modules/catalog/catalog.module';
import { BloodPressureModule } from './modules/blood-pressure/blood-pressure.module';
import { OccupationalHealthModule } from './modules/occupational-health/occupational-health.module';
import { MentalHealthModule } from './modules/mental-health/mental-health.module';
import { AsoModule } from './modules/aso/aso.module';
import { CompanyModule } from './modules/company/company.module';
import { ExamResultsModule } from './modules/exam-results/exam-results.module';
import { LifestyleModule } from './modules/lifestyle/lifestyle.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { MeusMedicosModule } from './modules/meus-medicos/meus-medicos.module';
import { ProntuarioModule } from './modules/prontuario/prontuario.module';
import { SurgeryModule } from './modules/surgery/surgery.module';
import { VaccinesModule } from './modules/vaccines/vaccines.module';
import { BodyMetricsModule } from './modules/body-metrics/body-metrics.module';
import { DoctorAgendaModule } from './modules/doctor-agenda/doctor-agenda.module';
import { DoctorPrescriptionsModule } from './modules/doctor-prescriptions/doctor-prescriptions.module';
import { DoctorStaffModule } from './modules/doctor-staff/doctor-staff.module';
import { DoctorFinanceiroModule } from './modules/doctor-financeiro/doctor-financeiro.module';
import { DoctorAnalyticsModule } from './modules/doctor-analytics/doctor-analytics.module';
import { ChatModule } from './modules/chat/chat.module';
import { GlucoseModule } from './modules/glucose/glucose.module';
import { ExportModule } from './modules/export/export.module';
import { TelemedicineModule } from './modules/telemedicine/telemedicine.module';
import { PushModule } from './modules/push/push.module';
import { ClinicModule } from './modules/clinic/clinic.module';
import { AtendimentoModule } from './modules/atendimento/atendimento.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuditModule } from './common/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ScheduleModule.forRoot(),
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
    OphthalmologyModule,
    CatalogModule,
    BloodPressureModule,
    OccupationalHealthModule,
    MentalHealthModule,
    AsoModule,
    CompanyModule,
    ExamResultsModule,
    LifestyleModule,
    DoctorModule,
    MeusMedicosModule,
    ProntuarioModule,
    SurgeryModule,
    VaccinesModule,
    BodyMetricsModule,
    DoctorAgendaModule,
    DoctorPrescriptionsModule,
    DoctorStaffModule,
    DoctorFinanceiroModule,
    DoctorAnalyticsModule,
    ChatModule,
    GlucoseModule,
    ExportModule,
    TelemedicineModule,
    PushModule,
    ClinicModule,
    AtendimentoModule,
  ],
})
export class AppModule {}
