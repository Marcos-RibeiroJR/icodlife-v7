-- Sprint 17: Meu Currículo — campos de formação, idiomas e certificações

ALTER TABLE "doctors"
    ADD COLUMN IF NOT EXISTS "languages"       TEXT[]   NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "education"       JSONB    NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "certifications"  JSONB    NOT NULL DEFAULT '[]';
