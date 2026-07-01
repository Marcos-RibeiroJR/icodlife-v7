/*
  Warnings:

  - You are about to drop the column `completed` on the `ai_health_chats` table. All the data in the column will be lost.
  - You are about to drop the column `flags` on the `ai_health_chats` table. All the data in the column will be lost.
  - You are about to drop the column `health_summary` on the `ai_health_chats` table. All the data in the column will be lost.
  - You are about to drop the column `messages` on the `ai_health_chats` table. All the data in the column will be lost.
  - You are about to drop the column `sentiment_score` on the `ai_health_chats` table. All the data in the column will be lost.
  - You are about to drop the column `session_date` on the `ai_health_chats` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `ai_health_chats` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_sent` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `resource_type` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `body_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `patient_doctor_id` on the `chat_rooms` table. All the data in the column will be lost.
  - You are about to drop the column `issued_at` on the `doctor_exam_orders` table. All the data in the column will be lost.
  - You are about to drop the column `issued_at` on the `doctor_prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `delta_percent` on the `exam_result_items` table. All the data in the column will be lost.
  - You are about to drop the column `marker_code` on the `exam_result_items` table. All the data in the column will be lost.
  - You are about to drop the column `previous_exam_date` on the `exam_result_items` table. All the data in the column will be lost.
  - You are about to drop the column `previous_value` on the `exam_result_items` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `exam_result_items` table. All the data in the column will be lost.
  - You are about to drop the column `ai_processed_at` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_name` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `health_record_id` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `ocr_raw_text` on the `exam_results` table. All the data in the column will be lost.
  - You are about to drop the column `accepted_at` on the `family_members` table. All the data in the column will be lost.
  - You are about to drop the column `custom_label` on the `family_members` table. All the data in the column will be lost.
  - You are about to drop the column `invite_expires_at` on the `family_members` table. All the data in the column will be lost.
  - You are about to drop the column `member_user_id` on the `family_members` table. All the data in the column will be lost.
  - You are about to drop the column `share_conditions` on the `family_members` table. All the data in the column will be lost.
  - You are about to drop the column `share_hereditary` on the `family_members` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `family_members` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_name` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `is_shared` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `lab_name` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `mongo_doc_id` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `ocr_text` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `record_type` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `result_notes` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `result_status` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `s3_key` on the `health_records` table. All the data in the column will be lost.
  - You are about to drop the column `health_score` on the `lifestyle_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `health_score_notes` on the `lifestyle_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `city_name` on the `lifestyle_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `country_code` on the `lifestyle_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `lifestyle_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `health_score` on the `lifestyle_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `ibge_code` on the `lifestyle_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `profile_id` on the `lifestyle_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `snapshot_date` on the `lifestyle_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `state_code` on the `lifestyle_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `last_purchase_date` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `remaining_pills` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `total_pills` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `current_phase` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `cycle_end` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `cycle_start` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `flow_intensity` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `mood` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `next_cycle_predicted` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `ovulation_predicted` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `symptoms` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `menstrual_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `basal_temp` on the `menstrual_daily_logs` table. All the data in the column will be lost.
  - You are about to drop the column `cervical_mucus` on the `menstrual_daily_logs` table. All the data in the column will be lost.
  - You are about to drop the column `flow_intensity` on the `menstrual_daily_logs` table. All the data in the column will be lost.
  - You are about to drop the column `logged_date` on the `menstrual_daily_logs` table. All the data in the column will be lost.
  - You are about to alter the column `temperature` on the `menstrual_daily_logs` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to drop the column `acuity_left_eye` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `acuity_right_eye` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `astigmatism_left` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `astigmatism_right` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `device_type` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_distance_cm` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `snellen_left_raw` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `snellen_right_raw` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `answered_count` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `category_scores` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `completed_at` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `consent_given` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `data_retention_days` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `employment_type` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `laudo` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `overall_score` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `overall_tier` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `recommendations` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `topRisks` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `weekly_overtime_hours` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `work_regime` on the `psychosocial_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `access_ip` on the `share_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `accessed_at` on the `share_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `custom_fields` on the `share_tokens` table. All the data in the column will be lost.
  - The `status` column on the `surgeries` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[invite_token]` on the table `family_members` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role` to the `ai_health_chats` table without a default value. This is not possible if the table is not empty.
  - Made the column `session_id` on table `ai_health_chats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content` on table `ai_health_chats` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Made the column `duration` on table `appointments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `resource` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `raw_value` on table `exam_result_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `full_name` on table `family_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `owner_id` on table `family_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `category` on table `health_records` required. This step will fail if there are existing NULL values in that column.
  - Made the column `file_name` on table `health_records` required. This step will fail if there are existing NULL values in that column.
  - Made the column `file_url` on table `health_records` required. This step will fail if there are existing NULL values in that column.
  - Made the column `snapshot_at` on table `lifestyle_snapshots` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `start_date` to the `menstrual_cycles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `menstrual_daily_logs` table without a default value. This is not possible if the table is not empty.
  - Made the column `assessment_type` on table `psychosocial_assessments` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'completed', 'canceled', 'no_show');

-- CreateEnum
CREATE TYPE "SurgeryStatus" AS ENUM ('scheduled', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "VaccinationStatus" AS ENUM ('completed', 'scheduled', 'skipped');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShareAccessLevel" ADD VALUE 'medium';
ALTER TYPE "ShareAccessLevel" ADD VALUE 'complete';

-- DropForeignKey
ALTER TABLE "blood_pressure_readings" DROP CONSTRAINT "blood_pressure_readings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_rooms" DROP CONSTRAINT "chat_rooms_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "doctor_staff" DROP CONSTRAINT "doctor_staff_user_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_results" DROP CONSTRAINT "exam_results_health_record_id_fkey";

-- DropForeignKey
ALTER TABLE "family_members" DROP CONSTRAINT "family_members_member_user_id_fkey";

-- DropForeignKey
ALTER TABLE "family_members" DROP CONSTRAINT "family_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "glucose_readings" DROP CONSTRAINT "glucose_readings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "hba1c_readings" DROP CONSTRAINT "hba1c_readings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lifestyle_snapshots" DROP CONSTRAINT "lifestyle_snapshots_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "medication_logs" DROP CONSTRAINT "medication_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "surgeries" DROP CONSTRAINT "surgeries_user_id_fkey";

-- DropForeignKey
ALTER TABLE "vaccination_records" DROP CONSTRAINT "vaccination_records_user_id_fkey";

-- DropForeignKey
ALTER TABLE "vaccination_records" DROP CONSTRAINT "vaccination_records_vaccine_id_fkey";

-- DropIndex
DROP INDEX "ai_health_chats_user_id_session_date_key";

-- DropIndex
DROP INDEX "doctor_exam_orders_doctor_id_issued_at_idx";

-- DropIndex
DROP INDEX "doctor_prescriptions_doctor_id_issued_at_idx";

-- DropIndex
DROP INDEX "doctor_staff_doctor_id_user_id_key";

-- DropIndex
DROP INDEX "doctors_specialties_idx";

-- DropIndex
DROP INDEX "exam_result_items_user_id_exam_date_idx";

-- DropIndex
DROP INDEX "lifestyle_snapshots_ibge_code_snapshot_date_idx";

-- DropIndex
DROP INDEX "lifestyle_snapshots_state_code_snapshot_date_idx";

-- DropIndex
DROP INDEX "lifestyle_snapshots_user_id_snapshot_date_idx";

-- DropIndex
DROP INDEX "menstrual_daily_logs_user_id_logged_date_key";

-- DropIndex
DROP INDEX "idx_surgeries_user";

-- AlterTable
ALTER TABLE "ai_health_chats" DROP COLUMN "completed",
DROP COLUMN "flags",
DROP COLUMN "health_summary",
DROP COLUMN "messages",
DROP COLUMN "sentiment_score",
DROP COLUMN "session_date",
DROP COLUMN "updated_at",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "role" TEXT NOT NULL,
ALTER COLUMN "session_id" SET NOT NULL,
ALTER COLUMN "content" SET NOT NULL;

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "reminder_sent",
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#DC2626',
ADD COLUMN     "patient_doctor_id" TEXT,
ADD COLUMN     "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "duration" SET NOT NULL,
ALTER COLUMN "duration" SET DEFAULT 30;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "resource_type",
ALTER COLUMN "resource" SET NOT NULL;

-- AlterTable
ALTER TABLE "blood_pressure_readings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "body_metrics" DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "chat_rooms" DROP COLUMN "patient_doctor_id";

-- AlterTable
ALTER TABLE "device_tokens" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "doctor_blocked_slots" ALTER COLUMN "date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "doctor_exam_orders" DROP COLUMN "issued_at",
ALTER COLUMN "exams" DROP DEFAULT;

-- AlterTable
ALTER TABLE "doctor_prescriptions" DROP COLUMN "issued_at",
ALTER COLUMN "items" DROP DEFAULT;

-- AlterTable
ALTER TABLE "doctors" ALTER COLUMN "languages" DROP DEFAULT;

-- AlterTable
ALTER TABLE "exam_result_items" DROP COLUMN "delta_percent",
DROP COLUMN "marker_code",
DROP COLUMN "previous_exam_date",
DROP COLUMN "previous_value",
DROP COLUMN "updated_at",
ALTER COLUMN "raw_value" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'normal';

-- AlterTable
ALTER TABLE "exam_results" DROP COLUMN "ai_processed_at",
DROP COLUMN "doctor_name",
DROP COLUMN "health_record_id",
DROP COLUMN "ocr_raw_text",
ALTER COLUMN "exam_type" DROP NOT NULL,
ALTER COLUMN "ai_risk_level" DROP NOT NULL,
ALTER COLUMN "ai_risk_level" DROP DEFAULT;

-- AlterTable
ALTER TABLE "family_members" DROP COLUMN "accepted_at",
DROP COLUMN "custom_label",
DROP COLUMN "invite_expires_at",
DROP COLUMN "member_user_id",
DROP COLUMN "share_conditions",
DROP COLUMN "share_hereditary",
DROP COLUMN "user_id",
ADD COLUMN     "allergies" TEXT[],
ADD COLUMN     "blood_type" "BloodType",
ADD COLUMN     "chronic_conditions" TEXT[],
ADD COLUMN     "is_donor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "full_name" SET NOT NULL,
ALTER COLUMN "invite_token" DROP NOT NULL,
ALTER COLUMN "owner_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "glucose_readings" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "value" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "insulin_units" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "hba1c_readings" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "value" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "estimated_avg_glucose" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "health_records" DROP COLUMN "deleted_at",
DROP COLUMN "doctor_name",
DROP COLUMN "is_shared",
DROP COLUMN "lab_name",
DROP COLUMN "mongo_doc_id",
DROP COLUMN "ocr_text",
DROP COLUMN "record_type",
DROP COLUMN "result_notes",
DROP COLUMN "result_status",
DROP COLUMN "s3_key",
ADD COLUMN     "ai_summary" TEXT,
ADD COLUMN     "description" TEXT,
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'general',
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "record_date" DROP NOT NULL,
ALTER COLUMN "file_name" SET NOT NULL,
ALTER COLUMN "file_url" SET NOT NULL,
ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lifestyle_profiles" DROP COLUMN "health_score",
DROP COLUMN "health_score_notes";

-- AlterTable
ALTER TABLE "lifestyle_snapshots" DROP COLUMN "city_name",
DROP COLUMN "country_code",
DROP COLUMN "data",
DROP COLUMN "health_score",
DROP COLUMN "ibge_code",
DROP COLUMN "profile_id",
DROP COLUMN "snapshot_date",
DROP COLUMN "state_code",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "height_cm" DECIMAL(65,30),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "weight_kg" DECIMAL(65,30),
ALTER COLUMN "snapshot_at" SET NOT NULL,
ALTER COLUMN "snapshot_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "medications" DROP COLUMN "last_purchase_date",
DROP COLUMN "remaining_pills",
DROP COLUMN "total_pills",
ALTER COLUMN "scheduled_times" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "menstrual_cycles" DROP COLUMN "current_phase",
DROP COLUMN "cycle_end",
DROP COLUMN "cycle_start",
DROP COLUMN "flow_intensity",
DROP COLUMN "mood",
DROP COLUMN "next_cycle_predicted",
DROP COLUMN "ovulation_predicted",
DROP COLUMN "symptoms",
DROP COLUMN "updated_at",
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "menstrual_daily_logs" DROP COLUMN "basal_temp",
DROP COLUMN "cervical_mucus",
DROP COLUMN "flow_intensity",
DROP COLUMN "logged_date",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "mood" DROP NOT NULL,
ALTER COLUMN "mood" SET DATA TYPE TEXT,
ALTER COLUMN "temperature" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "ophthalmology_exams" DROP COLUMN "acuity_left_eye",
DROP COLUMN "acuity_right_eye",
DROP COLUMN "astigmatism_left",
DROP COLUMN "astigmatism_right",
DROP COLUMN "device_type",
DROP COLUMN "estimated_distance_cm",
DROP COLUMN "snellen_left_raw",
DROP COLUMN "snellen_right_raw",
DROP COLUMN "status",
ADD COLUMN     "addition_left" DECIMAL(65,30),
ADD COLUMN     "addition_right" DECIMAL(65,30),
ADD COLUMN     "axis_left" INTEGER,
ADD COLUMN     "axis_right" INTEGER,
ADD COLUMN     "cylinder_left" DECIMAL(65,30),
ADD COLUMN     "cylinder_right" DECIMAL(65,30),
ADD COLUMN     "spherical_left" DECIMAL(65,30),
ADD COLUMN     "spherical_right" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "psychosocial_assessments" DROP COLUMN "answered_count",
DROP COLUMN "category_scores",
DROP COLUMN "completed_at",
DROP COLUMN "consent_given",
DROP COLUMN "data_retention_days",
DROP COLUMN "employment_type",
DROP COLUMN "laudo",
DROP COLUMN "overall_score",
DROP COLUMN "overall_tier",
DROP COLUMN "recommendations",
DROP COLUMN "role",
DROP COLUMN "sector",
DROP COLUMN "topRisks",
DROP COLUMN "updated_at",
DROP COLUMN "weekly_overtime_hours",
DROP COLUMN "work_regime",
ADD COLUMN     "risk_level" TEXT,
ALTER COLUMN "assessment_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "share_tokens" DROP COLUMN "access_ip",
DROP COLUMN "accessed_at",
DROP COLUMN "custom_fields",
ALTER COLUMN "expires_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "surgeries" DROP COLUMN "status",
ADD COLUMN     "status" "SurgeryStatus" NOT NULL DEFAULT 'scheduled',
ALTER COLUMN "complications" DROP DEFAULT,
ALTER COLUMN "implants" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vaccination_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vaccines" ALTER COLUMN "diseases" DROP DEFAULT,
ALTER COLUMN "age_groups" DROP DEFAULT;

-- DropEnum
DROP TYPE "EmploymentType";

-- DropEnum
DROP TYPE "OphthalmologyExamStatus";

-- DropEnum
DROP TYPE "PsychosocialRiskTier";

-- DropEnum
DROP TYPE "WorkRegime";

-- CreateTable
CREATE TABLE "mental_health_assessments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scale_code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "answers" JSONB NOT NULL,
    "raw_score" DOUBLE PRECISION,
    "normalized_score" DOUBLE PRECISION,
    "subscores" JSONB,
    "severity" TEXT,
    "interpretation" TEXT,
    "flags" JSONB,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "applied_by" TEXT NOT NULL DEFAULT 'self',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mental_health_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mental_health_assessments_user_id_created_at_idx" ON "mental_health_assessments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "mental_health_assessments_user_id_scale_code_idx" ON "mental_health_assessments"("user_id", "scale_code");

-- CreateIndex
CREATE INDEX "ai_health_chats_user_id_session_id_idx" ON "ai_health_chats"("user_id", "session_id");

-- CreateIndex
CREATE INDEX "appointments_user_id_appointment_at_idx" ON "appointments"("user_id", "appointment_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "doctor_blocked_slots_doctor_id_date_idx" ON "doctor_blocked_slots"("doctor_id", "date");

-- CreateIndex
CREATE INDEX "doctor_exam_orders_doctor_id_idx" ON "doctor_exam_orders"("doctor_id");

-- CreateIndex
CREATE INDEX "doctor_prescriptions_doctor_id_idx" ON "doctor_prescriptions"("doctor_id");

-- CreateIndex
CREATE INDEX "doctor_staff_doctor_id_idx" ON "doctor_staff"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_invite_token_key" ON "family_members"("invite_token");

-- CreateIndex
CREATE INDEX "family_members_owner_id_idx" ON "family_members"("owner_id");

-- CreateIndex
CREATE INDEX "health_records_user_id_category_idx" ON "health_records"("user_id", "category");

-- CreateIndex
CREATE INDEX "lifestyle_snapshots_user_id_snapshot_at_idx" ON "lifestyle_snapshots"("user_id", "snapshot_at");

-- CreateIndex
CREATE INDEX "medication_logs_user_id_taken_at_idx" ON "medication_logs"("user_id", "taken_at");

-- CreateIndex
CREATE INDEX "medications_user_id_is_active_idx" ON "medications"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "menstrual_cycles_user_id_start_date_idx" ON "menstrual_cycles"("user_id", "start_date");

-- CreateIndex
CREATE INDEX "menstrual_daily_logs_user_id_date_idx" ON "menstrual_daily_logs"("user_id", "date");

-- CreateIndex
CREATE INDEX "psychosocial_assessments_user_id_created_at_idx" ON "psychosocial_assessments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "share_tokens_token_idx" ON "share_tokens"("token");

-- CreateIndex
CREATE INDEX "surgeries_user_id_performed_at_idx" ON "surgeries"("user_id", "performed_at");

-- RenameForeignKey
ALTER TABLE "exam_result_items" RENAME CONSTRAINT "exam_result_items_exam_result_id_fkey" TO "exam_result_items_exam_id_fkey";

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_doctor_id_fkey" FOREIGN KEY ("patient_doctor_id") REFERENCES "patient_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menstrual_daily_logs" ADD CONSTRAINT "menstrual_daily_logs_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "menstrual_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mental_health_assessments" ADD CONSTRAINT "mental_health_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_pressure_readings" ADD CONSTRAINT "blood_pressure_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_records" ADD CONSTRAINT "vaccination_records_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_staff" ADD CONSTRAINT "doctor_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_cash_entries" ADD CONSTRAINT "doctor_cash_entries_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "doctor_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hba1c_readings" ADD CONSTRAINT "hba1c_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_vaccination_records_user" RENAME TO "vaccination_records_user_id_idx";
