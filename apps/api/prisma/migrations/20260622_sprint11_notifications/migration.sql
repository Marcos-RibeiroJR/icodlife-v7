-- Sprint 11: Ajuste da tabela notifications para alinhar com schema.prisma
-- A migration anterior criou colunas diferentes das esperadas pelo schema atual

-- 1. Remove coluna channel (não existe no schema)
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "channel";

-- 2. Remove coluna sent_at (não existe no schema)
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "sent_at";

-- 3. Renomeia metadata -> data (schema usa campo "data")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE "notifications" RENAME COLUMN "metadata" TO "data";
  END IF;
END $$;

-- 4. Garante body NOT NULL
UPDATE "notifications" SET "body" = '' WHERE "body" IS NULL;
ALTER TABLE "notifications" ALTER COLUMN "body" SET NOT NULL;

-- 5. Adiciona is_read (faltava na migration anterior)
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" BOOLEAN NOT NULL DEFAULT false;

-- 6. Adiciona read_at
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP(3);

-- 7. Índice composto para queries de listagem
CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
