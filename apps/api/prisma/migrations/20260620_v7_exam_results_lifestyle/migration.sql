-- IcodLife v7 Migration (corrigido — user_id como TEXT para compatibilidade)

-- 1. Campos novos em users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_hash"  TEXT,
  ADD COLUMN IF NOT EXISTS "city_name"      TEXT,
  ADD COLUMN IF NOT EXISTS "state_code"     TEXT,
  ADD COLUMN IF NOT EXISTS "ibge_code"      TEXT;

-- 2. Enum ExamItemStatus
DO $$ BEGIN
  CREATE TYPE "ExamItemStatus" AS ENUM ('normal','low','high','critical_low','critical_high','pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. ExamResult
CREATE TABLE IF NOT EXISTS "exam_results" (
  "id"                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"             TEXT        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "health_record_id"    TEXT        REFERENCES "health_records"("id"),
  "exam_date"           TIMESTAMPTZ NOT NULL,
  "lab_name"            TEXT,
  "doctor_name"         TEXT,
  "exam_type"           TEXT        NOT NULL DEFAULT 'outro',
  "ai_summary"          TEXT,
  "ai_flags"            TEXT[]      NOT NULL DEFAULT '{}',
  "ai_risk_level"       TEXT        NOT NULL DEFAULT 'normal',
  "ai_processed_at"     TIMESTAMPTZ,
  "ocr_raw_text"        TEXT,
  "processing_status"   TEXT        NOT NULL DEFAULT 'pending',
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_date ON "exam_results"("user_id", "exam_date");

-- 4. ExamResultItem
CREATE TABLE IF NOT EXISTS "exam_result_items" (
  "id"                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "exam_result_id"      TEXT        NOT NULL REFERENCES "exam_results"("id") ON DELETE CASCADE,
  "user_id"             TEXT        NOT NULL,
  "marker"              TEXT        NOT NULL,
  "marker_code"         TEXT,
  "unit"                TEXT,
  "value"               DECIMAL     NOT NULL,
  "raw_value"           TEXT,
  "ref_min"             DECIMAL,
  "ref_max"             DECIMAL,
  "ref_source"          TEXT,
  "status"              "ExamItemStatus" NOT NULL DEFAULT 'pending',
  "delta_percent"       DECIMAL,
  "previous_value"      DECIMAL,
  "previous_exam_date"  TIMESTAMPTZ,
  "exam_date"           TIMESTAMPTZ NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_items_user_marker_date ON "exam_result_items"("user_id", "marker", "exam_date");
CREATE INDEX IF NOT EXISTS idx_exam_items_user_date        ON "exam_result_items"("user_id", "exam_date");

-- 5. LifestyleProfile
CREATE TABLE IF NOT EXISTS "lifestyle_profiles" (
  "id"                           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"                      TEXT        NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "height_cm"                    DECIMAL,
  "weight_kg"                    DECIMAL,
  "bmi"                          DECIMAL,
  "bmi_category"                 TEXT,
  "smoking_status"               TEXT        NOT NULL DEFAULT 'never',
  "cigarettes_per_day"           INT,
  "smoking_years"                INT,
  "quit_date"                    TIMESTAMPTZ,
  "alcohol_status"               TEXT        NOT NULL DEFAULT 'none',
  "drinks_per_week"              INT,
  "alcohol_types"                TEXT[]      NOT NULL DEFAULT '{}',
  "exercise_frequency"           TEXT,
  "exercise_types"               TEXT[]      NOT NULL DEFAULT '{}',
  "exercise_minutes_per_session" INT,
  "sleep_hours_avg"              DECIMAL,
  "sleep_quality"                INT,
  "stress_level"                 INT,
  "mood_avg"                     INT,
  "mental_health_diagnoses"      TEXT[]      NOT NULL DEFAULT '{}',
  "therapy_frequency"            TEXT,
  "sexually_active"              BOOLEAN,
  "contraception_type"           TEXT,
  "std_protection"               BOOLEAN,
  "work_hours_per_week"          INT,
  "work_environment"             TEXT,
  "ergonomic_risk"               INT,
  "occupational_chemicals"       BOOLEAN,
  "diet_type"                    TEXT,
  "meals_per_day"                INT,
  "water_liters_day"             DECIMAL,
  "health_score"                 INT,
  "health_score_notes"           TEXT,
  "created_at"                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. LifestyleSnapshot
CREATE TABLE IF NOT EXISTS "lifestyle_snapshots" (
  "id"            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id"       TEXT        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "profile_id"    TEXT        NOT NULL REFERENCES "lifestyle_profiles"("id") ON DELETE CASCADE,
  "snapshot_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "data"          JSONB       NOT NULL DEFAULT '{}',
  "city_name"     TEXT,
  "state_code"    TEXT,
  "country_code"  TEXT        NOT NULL DEFAULT 'BR',
  "ibge_code"     TEXT,
  "bmi"           DECIMAL,
  "health_score"  INT
);
CREATE INDEX IF NOT EXISTS idx_ls_snapshots_user_date  ON "lifestyle_snapshots"("user_id", "snapshot_date");
CREATE INDEX IF NOT EXISTS idx_ls_snapshots_state_date ON "lifestyle_snapshots"("state_code", "snapshot_date");
CREATE INDEX IF NOT EXISTS idx_ls_snapshots_ibge_date  ON "lifestyle_snapshots"("ibge_code", "snapshot_date");
