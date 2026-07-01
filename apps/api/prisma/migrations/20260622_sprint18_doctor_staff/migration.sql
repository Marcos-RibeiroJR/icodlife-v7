-- Sprint 18: Meu Funcionários — tabela de vínculos médico-funcionário

CREATE TABLE "doctor_staff" (
    "id"          TEXT NOT NULL,
    "doctor_id"   TEXT NOT NULL,
    "user_id"     TEXT NOT NULL,
    "role"        TEXT NOT NULL DEFAULT 'assistant',
    "custom_role" TEXT,
    "status"      TEXT NOT NULL DEFAULT 'active',
    "notes"       TEXT,
    "started_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at"    TIMESTAMP(3),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "doctor_staff_doctor_id_user_id_key"
    ON "doctor_staff"("doctor_id", "user_id");

ALTER TABLE "doctor_staff"
    ADD CONSTRAINT "doctor_staff_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "doctor_staff"
    ADD CONSTRAINT "doctor_staff_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
