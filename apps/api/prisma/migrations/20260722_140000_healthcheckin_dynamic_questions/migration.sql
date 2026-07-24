-- Permite que o HealthBot monte, por sessao/usuario, uma lista dinamica de
-- perguntas do check-in diario -- incluindo uma pergunta especifica por
-- medicamento/horario agendado (ex.: "o DIOVAN que voce toma as 08:00, voce
-- tomou?") em vez da pergunta generica sobre "todos os medicamentos".
ALTER TABLE "health_checkins"
  ADD COLUMN "questions" JSONB;
