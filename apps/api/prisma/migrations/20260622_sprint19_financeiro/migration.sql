-- Sprint 19: Financeiro — livro-caixa do médico

CREATE TABLE "doctor_cash_entries" (
    "id"             TEXT NOT NULL,
    "doctor_id"      TEXT NOT NULL,
    "type"           TEXT NOT NULL,
    "category"       TEXT NOT NULL,
    "description"    TEXT NOT NULL,
    "amount"         DECIMAL(65,30) NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'cash',
    "entry_date"     TIMESTAMP(3) NOT NULL,
    "appointment_id" TEXT,
    "patient_name"   TEXT,
    "notes"          TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_cash_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "doctor_cash_entries_doctor_id_entry_date_idx"
    ON "doctor_cash_entries"("doctor_id", "entry_date");

ALTER TABLE "doctor_cash_entries"
    ADD CONSTRAINT "doctor_cash_entries_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
