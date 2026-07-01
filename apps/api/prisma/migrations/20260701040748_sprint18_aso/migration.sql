-- CreateTable
CREATE TABLE "asos" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "patient_doctor_id" TEXT,
    "company_name" TEXT NOT NULL,
    "company_cnpj" TEXT,
    "company_address" TEXT,
    "company_phone" TEXT,
    "worker_name" TEXT NOT NULL,
    "worker_cpf" TEXT,
    "worker_rg" TEXT,
    "worker_birth_date" TIMESTAMP(3),
    "worker_sex" TEXT,
    "worker_role" TEXT,
    "worker_sector" TEXT,
    "worker_registration" TEXT,
    "admission_date" TIMESTAMP(3),
    "exam_type" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "job_description" TEXT,
    "risks" JSONB NOT NULL,
    "complementary_exams" JSONB NOT NULL,
    "result" TEXT NOT NULL,
    "restrictions" TEXT,
    "observations" TEXT,
    "doctor_name" TEXT NOT NULL,
    "doctor_crm" TEXT NOT NULL,
    "doctor_uf" TEXT NOT NULL,
    "doctor_specialty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asos_doctor_id_created_at_idx" ON "asos"("doctor_id", "created_at");

-- AddForeignKey
ALTER TABLE "asos" ADD CONSTRAINT "asos_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asos" ADD CONSTRAINT "asos_patient_doctor_id_fkey" FOREIGN KEY ("patient_doctor_id") REFERENCES "patient_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
