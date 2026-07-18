-- CreateEnum
CREATE TYPE "ClinicDoctorRole" AS ENUM ('owner', 'associated', 'visiting');

-- CreateEnum
CREATE TYPE "ClinicStaffRole" AS ENUM ('admin', 'reception', 'financeiro', 'nurse');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'clinic_admin';

-- AlterTable
ALTER TABLE "asos" ADD COLUMN     "clinic_id" TEXT;

-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN     "clinic_id" TEXT;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "clinic_id" TEXT;

-- AlterTable
ALTER TABLE "doctor_appointments" ADD COLUMN     "clinic_id" TEXT,
ADD COLUMN     "procedure_id" TEXT,
ADD COLUMN     "room_id" TEXT;

-- AlterTable
ALTER TABLE "doctor_cash_entries" ADD COLUMN     "clinic_id" TEXT;

-- CreateTable
CREATE TABLE "clinic_counter" (
    "id" SERIAL NOT NULL,
    "uf" TEXT NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "clinic_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "clinic_code" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "tipo_estabelecimento" TEXT NOT NULL DEFAULT 'clinica',
    "cnes" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "site" TEXT,
    "logo_url" TEXT,
    "health_plans" TEXT[],
    "specialties" TEXT[],
    "config" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_doctors" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "role" "ClinicDoctorRole" NOT NULL DEFAULT 'associated',
    "commission_pct" DECIMAL(65,30),
    "room_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "clinic_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_staff" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ClinicStaffRole" NOT NULL DEFAULT 'reception',
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "clinic_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_rooms" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "clinic_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_procedures" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tuss_code" TEXT,
    "category" TEXT NOT NULL DEFAULT 'consulta',
    "default_price" DECIMAL(65,30) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "health_plan_prices" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_counter_uf_key" ON "clinic_counter"("uf");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_clinic_code_key" ON "clinics"("clinic_code");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_owner_user_id_key" ON "clinics"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_cnpj_key" ON "clinics"("cnpj");

-- CreateIndex
CREATE INDEX "clinics_cidade_estado_idx" ON "clinics"("cidade", "estado");

-- CreateIndex
CREATE INDEX "clinic_doctors_clinic_id_idx" ON "clinic_doctors"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_doctors_clinic_id_doctor_id_key" ON "clinic_doctors"("clinic_id", "doctor_id");

-- CreateIndex
CREATE INDEX "clinic_staff_clinic_id_idx" ON "clinic_staff"("clinic_id");

-- CreateIndex
CREATE INDEX "clinic_procedures_clinic_id_idx" ON "clinic_procedures"("clinic_id");

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_doctors" ADD CONSTRAINT "clinic_doctors_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_doctors" ADD CONSTRAINT "clinic_doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_doctors" ADD CONSTRAINT "clinic_doctors_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "clinic_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_rooms" ADD CONSTRAINT "clinic_rooms_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_procedures" ADD CONSTRAINT "clinic_procedures_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_appointments" ADD CONSTRAINT "doctor_appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_appointments" ADD CONSTRAINT "doctor_appointments_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "clinic_procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_appointments" ADD CONSTRAINT "doctor_appointments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "clinic_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asos" ADD CONSTRAINT "asos_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_cash_entries" ADD CONSTRAINT "doctor_cash_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
