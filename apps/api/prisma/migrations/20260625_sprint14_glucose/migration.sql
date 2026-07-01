-- Sprint 14: Glicemia / Módulo Diabetes
-- Cria enum GlucoseContext, tabela glucose_readings e hba1c_readings

-- Enum GlucoseContext
DO $$ BEGIN
  CREATE TYPE "GlucoseContext" AS ENUM (
    'fasting', 'pre_meal', 'post_meal', 'bedtime', 'random', 'post_exercise'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela de leituras de glicemia
CREATE TABLE IF NOT EXISTS "glucose_readings" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id"         TEXT NOT NULL,
  "value"           DECIMAL(6,1) NOT NULL,
  "context"         "GlucoseContext" NOT NULL DEFAULT 'random',
  "measured_at"     TIMESTAMP(3) NOT NULL,
  "notes"           TEXT,
  "carbs_grams"     INTEGER,
  "insulin_units"   DECIMAL(5,2),
  "exercise_before" BOOLEAN DEFAULT false,
  "sick"            BOOLEAN DEFAULT false,
  "alert_level"     TEXT,
  "alert_sent"      BOOLEAN NOT NULL DEFAULT false,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "glucose_readings_pkey" PRIMARY KEY ("id")
);

-- FK e índice glucose_readings
DO $$ BEGIN
  ALTER TABLE "glucose_readings"
    ADD CONSTRAINT "glucose_readings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "glucose_readings_user_id_measured_at_idx"
  ON "glucose_readings"("user_id", "measured_at");

-- Tabela de HbA1c
CREATE TABLE IF NOT EXISTS "hba1c_readings" (
  "id"                     TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id"                TEXT NOT NULL,
  "value"                  DECIMAL(4,1) NOT NULL,
  "measured_at"            TIMESTAMP(3) NOT NULL,
  "lab_name"               TEXT,
  "estimated_avg_glucose"  DECIMAL(6,1),
  "notes"                  TEXT,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "hba1c_readings_pkey" PRIMARY KEY ("id")
);

-- FK e índice hba1c_readings
DO $$ BEGIN
  ALTER TABLE "hba1c_readings"
    ADD CONSTRAINT "hba1c_readings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "hba1c_readings_user_id_measured_at_idx"
  ON "hba1c_readings"("user_id", "measured_at");
