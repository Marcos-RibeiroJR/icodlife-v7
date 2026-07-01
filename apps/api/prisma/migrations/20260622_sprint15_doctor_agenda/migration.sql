-- Sprint 15: Minha Agenda — tabelas de carga horária e agendamentos do médico

-- Carga horária semanal do médico
CREATE TABLE "doctor_working_hours" (
    "id"           TEXT NOT NULL,
    "doctor_id"    TEXT NOT NULL,
    "day_of_week"  INTEGER NOT NULL,
    "start_time"   TEXT NOT NULL,
    "end_time"     TEXT NOT NULL,
    "slot_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_working_hours_pkey" PRIMARY KEY ("id")
);

-- Bloqueios pontuais (férias, feriados, pausas)
CREATE TABLE "doctor_blocked_slots" (
    "id"         TEXT NOT NULL,
    "doctor_id"  TEXT NOT NULL,
    "date"       DATE NOT NULL,
    "start_time" TEXT,
    "end_time"   TEXT,
    "reason"     TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_blocked_slots_pkey" PRIMARY KEY ("id")
);

-- Consultas agendadas pelo médico
CREATE TABLE "doctor_appointments" (
    "id"               TEXT NOT NULL,
    "doctor_id"        TEXT NOT NULL,
    "patient_doctor_id" TEXT,
    "patient_name"     TEXT NOT NULL,
    "patient_phone"    TEXT,
    "patient_icode"    TEXT,
    "scheduled_at"     TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "status"           TEXT NOT NULL DEFAULT 'scheduled',
    "type"             TEXT NOT NULL DEFAULT 'consulta',
    "notes"            TEXT,
    "color"            TEXT NOT NULL DEFAULT '#2563EB',
    "price"            DECIMAL(65,30),
    "payment_status"   TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_appointments_pkey" PRIMARY KEY ("id")
);

-- Índice único: um médico só pode ter um horário por dia da semana
CREATE UNIQUE INDEX "doctor_working_hours_doctor_id_day_of_week_key"
    ON "doctor_working_hours"("doctor_id", "day_of_week");

-- Índice de busca por período
CREATE INDEX "doctor_appointments_doctor_id_scheduled_at_idx"
    ON "doctor_appointments"("doctor_id", "scheduled_at");

-- FK: carga horária → doctors
ALTER TABLE "doctor_working_hours"
    ADD CONSTRAINT "doctor_working_hours_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: bloqueios → doctors
ALTER TABLE "doctor_blocked_slots"
    ADD CONSTRAINT "doctor_blocked_slots_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: agendamentos → doctors
ALTER TABLE "doctor_appointments"
    ADD CONSTRAINT "doctor_appointments_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: agendamentos → patient_doctors (opcional)
ALTER TABLE "doctor_appointments"
    ADD CONSTRAINT "doctor_appointments_patient_doctor_id_fkey"
    FOREIGN KEY ("patient_doctor_id") REFERENCES "patient_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
