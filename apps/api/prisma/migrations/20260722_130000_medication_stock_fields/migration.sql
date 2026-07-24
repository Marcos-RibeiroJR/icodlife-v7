-- Corrige perda silenciosa de dados no cadastro de medicamento: o frontend
-- ja enviava lastPurchaseDate/totalPills/remainingPills, mas essas colunas
-- nao existiam na tabela e o backend simplesmente descartava os campos.
ALTER TABLE "medications"
  ADD COLUMN "last_purchase_date" TIMESTAMP(3),
  ADD COLUMN "total_pills" INTEGER,
  ADD COLUMN "remaining_pills" INTEGER;
