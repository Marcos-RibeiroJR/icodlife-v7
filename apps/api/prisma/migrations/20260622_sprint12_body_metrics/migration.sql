-- Sprint 12: Evolução Corporal — tabela body_metrics

CREATE TABLE "body_metrics" (
    "id"                TEXT        NOT NULL,
    "user_id"           TEXT        NOT NULL,
    "measured_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight_kg"         DECIMAL(65,30),
    "height_cm"         DECIMAL(65,30),
    "bmi"               DECIMAL(65,30),
    "bmi_category"      TEXT,
    "body_fat_pct"      DECIMAL(65,30),
    "muscle_mass_kg"    DECIMAL(65,30),
    "muscle_mass_pct"   DECIMAL(65,30),
    "visceral_fat_level" INTEGER,
    "water_pct"         DECIMAL(65,30),
    "bone_mass_kg"      DECIMAL(65,30),
    "metabolic_age"     INTEGER,
    "bmr"               INTEGER,
    "device_type"       TEXT,
    "notes"             TEXT,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "body_metrics_user_id_measured_at_idx" ON "body_metrics"("user_id", "measured_at");

ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
