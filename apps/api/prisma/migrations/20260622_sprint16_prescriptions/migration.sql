-- Sprint 16: Meus Exames — receitas médicas e pedidos de exame

CREATE TABLE "doctor_prescriptions" (
    "id"                TEXT NOT NULL,
    "doctor_id"         TEXT NOT NULL,
    "patient_doctor_id" TEXT,
    "patient_name"      TEXT NOT NULL,
    "patient_age"       INTEGER,
    "patient_icode"     TEXT,
    "items"             JSONB NOT NULL DEFAULT '[]',
    "diagnosis"         TEXT,
    "notes"             TEXT,
    "valid_days"        INTEGER NOT NULL DEFAULT 30,
    "status"            TEXT NOT NULL DEFAULT 'active',
    "issued_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_prescriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doctor_exam_orders" (
    "id"                TEXT NOT NULL,
    "doctor_id"         TEXT NOT NULL,
    "patient_doctor_id" TEXT,
    "patient_name"      TEXT NOT NULL,
    "patient_age"       INTEGER,
    "patient_icode"     TEXT,
    "exams"             JSONB NOT NULL DEFAULT '[]',
    "clinical_info"     TEXT,
    "urgency"           TEXT NOT NULL DEFAULT 'routine',
    "notes"             TEXT,
    "status"            TEXT NOT NULL DEFAULT 'active',
    "issued_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_exam_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "doctor_prescriptions_doctor_id_issued_at_idx"
    ON "doctor_prescriptions"("doctor_id", "issued_at");

CREATE INDEX "doctor_exam_orders_doctor_id_issued_at_idx"
    ON "doctor_exam_orders"("doctor_id", "issued_at");

ALTER TABLE "doctor_prescriptions"
    ADD CONSTRAINT "doctor_prescriptions_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "doctor_prescriptions"
    ADD CONSTRAINT "doctor_prescriptions_patient_doctor_id_fkey"
    FOREIGN KEY ("patient_doctor_id") REFERENCES "patient_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "doctor_exam_orders"
    ADD CONSTRAINT "doctor_exam_orders_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "doctor_exam_orders"
    ADD CONSTRAINT "doctor_exam_orders_patient_doctor_id_fkey"
    FOREIGN KEY ("patient_doctor_id") REFERENCES "patient_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
