-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "inscricao_estadual" TEXT,
    "inscricao_municipal" TEXT,
    "cnae_principal" TEXT,
    "cnae_secundario" TEXT,
    "grau_risco" INTEGER,
    "natureza_juridica" TEXT,
    "codigo_fpas" TEXT,
    "codigo_terceiros" TEXT,
    "regime_tributario" TEXT,
    "porte" TEXT,
    "data_fundacao" TIMESTAMP(3),
    "situacao" TEXT NOT NULL DEFAULT 'ativa',
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "pais" TEXT DEFAULT 'Brasil',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "telefone_principal" TEXT,
    "telefone_rh" TEXT,
    "whatsapp" TEXT,
    "email_rh" TEXT,
    "email_sst" TEXT,
    "site" TEXT,
    "qtd_funcionarios" INTEGER,
    "qtd_terceiros" INTEGER,
    "qtd_estagiarios" INTEGER,
    "qtd_aprendizes" INTEGER,
    "turnos" TEXT,
    "funcionamento_24h" BOOLEAN NOT NULL DEFAULT false,
    "sindicato_patronal" TEXT,
    "sindicato_empregados" TEXT,
    "convencao_coletiva" TEXT,
    "responsaveis" JSONB,
    "medicina" JSONB,
    "esocial" JSONB,
    "financeiro" JSONB,
    "config" JSONB,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_doctor_id_razao_social_idx" ON "companies"("doctor_id", "razao_social");

-- CreateIndex
CREATE UNIQUE INDEX "companies_doctor_id_cnpj_key" ON "companies"("doctor_id", "cnpj");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
