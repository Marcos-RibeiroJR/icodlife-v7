-- Sprint 22: Fix medications and medication_logs to match current schema

-- ── medications: add missing columns ─────────────────────────────────────────
ALTER TABLE "medications"
  ADD COLUMN IF NOT EXISTS "active_ingredient"  TEXT,
  ADD COLUMN IF NOT EXISTS "unit"               TEXT,
  ADD COLUMN IF NOT EXISTS "form"               TEXT,
  ADD COLUMN IF NOT EXISTS "times_per_day"      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "scheduled_times"    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "is_continuous"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stock_quantity"     INTEGER,
  ADD COLUMN IF NOT EXISTS "stock_unit"         TEXT,
  ADD COLUMN IF NOT EXISTS "low_stock_alert"    INTEGER,
  ADD COLUMN IF NOT EXISTS "indication"         TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- frequency was JSONB, convert to TEXT
ALTER TABLE "medications" ALTER COLUMN "frequency" TYPE TEXT USING
  CASE
    WHEN frequency::text = '"daily"' THEN 'daily'
    WHEN frequency::text = '"weekly"' THEN 'weekly'
    WHEN frequency::text = '"monthly"' THEN 'monthly'
    ELSE TRIM(BOTH '"' FROM frequency::text)
  END;
ALTER TABLE "medications" ALTER COLUMN "frequency" SET DEFAULT 'daily';

-- ── medication_logs: align to schema (takenAt NOT NULL, drop scheduled_at) ───
-- Make taken_at NOT NULL with a default for existing rows
UPDATE "medication_logs" SET "taken_at" = "scheduled_at" WHERE "taken_at" IS NULL;
ALTER TABLE "medication_logs" ALTER COLUMN "taken_at" SET NOT NULL;

-- Drop old scheduled_at column (not in schema)
ALTER TABLE "medication_logs" DROP COLUMN IF EXISTS "scheduled_at";

-- Rename skipped -> was_skipped
ALTER TABLE "medication_logs" RENAME COLUMN "skipped" TO "was_skipped";

-- Add missing columns
ALTER TABLE "medication_logs"
  ADD COLUMN IF NOT EXISTS "notes"       TEXT,
  ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
