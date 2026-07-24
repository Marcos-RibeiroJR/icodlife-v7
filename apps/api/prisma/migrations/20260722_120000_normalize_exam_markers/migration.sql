-- Normaliza nomes de marcadores em exam_result_items (trim + colapso de espaços).
-- Corrige o bug da "Evolucao de Exames" nao mostrar tendencia mesmo com 2+
-- leituras: registros antigos podiam ter o mesmo marcador (ex.: "Colesterol HDL")
-- gravado com espacos extras/nas pontas, o que fragmentava o historico em
-- "marcadores" diferentes aos olhos da agregacao por nome exato.
UPDATE "exam_result_items"
SET "marker" = regexp_replace(trim("marker"), '\s+', ' ', 'g')
WHERE "marker" <> regexp_replace(trim("marker"), '\s+', ' ', 'g');
