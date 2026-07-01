-- Sprint 24: Add all missing columns to align DB with Prisma schema

-- exam_results
ALTER TABLE "exam_results"
  ADD COLUMN IF NOT EXISTS "source_file_url" TEXT;

-- appointments (missing scheduling/telehealth fields)
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "duration"          INTEGER,
  ADD COLUMN IF NOT EXISTS "telehealth"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "address"           TEXT,
  ADD COLUMN IF NOT EXISTS "meeting_url"       TEXT,
  ADD COLUMN IF NOT EXISTS "reminder_minutes"  INTEGER,
  ADD COLUMN IF NOT EXISTS "reminder_at"       TIMESTAMP(3);

-- audit_logs
ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "resource" TEXT;

-- family_members (mapped column names)
ALTER TABLE "family_members"
  ADD COLUMN IF NOT EXISTS "owner_id"       TEXT,
  ADD COLUMN IF NOT EXISTS "linked_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "invite_expiry"  TIMESTAMP(3);

-- health_records
ALTER TABLE "health_records"
  ADD COLUMN IF NOT EXISTS "file_name"    TEXT,
  ADD COLUMN IF NOT EXISTS "file_url"     TEXT,
  ADD COLUMN IF NOT EXISTS "file_size"    INTEGER,
  ADD COLUMN IF NOT EXISTS "mime_type"    TEXT,
  ADD COLUMN IF NOT EXISTS "tags"         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "is_processed" BOOLEAN NOT NULL DEFAULT false;

-- lifestyle_snapshots
ALTER TABLE "lifestyle_snapshots"
  ADD COLUMN IF NOT EXISTS "snapshot_at" TIMESTAMP(3);

-- menstrual_daily_logs
ALTER TABLE "menstrual_daily_logs"
  ADD COLUMN IF NOT EXISTS "cycle_id"    TEXT,
  ADD COLUMN IF NOT EXISTS "flow"        TEXT,
  ADD COLUMN IF NOT EXISTS "temperature" DECIMAL;

-- ophthalmology_exams
ALTER TABLE "ophthalmology_exams"
  ADD COLUMN IF NOT EXISTS "visual_acuity_right" TEXT,
  ADD COLUMN IF NOT EXISTS "visual_acuity_left"  TEXT;

-- psychosocial_assessments
ALTER TABLE "psychosocial_assessments"
  ADD COLUMN IF NOT EXISTS "assessment_type" TEXT,
  ADD COLUMN IF NOT EXISTS "score"           INTEGER,
  ADD COLUMN IF NOT EXISTS "ai_analysis"     TEXT;

-- share_tokens
ALTER TABLE "share_tokens"
  ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "max_views"  INTEGER;

-- ai_health_chats
ALTER TABLE "ai_health_chats"
  ADD COLUMN IF NOT EXISTS "session_id" TEXT,
  ADD COLUMN IF NOT EXISTS "content"    TEXT;
