/*
  Warnings:

  - You are about to alter the column `value` on the `exam_result_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `ref_min` on the `exam_result_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `ref_max` on the `exam_result_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `delta_percent` on the `exam_result_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `previous_value` on the `exam_result_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `height_cm` on the `lifestyle_profiles` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `weight_kg` on the `lifestyle_profiles` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `bmi` on the `lifestyle_profiles` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `sleep_hours_avg` on the `lifestyle_profiles` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `water_liters_day` on the `lifestyle_profiles` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `bmi` on the `lifestyle_snapshots` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - A unique constraint covering the columns `[icode]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PsychosocialRiskTier" AS ENUM ('baixo', 'moderado', 'alto', 'critico');

-- CreateEnum
CREATE TYPE "WorkRegime" AS ENUM ('presencial', 'remoto', 'hibrido');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('clt', 'pj', 'terceirizado', 'estagio', 'outro');

-- CreateEnum
CREATE TYPE "OphthalmologyExamStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "RefractionRisk" AS ENUM ('none', 'low', 'moderate', 'high');

-- DropForeignKey
ALTER TABLE "exam_result_items" DROP CONSTRAINT "exam_result_items_exam_result_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_results" DROP CONSTRAINT "exam_results_health_record_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_results" DROP CONSTRAINT "exam_results_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lifestyle_profiles" DROP CONSTRAINT "lifestyle_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "lifestyle_snapshots" DROP CONSTRAINT "lifestyle_snapshots_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "lifestyle_snapshots" DROP CONSTRAINT "lifestyle_snapshots_user_id_fkey";

-- AlterTable
ALTER TABLE "exam_result_items" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "value" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "ref_min" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "ref_max" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "delta_percent" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "previous_value" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "previous_exam_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "exam_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "exam_results" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "exam_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "exam_type" DROP DEFAULT,
ALTER COLUMN "ai_flags" DROP DEFAULT,
ALTER COLUMN "ai_processed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "family_members" ALTER COLUMN "invite_expires_at" SET DEFAULT NOW() + INTERVAL '7 days';

-- AlterTable
ALTER TABLE "lifestyle_profiles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "height_cm" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "weight_kg" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "bmi" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "quit_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "alcohol_types" DROP DEFAULT,
ALTER COLUMN "exercise_types" DROP DEFAULT,
ALTER COLUMN "sleep_hours_avg" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "mental_health_diagnoses" DROP DEFAULT,
ALTER COLUMN "water_liters_day" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lifestyle_snapshots" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "snapshot_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "data" DROP DEFAULT,
ALTER COLUMN "bmi" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "icode" TEXT,
ADD COLUMN     "icode_country_id" INTEGER,
ADD COLUMN     "icode_state_id" INTEGER;

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "icode_num" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "icode_num" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" SERIAL NOT NULL,
    "icode_num" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ibge_code" TEXT,
    "country_id" INTEGER NOT NULL,
    "region_id" INTEGER NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icode_counter" (
    "id" SERIAL NOT NULL,
    "next_value" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "icode_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychosocial_assessments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sector" TEXT,
    "role" TEXT,
    "work_regime" "WorkRegime",
    "employment_type" "EmploymentType",
    "weekly_overtime_hours" INTEGER,
    "answers" JSONB NOT NULL,
    "answered_count" INTEGER NOT NULL,
    "overall_score" DECIMAL(65,30) NOT NULL,
    "overall_tier" "PsychosocialRiskTier" NOT NULL DEFAULT 'baixo',
    "category_scores" JSONB NOT NULL,
    "topRisks" TEXT[],
    "laudo" TEXT,
    "recommendations" TEXT[],
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "data_retention_days" INTEGER NOT NULL DEFAULT 7300,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "psychosocial_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ophthalmology_exams" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "OphthalmologyExamStatus" NOT NULL DEFAULT 'in_progress',
    "estimated_distance_cm" INTEGER,
    "device_type" TEXT,
    "acuity_right_eye" TEXT,
    "acuity_left_eye" TEXT,
    "snellen_right_raw" JSONB,
    "snellen_left_raw" JSONB,
    "astigmatism_right" BOOLEAN,
    "astigmatism_left" BOOLEAN,
    "astigmatism_axis_right" INTEGER,
    "astigmatism_axis_left" INTEGER,
    "contrast_score_right" DECIMAL(65,30),
    "contrast_score_left" DECIMAL(65,30),
    "estimated_myopia_right" DECIMAL(65,30),
    "estimated_myopia_left" DECIMAL(65,30),
    "estimated_astig_right" DECIMAL(65,30),
    "estimated_astig_left" DECIMAL(65,30),
    "estimated_hyper_right" DECIMAL(65,30),
    "estimated_hyper_left" DECIMAL(65,30),
    "confidence_score" INTEGER,
    "risk_level" "RefractionRisk" NOT NULL DEFAULT 'none',
    "symptoms" TEXT[],
    "user_age" INTEGER,
    "report_summary" TEXT,
    "recommendations" TEXT[],
    "data_retention_days" INTEGER NOT NULL DEFAULT 1825,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ophthalmology_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ophthalmology_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_id" TEXT,
    "consult_date" TIMESTAMP(3),
    "doctor_name" TEXT,
    "crm_number" TEXT,
    "spherical_right" DECIMAL(65,30),
    "spherical_left" DECIMAL(65,30),
    "cylinder_right" DECIMAL(65,30),
    "cylinder_left" DECIMAL(65,30),
    "axis_right" INTEGER,
    "axis_left" INTEGER,
    "addition_right" DECIMAL(65,30),
    "addition_left" DECIMAL(65,30),
    "diagnoses" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ophthalmology_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "states_uf_key" ON "states"("uf");

-- CreateIndex
CREATE UNIQUE INDEX "users_icode_key" ON "users"("icode");

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_icode_country_id_fkey" FOREIGN KEY ("icode_country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_icode_state_id_fkey" FOREIGN KEY ("icode_state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_health_record_id_fkey" FOREIGN KEY ("health_record_id") REFERENCES "health_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_result_items" ADD CONSTRAINT "exam_result_items_exam_result_id_fkey" FOREIGN KEY ("exam_result_id") REFERENCES "exam_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifestyle_profiles" ADD CONSTRAINT "lifestyle_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifestyle_snapshots" ADD CONSTRAINT "lifestyle_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifestyle_snapshots" ADD CONSTRAINT "lifestyle_snapshots_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "lifestyle_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychosocial_assessments" ADD CONSTRAINT "psychosocial_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ophthalmology_exams" ADD CONSTRAINT "ophthalmology_exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ophthalmology_history" ADD CONSTRAINT "ophthalmology_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_exam_items_user_date" RENAME TO "exam_result_items_user_id_exam_date_idx";

-- RenameIndex
ALTER INDEX "idx_exam_items_user_marker_date" RENAME TO "exam_result_items_user_id_marker_exam_date_idx";

-- RenameIndex
ALTER INDEX "idx_exam_results_user_date" RENAME TO "exam_results_user_id_exam_date_idx";

-- RenameIndex
ALTER INDEX "idx_ls_snapshots_ibge_date" RENAME TO "lifestyle_snapshots_ibge_code_snapshot_date_idx";

-- RenameIndex
ALTER INDEX "idx_ls_snapshots_state_date" RENAME TO "lifestyle_snapshots_state_code_snapshot_date_idx";

-- RenameIndex
ALTER INDEX "idx_ls_snapshots_user_date" RENAME TO "lifestyle_snapshots_user_id_snapshot_date_idx";
