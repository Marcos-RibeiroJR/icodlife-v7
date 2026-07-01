-- Sprint 21: Tabelas faltando (surgeries, vaccines, vaccination_records)
-- + campos adicionais no lifestyle_profiles

-- ═══════════════════════════════════════════════════════════════════
-- SURGERIES
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "surgeries" (
  "id"                   TEXT NOT NULL,
  "user_id"              TEXT NOT NULL,
  "family_member_id"     TEXT,
  "procedure_name"       TEXT NOT NULL,
  "procedure_code"       TEXT,
  "status"               TEXT NOT NULL DEFAULT 'scheduled',
  "scheduled_at"         TIMESTAMP(3),
  "performed_at"         TIMESTAMP(3),
  "hospital_name"        TEXT,
  "surgeon_name"         TEXT,
  "anesthesia_type"      TEXT,
  "technique"            TEXT,
  "duration_minutes"     INTEGER,
  "hospital_days"        INTEGER,
  "return_to_work_days"  INTEGER,
  "blood_loss_ml"        INTEGER,
  "indication"           TEXT,
  "complications"        TEXT[] NOT NULL DEFAULT '{}',
  "implants"             TEXT[] NOT NULL DEFAULT '{}',
  "notes"                TEXT,
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "surgeries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS idx_surgeries_user ON "surgeries"("user_id");
ALTER TABLE "surgeries"
  ADD CONSTRAINT "surgeries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- VACCINES CATALOG
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "vaccines" (
  "id"                TEXT NOT NULL,
  "name"              TEXT NOT NULL,
  "trade_name"        TEXT,
  "cvx_code"          TEXT UNIQUE,
  "diseases"          TEXT[] NOT NULL DEFAULT '{}',
  "recommended_doses" INTEGER NOT NULL DEFAULT 1,
  "interval_days"     INTEGER,
  "booster_years"     INTEGER,
  "age_groups"        TEXT[] NOT NULL DEFAULT '{}',
  "calendar"          TEXT NOT NULL DEFAULT 'PNI',
  "is_active"         BOOLEAN NOT NULL DEFAULT true,
  "notes"             TEXT,
  CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════════
-- VACCINATION RECORDS
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "vaccination_records" (
  "id"            TEXT NOT NULL,
  "user_id"       TEXT NOT NULL,
  "vaccine_id"    TEXT NOT NULL,
  "dose_number"   INTEGER NOT NULL DEFAULT 1,
  "status"        TEXT NOT NULL DEFAULT 'completed',
  "applied_at"    TIMESTAMP(3),
  "scheduled_at"  TIMESTAMP(3),
  "next_dose_at"  TIMESTAMP(3),
  "lot_number"    TEXT,
  "location"      TEXT,
  "professional"  TEXT,
  "manufacturer"  TEXT,
  "notes"         TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vaccination_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_user ON "vaccination_records"("user_id");
ALTER TABLE "vaccination_records"
  ADD CONSTRAINT "vaccination_records_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "vaccination_records"
  ADD CONSTRAINT "vaccination_records_vaccine_id_fkey"
  FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE RESTRICT;

-- ═══════════════════════════════════════════════════════════════════
-- LIFESTYLE PROFILES — colunas adicionais
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE "lifestyle_profiles"
  ADD COLUMN IF NOT EXISTS "waist_cm"                  DECIMAL,
  ADD COLUMN IF NOT EXISTS "systolic_bp"               INTEGER,
  ADD COLUMN IF NOT EXISTS "diastolic_bp"              INTEGER,
  ADD COLUMN IF NOT EXISTS "mood_avg"                  INTEGER,
  ADD COLUMN IF NOT EXISTS "mental_health_diagnoses"   TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "therapy_frequency"         TEXT,
  ADD COLUMN IF NOT EXISTS "sexually_active"           BOOLEAN,
  ADD COLUMN IF NOT EXISTS "contraception_type"        TEXT,
  ADD COLUMN IF NOT EXISTS "std_protection"            BOOLEAN,
  ADD COLUMN IF NOT EXISTS "work_hours_per_week"       INTEGER,
  ADD COLUMN IF NOT EXISTS "work_environment"          TEXT,
  ADD COLUMN IF NOT EXISTS "ergonomic_risk"            INTEGER,
  ADD COLUMN IF NOT EXISTS "occupational_chemicals"    BOOLEAN,
  ADD COLUMN IF NOT EXISTS "meals_per_day"             INTEGER,
  ADD COLUMN IF NOT EXISTS "city_name"                 TEXT,
  ADD COLUMN IF NOT EXISTS "state_code"                TEXT,
  ADD COLUMN IF NOT EXISTS "ibge_code"                 TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- SEED: catálogo básico de vacinas PNI
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO "vaccines" ("id","name","trade_name","diseases","recommended_doses","interval_days","booster_years","age_groups","calendar","notes") VALUES
  ('v-bcg',    'BCG',                         NULL,           ARRAY['Tuberculose'],                           1, NULL, NULL, ARRAY['recém-nascido'],          'PNI', 'Dose única ao nascer'),
  ('v-hepb',   'Hepatite B',                  'Engerix-B',    ARRAY['Hepatite B'],                            3, 30,   NULL, ARRAY['recém-nascido','adulto'], 'PNI', ''),
  ('v-penta',  'Pentavalente',                NULL,           ARRAY['Difteria','Tétano','Coqueluche','Hib','Hepatite B'], 3, 60, NULL, ARRAY['criança'], 'PNI', ''),
  ('v-vip',    'Poliomielite VIP',            NULL,           ARRAY['Poliomielite'],                          3, 60,   NULL, ARRAY['criança'],               'PNI', ''),
  ('v-rota',   'Rotavírus',                   'Rotarix',      ARRAY['Gastroenterite por rotavírus'],          2, 30,   NULL, ARRAY['criança'],               'PNI', ''),
  ('v-pneu10', 'Pneumocócica 10-valente',     'Synflorix',    ARRAY['Pneumonia','Meningite','Otite média'],   3, 60,   NULL, ARRAY['criança'],               'PNI', ''),
  ('v-menC',   'Meningocócica C',             'Menjugate',    ARRAY['Meningite meningocócica C'],             2, 60,   NULL, ARRAY['criança'],               'PNI', ''),
  ('v-fa',     'Febre Amarela',               'Bio-Manguinhos',ARRAY['Febre Amarela'],                        1, NULL, 10,   ARRAY['criança','adulto'],      'PNI', 'Reforço a cada 10 anos para viajantes'),
  ('v-scr',    'Tríplice Viral (SCR)',         'Priorix',      ARRAY['Sarampo','Caxumba','Rubéola'],           2, 30,   NULL, ARRAY['criança'],               'PNI', ''),
  ('v-scrv',   'Tetraviral (SCRV)',            'Proquad',      ARRAY['Sarampo','Caxumba','Rubéola','Varicela'],1, NULL, NULL, ARRAY['criança'],               'PNI', ''),
  ('v-hepa',   'Hepatite A',                  'Havrix',       ARRAY['Hepatite A'],                            1, NULL, NULL, ARRAY['criança'],               'PNI', ''),
  ('v-vz',     'Varicela',                    'Varivax',      ARRAY['Catapora'],                              1, NULL, NULL, ARRAY['criança','adulto'],      'PNI', ''),
  ('v-dtp',    'DTP (tríplice bacteriana)',   NULL,           ARRAY['Difteria','Tétano','Coqueluche'],         1, NULL, 10,   ARRAY['adolescente','adulto'],  'PNI', 'Reforço a cada 10 anos'),
  ('v-hpv',    'HPV Quadrivalente',           'Gardasil',     ARRAY['HPV'],                                   2, 180,  NULL, ARRAY['adolescente'],           'PNI', ''),
  ('v-menACWY','Meningocócica ACWY',          'Menactra',     ARRAY['Meningite meningocócica ACWY'],          1, NULL, NULL, ARRAY['adolescente'],           'PNI', ''),
  ('v-flu',    'Influenza (gripe)',            'Vaxigrip Tetra',ARRAY['Influenza'],                           1, NULL, 1,    ARRAY['criança','adulto','idoso'],'PNI','Dose anual — campanha nacional'),
  ('v-pneu23', 'Pneumocócica 23-valente',     'Pneumovax 23', ARRAY['Pneumonia pneumocócica'],                1, NULL, NULL, ARRAY['idoso'],                 'PNI', ''),
  ('v-cov-pf', 'COVID-19 — Pfizer',           'Comirnaty',    ARRAY['COVID-19'],                              2, 21,   1,    ARRAY['adulto','adolescente'],  'PNI', ''),
  ('v-dengue', 'Dengue (Dengvaxia)',           'Dengvaxia',    ARRAY['Dengue'],                                3, 180,  NULL, ARRAY['criança','adolescente'], 'PNI', 'Somente soropositivos confirmados'),
  ('v-hz',     'Herpes Zóster (Shingrix)',     'Shingrix',     ARRAY['Herpes Zóster'],                         2, 60,   NULL, ARRAY['idoso'],                 'Recomendada', 'Indicada para maiores de 50 anos')
ON CONFLICT (id) DO NOTHING;
