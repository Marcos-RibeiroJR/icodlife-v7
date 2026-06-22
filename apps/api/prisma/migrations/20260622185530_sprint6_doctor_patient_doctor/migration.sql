/*
  Warnings:

  - You are about to alter the column `waist_cm` on the `lifestyle_profiles` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to drop the column `data_retention_days` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_hyper_left` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_hyper_right` on the `ophthalmology_exams` table. All the data in the column will be lost.
  - You are about to drop the column `consult_date` on the `ophthalmology_history` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `ophthalmology_history` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'doctor', 'admin');

-- CreateEnum
CREATE TYPE "CrmStatus" AS ENUM ('pending', 'verified', 'suspended', 'canceled');

-- CreateEnum
CREATE TYPE "PatientDoctorStatus" AS ENUM ('pending', 'active', 'ended');

-- DropForeignKey
ALTER TABLE "blood_pressure_readings" DROP CONSTRAINT "blood_pressure_readings_user_id_fkey";

-- AlterTable
ALTER TABLE "blood_pressure_readings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "family_members" ALTER COLUMN "invite_expires_at" SET DEFAULT NOW() + INTERVAL '7 days';

-- AlterTable
ALTER TABLE "lifestyle_profiles" ALTER COLUMN "waist_cm" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "ophthalmology_exams" DROP COLUMN "data_retention_days",
DROP COLUMN "estimated_hyper_left",
DROP COLUMN "estimated_hyper_right",
ALTER COLUMN "confidence_score" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "ophthalmology_history" DROP COLUMN "consult_date",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "doctor_counter" (
    "id" SERIAL NOT NULL,
    "uf" TEXT NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "doctor_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "crm" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "crm_status" "CrmStatus" NOT NULL DEFAULT 'pending',
    "cfm_verified_at" TIMESTAMP(3),
    "specialties" TEXT[],
    "health_plans" TEXT[],
    "bio" TEXT,
    "consult_price" DECIMAL(65,30),
    "address_city" TEXT,
    "address_state" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_doctors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "external_crm" TEXT,
    "external_uf" TEXT,
    "external_name" TEXT,
    "specialty" TEXT,
    "status" "PatientDoctorStatus" NOT NULL DEFAULT 'active',
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_counter_uf_key" ON "doctor_counter"("uf");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_doctor_id_key" ON "doctors"("doctor_id");

-- CreateIndex
CREATE INDEX "doctors_uf_crm_status_idx" ON "doctors"("uf", "crm_status");

-- CreateIndex
CREATE INDEX "doctors_specialties_idx" ON "doctors"("specialties");

-- CreateIndex
CREATE UNIQUE INDEX "patient_doctors_user_id_doctor_id_key" ON "patient_doctors"("user_id", "doctor_id");

-- CreateIndex
CREATE INDEX "ophthalmology_exams_user_id_created_at_idx" ON "ophthalmology_exams"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "blood_pressure_readings" ADD CONSTRAINT "blood_pressure_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_doctors" ADD CONSTRAINT "patient_doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_doctors" ADD CONSTRAINT "patient_doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
