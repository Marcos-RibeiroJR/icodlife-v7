-- Sprint 29 — terreno para plano/assinatura paga do médico na plataforma.
-- Ainda sem checkout/cobrança real: só registra a escolha do plano feita no
-- cadastro, com status "pending_payment", pronto pra quando o pagamento for
-- implementado.

CREATE TYPE "PlatformPlanStatus" AS ENUM ('trial', 'pending_payment', 'active', 'canceled');

CREATE TABLE "platform_plans" (
  "id"            TEXT NOT NULL,
  "code"          TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "price"         DECIMAL(65,30) NOT NULL,
  "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
  "features"      JSONB NOT NULL DEFAULT '[]',
  "is_active"     BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_plans_code_key" ON "platform_plans"("code");

ALTER TABLE "doctors"
  ADD COLUMN "platform_plan_id" TEXT,
  ADD COLUMN "platform_plan_status" "PlatformPlanStatus";

ALTER TABLE "doctors" ADD CONSTRAINT "doctors_platform_plan_id_fkey"
  FOREIGN KEY ("platform_plan_id") REFERENCES "platform_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Planos placeholder — a equipe ajusta nome/preço/benefícios depois, direto
-- na tabela ou por uma tela de admin futura.
INSERT INTO "platform_plans" ("id", "code", "name", "price", "billing_cycle", "features", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'gratuito', 'Gratuito', 0, 'monthly',
   '["Perfil na busca de médicos", "Agenda e prontuário básico"]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'profissional', 'Profissional', 99.90, 'monthly',
   '["Tudo do Gratuito", "Destaque na busca", "Telemedicina", "Relatórios financeiros"]', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
