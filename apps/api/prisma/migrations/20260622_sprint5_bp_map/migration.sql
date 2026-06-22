-- Sprint 5: Mapa de Pressão Arterial
-- Completa OphthalmologyExam truncado + cria OphthalmologyHistory + BloodPressureReading

-- ── Completar colunas truncadas em ophthalmology_exams ─────────────────────
ALTER TABLE "ophthalmology_exams"
  ADD COLUMN IF NOT EXISTS "astigmatism_axis_right"  INTEGER,
  ADD COLUMN IF NOT EXISTS "astigmatism_axis_left"   INTEGER,
  ADD COLUMN IF NOT EXISTS "contrast_score_right"    DECIMAL,
  ADD COLUMN IF NOT EXISTS "contrast_score_left"     DECIMAL,
  ADD COLUMN IF NOT EXISTS "estimated_myopia_right"  DECIMAL,
  ADD COLUMN IF NOT EXISTS "estimated_myopia_left"   DECIMAL,
  ADD COLUMN IF NOT EXISTS "estimated_astig_right"   DECIMAL,
  ADD COLUMN IF NOT EXISTS "estimated_astig_left"    DECIMAL,
  ADD COLUMN IF NOT EXISTS "confidence_score"        DECIMAL,
  ADD COLUMN IF NOT EXISTS "risk_level"              TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "report_summary"          TEXT,
  ADD COLUMN IF NOT EXISTS "recommendations"         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "symptoms"                TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "user_age"                INTEGER,
  ADD COLUMN IF NOT EXISTS "completed_at"            TIMESTAMP(3);

-- ── Criar tabela ophthalmology_history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ophthalmology_history" (
  "id"              TEXT NOT NULL,
  "user_id"         TEXT NOT NULL,
  "exam_id"         TEXT,
  "doctor_name"     TEXT,
  "crm_number"      TEXT,
  "spherical_right" DECIMAL,
  "spherical_left"  DECIMAL,
  "cylinder_right"  DECIMAL,
  "cylinder_left"   DECIMAL,
  "axis_right"      INTEGER,
  "axis_left"       INTEGER,
  "addition_right"  DECIMAL,
  "addition_left"   DECIMAL,
  "diagnoses"       TEXT[] NOT NULL DEFAULT '{}',
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ophthalmology_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ophthalmology_history_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ophthalmology_history_user_id_created_at_idx"
  ON "ophthalmology_history"("user_id", "created_at");

-- ── Enums para pressão arterial ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "BpClassification" AS ENUM ('normal','elevado','hipertensao1','hipertensao2','crise');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SleepQuality" AS ENUM ('boa','regular','ruim','insonia');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PhysicalActivityBp" AS ENUM ('nenhuma','leve','moderada','intensa');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "StressLevel" AS ENUM ('baixo','moderado','alto');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Criar tabela blood_pressure_readings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "blood_pressure_readings" (
  "id"                TEXT         NOT NULL,
  "user_id"           TEXT         NOT NULL,
  "systolic"          INTEGER      NOT NULL,
  "diastolic"         INTEGER      NOT NULL,
  "pulse"             INTEGER,
  "measured_at"       TIMESTAMP(3) NOT NULL,
  "arm"               TEXT,
  "classification"    "BpClassification" NOT NULL DEFAULT 'normal',
  "sleep_quality"     "SleepQuality",
  "alcohol_consumed"  BOOLEAN      DEFAULT false,
  "heavy_meal"        BOOLEAN      DEFAULT false,
  "high_sodium"       BOOLEAN      DEFAULT false,
  "physical_activity" "PhysicalActivityBp",
  "stress_level"      "StressLevel",
  "caffeine"          BOOLEAN      DEFAULT false,
  "took_medication"   BOOLEAN      DEFAULT false,
  "headache"          BOOLEAN      DEFAULT false,
  "dizziness"         BOOLEAN      DEFAULT false,
  "smoking"           BOOLEAN      DEFAULT false,
  "notes"             TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blood_pressure_readings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blood_pressure_readings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "blood_pressure_readings_user_id_measured_at_idx"
  ON "blood_pressure_readings"("user_id", "measured_at");
