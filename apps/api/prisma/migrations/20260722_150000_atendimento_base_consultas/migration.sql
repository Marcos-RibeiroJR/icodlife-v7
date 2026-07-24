-- Sprint 27 — Meus Funcionários, Base de Consultas e Atendimento (Guichê)

-- Enums
CREATE TYPE "ConsultationRequestStatus" AS ENUM ('pending', 'linked', 'queued', 'in_service', 'completed', 'canceled');
CREATE TYPE "ServiceSessionStatus" AS ENUM ('in_progress', 'completed', 'canceled');

-- Company: link público tokenizado para intake do formulário de solicitação
ALTER TABLE "companies" ADD COLUMN "intake_token" TEXT;
CREATE UNIQUE INDEX "companies_intake_token_key" ON "companies"("intake_token");

-- CompanyEmployee — funcionário de uma empresa cliente (Meus Funcionários)
CREATE TABLE "company_employees" (
  "id"         TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "user_id"    TEXT,
  "icode"      TEXT,
  "full_name"  TEXT NOT NULL,
  "cpf"        TEXT,
  "sector"     TEXT,
  "role"       TEXT,
  "status"     TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_employees_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "company_employees_company_id_idx" ON "company_employees"("company_id");
CREATE INDEX "company_employees_user_id_idx" ON "company_employees"("user_id");
ALTER TABLE "company_employees" ADD CONSTRAINT "company_employees_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_employees" ADD CONSTRAINT "company_employees_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ConsultationRequest — Base de Consultas
CREATE TABLE "consultation_requests" (
  "id"                          TEXT NOT NULL,
  "company_id"                  TEXT NOT NULL,
  "employee_id"                 TEXT,
  "user_id"                     TEXT,
  "patient_name"                TEXT NOT NULL,
  "patient_icode"                TEXT,
  "exam_type"                   TEXT NOT NULL,
  "requested_by"                TEXT,
  "requester_email"             TEXT,
  "notes"                       TEXT,
  "psychosocial_assessment_id"  TEXT,
  "psychosocial_snapshot"       JSONB,
  "source"                      TEXT NOT NULL DEFAULT 'form',
  "status"                      "ConsultationRequestStatus" NOT NULL DEFAULT 'pending',
  "received_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consultation_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "consultation_requests_company_id_status_idx" ON "consultation_requests"("company_id", "status");
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "company_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_psychosocial_assessment_id_fkey"
  FOREIGN KEY ("psychosocial_assessment_id") REFERENCES "psychosocial_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ServiceCounter — Guichê
CREATE TABLE "service_counters" (
  "id"         TEXT NOT NULL,
  "clinic_id"  TEXT NOT NULL,
  "label"      TEXT NOT NULL,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "staff_id"   TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_counters_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_counters_clinic_id_idx" ON "service_counters"("clinic_id");
ALTER TABLE "service_counters" ADD CONSTRAINT "service_counters_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_counters" ADD CONSTRAINT "service_counters_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "clinic_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ServiceSession — atendimento individual (início/fim) por guichê
CREATE TABLE "service_sessions" (
  "id"                        TEXT NOT NULL,
  "counter_id"                TEXT NOT NULL,
  "staff_id"                  TEXT NOT NULL,
  "consultation_request_id"   TEXT,
  "aso_id"                    TEXT,
  "started_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at"                  TIMESTAMP(3),
  "status"                    "ServiceSessionStatus" NOT NULL DEFAULT 'in_progress',
  "notes"                     TEXT,
  CONSTRAINT "service_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "service_sessions_counter_id_started_at_idx" ON "service_sessions"("counter_id", "started_at");
CREATE INDEX "service_sessions_staff_id_started_at_idx" ON "service_sessions"("staff_id", "started_at");
ALTER TABLE "service_sessions" ADD CONSTRAINT "service_sessions_counter_id_fkey"
  FOREIGN KEY ("counter_id") REFERENCES "service_counters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_sessions" ADD CONSTRAINT "service_sessions_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "clinic_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_sessions" ADD CONSTRAINT "service_sessions_consultation_request_id_fkey"
  FOREIGN KEY ("consultation_request_id") REFERENCES "consultation_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_sessions" ADD CONSTRAINT "service_sessions_aso_id_fkey"
  FOREIGN KEY ("aso_id") REFERENCES "asos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
