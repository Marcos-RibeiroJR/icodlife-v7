-- Sprint 15: Telemedicina

CREATE TYPE "TelemedicineStatus" AS ENUM ('waiting', 'active', 'ended', 'cancelled');

CREATE TABLE "telemedicine_rooms" (
  "id"             TEXT NOT NULL,
  "token"          TEXT NOT NULL,
  "doctor_id"      TEXT NOT NULL,
  "patient_id"     TEXT,
  "appointment_id" TEXT,
  "status"         "TelemedicineStatus" NOT NULL DEFAULT 'waiting',
  "patient_name"   TEXT,
  "reason"         TEXT,
  "started_at"     TIMESTAMP(3),
  "ended_at"       TIMESTAMP(3),
  "duration_secs"  INTEGER,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "telemedicine_rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telemedicine_rooms_token_key" ON "telemedicine_rooms"("token");
CREATE INDEX "telemedicine_rooms_doctor_id_status_idx" ON "telemedicine_rooms"("doctor_id", "status");
CREATE INDEX "telemedicine_rooms_token_idx" ON "telemedicine_rooms"("token");

ALTER TABLE "telemedicine_rooms"
  ADD CONSTRAINT "telemedicine_rooms_doctor_id_fkey"
  FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "telemedicine_rooms"
  ADD CONSTRAINT "telemedicine_rooms_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
