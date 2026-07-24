-- Sprint 27 — geração dos eventos eSocial S-2220/S-2240 a partir do ASO.
-- Fatores de risco codificados (Tabela 24) + EPI, usados para montar o S-2240.
-- Os campos do S-2220 (tipo/resultado do exame, procedimento Tabela 27) são
-- derivados dos campos já existentes (examType/result/complementaryExams) —
-- não precisam de coluna nova. O médico responsável pelo PCMSO fica no JSON
-- já existente "medicina" da empresa (companies.medicina), sem migration.
ALTER TABLE "asos"
  ADD COLUMN "risk_factors_esocial" JSONB;
