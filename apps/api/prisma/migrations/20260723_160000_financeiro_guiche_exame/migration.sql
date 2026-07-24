-- Sprint 28 — Financeiro: filtros por sala/guichê/médico/exame no extrato de
-- faturamento da clínica + cobrança automática por tipo de exame no guichê.

-- Tabela de preço por tipo de exame (admissional|periodico|retorno|
-- mudanca_funcao|demissional), configurável por clínica.
CREATE TABLE "clinic_exam_prices" (
  "id"         TEXT NOT NULL,
  "clinic_id"  TEXT NOT NULL,
  "exam_type"  TEXT NOT NULL,
  "price"      DECIMAL(65,30) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinic_exam_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_exam_prices_clinic_id_exam_type_key" ON "clinic_exam_prices"("clinic_id", "exam_type");

ALTER TABLE "clinic_exam_prices" ADD CONSTRAINT "clinic_exam_prices_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Campos novos em doctor_cash_entries para permitir filtrar o extrato por
-- guichê e por tipo de exame (preenchidos automaticamente quando o
-- lançamento vem do atendimento ocupacional via guichê).
ALTER TABLE "doctor_cash_entries"
  ADD COLUMN "counter_id" TEXT,
  ADD COLUMN "exam_type" TEXT,
  ADD COLUMN "service_session_id" TEXT;

CREATE UNIQUE INDEX "doctor_cash_entries_service_session_id_key" ON "doctor_cash_entries"("service_session_id");
CREATE INDEX "doctor_cash_entries_counter_id_idx" ON "doctor_cash_entries"("counter_id");

ALTER TABLE "doctor_cash_entries" ADD CONSTRAINT "doctor_cash_entries_counter_id_fkey"
  FOREIGN KEY ("counter_id") REFERENCES "service_counters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "doctor_cash_entries" ADD CONSTRAINT "doctor_cash_entries_service_session_id_fkey"
  FOREIGN KEY ("service_session_id") REFERENCES "service_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
