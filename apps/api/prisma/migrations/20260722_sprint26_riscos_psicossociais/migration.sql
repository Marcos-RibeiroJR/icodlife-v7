-- Sprint 26 — Riscos Psicossociais (NR-01): laudo por dimensao + integracao com ASO
-- AlterTable: contexto ocupacional, consentimentos e breakdown por categoria
-- (antes recebidos no DTO e descartados sem persistir).
ALTER TABLE "psychosocial_assessments"
  ADD COLUMN "sector" TEXT,
  ADD COLUMN "role" TEXT,
  ADD COLUMN "work_regime" TEXT,
  ADD COLUMN "employment_type" TEXT,
  ADD COLUMN "weekly_overtime_hours" INTEGER,
  ADD COLUMN "consent_given" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shared_with_doctor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "category_breakdown" JSONB,
  ADD COLUMN "top_risks" JSONB,
  ADD COLUMN "recommendations" JSONB,
  ADD COLUMN "health_record_id" TEXT;

-- AlterTable: vinculo (opcional) do ASO com a avaliacao psicossocial compartilhada
-- pelo paciente, mais um snapshot congelado no momento da emissao.
ALTER TABLE "asos"
  ADD COLUMN "psychosocial_assessment_id" TEXT,
  ADD COLUMN "psychosocial_snapshot" JSONB;

-- AddForeignKey
ALTER TABLE "asos" ADD CONSTRAINT "asos_psychosocial_assessment_id_fkey"
  FOREIGN KEY ("psychosocial_assessment_id") REFERENCES "psychosocial_assessments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
