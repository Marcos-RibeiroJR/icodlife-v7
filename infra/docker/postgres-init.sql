-- ============================================================
-- IcodLife — Schema PostgreSQL Completo
-- Versão: 1.0.0
-- LGPD: todos os dados sensíveis marcados para criptografia
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ── ENUM TYPES ──────────────────────────────────────────────────────────────

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE blood_type AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown');
CREATE TYPE user_status AS ENUM ('pending_verification','active','suspended','deleted');
CREATE TYPE family_relationship AS ENUM (
  'father','mother','sibling','child','grandparent',
  'grandchild','spouse','partner','other'
);
CREATE TYPE family_invite_status AS ENUM ('pending','accepted','declined','expired');
CREATE TYPE consent_type AS ENUM ('terms_of_use','data_processing','data_sharing_b2b','marketing');
CREATE TYPE menstrual_cycle_phase AS ENUM ('menstrual','follicular','ovulation','luteal');
CREATE TYPE share_access_level AS ENUM ('basic','full','custom');
CREATE TYPE notification_channel AS ENUM ('push','email','sms');
CREATE TYPE notification_type AS ENUM (
  'medication_reminder','appointment_reminder','family_invite',
  'share_request','cycle_prediction','health_alert','system'
);

-- ── USERS ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keycloak_id         VARCHAR(255) UNIQUE,            -- ID externo do Keycloak
  email               CITEXT UNIQUE NOT NULL,
  phone               VARCHAR(20),
  cpf                 VARCHAR(14) UNIQUE,             -- criptografado na app
  full_name           VARCHAR(255) NOT NULL,
  date_of_birth       DATE NOT NULL,
  gender              gender_type NOT NULL,
  blood_type          blood_type DEFAULT 'unknown',
  is_donor            BOOLEAN DEFAULT false,
  avatar_url          TEXT,
  status              user_status DEFAULT 'pending_verification',
  is_active           BOOLEAN GENERATED ALWAYS AS (status = 'active') STORED,
  -- Dados de emergência (acesso público limitado)
  emergency_contact_name   VARCHAR(255),
  emergency_contact_phone  VARCHAR(20),
  emergency_contact_rel    VARCHAR(100),
  -- Saúde (sensível — LGPD Art. 11)
  allergies           TEXT[],                         -- array de alergias
  chronic_conditions  TEXT[],                         -- comorbidades
  -- Controle
  last_login_at       TIMESTAMPTZ,
  email_verified_at   TIMESTAMPTZ,
  phone_verified_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ                     -- soft delete
);

-- Índices
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_cpf ON users(cpf) WHERE cpf IS NOT NULL;

-- ── CONSENT & TERMS (LGPD) ──────────────────────────────────────────────────

CREATE TABLE user_consents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type    consent_type NOT NULL,
  version         VARCHAR(20) NOT NULL,               -- versão do termo
  accepted        BOOLEAN NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,                        -- null = ativo
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consents_user ON user_consents(user_id);
CREATE INDEX idx_consents_type ON user_consents(user_id, consent_type, accepted);

-- ── ACCESS MANAGEMENT ───────────────────────────────────────────────────────

CREATE TABLE user_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token   TEXT UNIQUE NOT NULL,
  device_info     JSONB,                              -- {os, browser, model}
  ip_address      INET,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,              -- e.g. 'record.upload'
  resource_type   VARCHAR(100),
  resource_id     UUID,
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);

-- ── FAMILY TREE ─────────────────────────────────────────────────────────────
-- Regra de negócio: familiar só pode ser adicionado se o convidado
-- for um usuário ATIVO na plataforma (is_active = true)

CREATE TABLE family_members (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_user_id      UUID REFERENCES users(id),      -- NULL se não é usuário ainda
  -- Referência na arvore do usuário que criou
  relationship        family_relationship NOT NULL,
  custom_label        VARCHAR(100),                   -- ex: "Avô materno"
  full_name           VARCHAR(255),                   -- se não for usuário
  date_of_birth       DATE,
  gender              gender_type,
  -- Compartilhamento de dados hereditários
  share_hereditary    BOOLEAN DEFAULT false,
  share_conditions    BOOLEAN DEFAULT false,
  -- Convite
  invite_status       family_invite_status DEFAULT 'pending',
  invite_token        UUID DEFAULT uuid_generate_v4(),
  invite_email        CITEXT,
  invite_expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  -- Validação de usuário ativo ao aceitar
  accepted_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para garantir que familiar aceito seja usuário ativo
CREATE OR REPLACE FUNCTION check_family_member_active()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_status = 'accepted' AND NEW.member_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE id = NEW.member_user_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Familiar deve ser um usuário ativo para aceitar convite';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_family_member_active
  BEFORE INSERT OR UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION check_family_member_active();

CREATE INDEX idx_family_user ON family_members(user_id);
CREATE INDEX idx_family_member ON family_members(member_user_id) WHERE member_user_id IS NOT NULL;
CREATE INDEX idx_family_invite_token ON family_members(invite_token);

-- ── HEALTH RECORDS (metadados — arquivo no S3/MongoDB) ───────────────────────

CREATE TABLE health_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_type     VARCHAR(50) NOT NULL,               -- 'exam','prescription','report'
  category        VARCHAR(100),                       -- 'hemogram','cardiology','image'
  title           VARCHAR(255) NOT NULL,
  lab_name        VARCHAR(255),
  doctor_name     VARCHAR(255),
  record_date     DATE NOT NULL,
  -- Referência ao arquivo (S3 key) e ao doc completo (MongoDB ObjectId)
  s3_key          TEXT,
  mongo_doc_id    VARCHAR(24),
  ocr_text        TEXT,                               -- extraído pelo OCR
  -- Status do resultado
  result_status   VARCHAR(20) DEFAULT 'pending',      -- 'normal','alert','critical'
  result_notes    TEXT,
  -- Controle
  is_shared       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_records_user ON health_records(user_id, record_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_records_type ON health_records(user_id, record_type);

-- ── APPOINTMENTS ─────────────────────────────────────────────────────────────

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_name     VARCHAR(255) NOT NULL,
  specialty       VARCHAR(100),
  cnes_code       VARCHAR(20),                        -- validado no CNES
  location        VARCHAR(500),
  appointment_at  TIMESTAMPTZ NOT NULL,
  notes           TEXT,
  reminder_sent   BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_user ON appointments(user_id, appointment_at);

-- ── MEDICATIONS ──────────────────────────────────────────────────────────────

CREATE TABLE medications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  dosage          VARCHAR(100),
  frequency       JSONB NOT NULL,                     -- {times:["08:00","20:00"], days:["mon"...]}
  start_date      DATE NOT NULL,
  end_date        DATE,
  prescribing_doctor VARCHAR(255),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE medication_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id   UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  taken_at        TIMESTAMPTZ,
  skipped         BOOLEAN DEFAULT false,
  skip_reason     TEXT
);

CREATE INDEX idx_med_logs_user ON medication_logs(user_id, scheduled_at DESC);

-- ── MENSTRUAL CYCLE (apenas gênero feminino + other) ──────────────────────────

CREATE TABLE menstrual_cycles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_start     DATE NOT NULL,
  cycle_end       DATE,
  cycle_length    INT,                                -- dias totais
  period_length   INT,                                -- dias de menstruação
  flow_intensity  SMALLINT CHECK (flow_intensity BETWEEN 1 AND 5),
  symptoms        TEXT[],                             -- ['cramping','headache','fatigue']
  mood            TEXT[],                             -- ['irritable','happy','anxious']
  notes           TEXT,
  -- Fase calculada automaticamente
  current_phase   menstrual_cycle_phase,
  -- Predição
  next_cycle_predicted DATE,
  ovulation_predicted  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Validação de gênero feita via trigger abaixo
  CONSTRAINT chk_flow_intensity CHECK (flow_intensity BETWEEN 1 AND 5)
);

-- Trigger para garantir que apenas usuárias femininas/other usem o módulo menstrual
CREATE OR REPLACE FUNCTION check_menstrual_gender()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = NEW.user_id AND gender IN ('female','other')
  ) THEN
    RAISE EXCEPTION 'Módulo menstrual disponível apenas para usuárias femininas ou other';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_menstrual_gender
  BEFORE INSERT ON menstrual_cycles
  FOR EACH ROW EXECUTE FUNCTION check_menstrual_gender();

CREATE TRIGGER trg_menstrual_daily_gender
  BEFORE INSERT ON menstrual_daily_logs
  FOR EACH ROW EXECUTE FUNCTION check_menstrual_gender();

CREATE INDEX idx_menstrual_user ON menstrual_cycles(user_id, cycle_start DESC);

CREATE TABLE menstrual_daily_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_date     DATE NOT NULL,
  flow_intensity  SMALLINT CHECK (flow_intensity BETWEEN 0 AND 5),
  symptoms        TEXT[],
  mood            TEXT[],
  basal_temp      NUMERIC(4,2),                       -- temperatura basal (°C)
  cervical_mucus  VARCHAR(50),                        -- 'dry','sticky','creamy','egg_white'
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, logged_date)
);

-- ── SHARE TOKENS ─────────────────────────────────────────────────────────────

CREATE TABLE share_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token           UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  access_level    share_access_level DEFAULT 'basic',
  custom_fields   TEXT[],                             -- campos específicos
  expires_at      TIMESTAMPTZ NOT NULL,
  -- Rastreabilidade LGPD
  accessed_by_name VARCHAR(255),
  accessed_at     TIMESTAMPTZ,
  access_ip       INET,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_token ON share_tokens(token) WHERE revoked_at IS NULL;
CREATE INDEX idx_share_user ON share_tokens(user_id);

-- ── AI CHAT HEALTH LOGS ───────────────────────────────────────────────────────

CREATE TABLE ai_health_chats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  messages        JSONB NOT NULL DEFAULT '[]',        -- [{role,content,timestamp}]
  health_summary  JSONB,                              -- extrato estruturado da IA
  flags           TEXT[],                             -- alertas identificados
  sentiment_score NUMERIC(3,2),                       -- -1 a 1
  completed       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, session_date)
);

CREATE INDEX idx_ai_chat_user ON ai_health_chats(user_id, session_date DESC);

-- ── NOTIFICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  channel         notification_channel NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT,
  metadata        JSONB,
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);

-- ── UPDATED_AT AUTO-UPDATE TRIGGER ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_family_updated_at
  BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_menstrual_updated_at
  BEFORE UPDATE ON menstrual_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ai_chat_updated_at
  BEFORE UPDATE ON ai_health_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── COMMENTS (LGPD) ──────────────────────────────────────────────────────────

COMMENT ON TABLE users IS 'Dados pessoais sensíveis — LGPD Art. 11 — acesso restrito com log';
COMMENT ON COLUMN users.cpf IS 'Criptografado com AES-256 na camada de aplicação';
COMMENT ON COLUMN users.allergies IS 'Dado sensível de saúde — LGPD';
COMMENT ON TABLE user_consents IS 'Rastreamento obrigatório de consentimento LGPD com versão e timestamp';
COMMENT ON TABLE audit_logs IS 'Log imutável para auditoria LGPD — não deletar registros';
COMMENT ON TABLE menstrual_cycles IS 'Dado sensível de saúde feminina — acesso apenas para a titular e familiares autorizados';
