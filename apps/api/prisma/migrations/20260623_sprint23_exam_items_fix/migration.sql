-- Sprint 23: Fix exam_result_items column names and ExamResult missing columns

-- Rename exam_result_id -> exam_id
ALTER TABLE "exam_result_items" RENAME COLUMN "exam_result_id" TO "exam_id";

-- Add missing columns to exam_results that schema expects
ALTER TABLE "exam_results"
  ADD COLUMN IF NOT EXISTS "exam_type"          TEXT,
  ADD COLUMN IF NOT EXISTS "ai_risk_level"      TEXT,
  ADD COLUMN IF NOT EXISTS "processing_status"  TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "ai_summary"         TEXT,
  ADD COLUMN IF NOT EXISTS "ai_flags"           TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "lab_name"           TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- exam_result_items: ensure status uses text default (not enum that may differ)
ALTER TABLE "exam_result_items"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
