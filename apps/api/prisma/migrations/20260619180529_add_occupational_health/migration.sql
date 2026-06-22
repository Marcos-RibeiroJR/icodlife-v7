-- CreateEnum
CREATE TYPE "GenderType" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending_verification', 'active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('father', 'mother', 'sibling', 'child', 'grandparent', 'grandchild', 'spouse', 'partner', 'other');

-- CreateEnum
CREATE TYPE "FamilyInviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('terms_of_use', 'data_processing', 'data_sharing_b2b', 'marketing');

-- CreateEnum
CREATE TYPE "ShareAccessLevel" AS ENUM ('basic', 'full', 'custom');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "keycloak_id" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cpf" TEXT,
    "full_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" "GenderType" NOT NULL,
    "blood_type" "BloodType" NOT NULL DEFAULT 'unknown',
    "is_donor" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'pending_verification',
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_rel" TEXT,
    "allergies" TEXT[],
    "chronic_conditions" TEXT[],
    "last_login_at" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "device_info" JSONB,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "member_user_id" TEXT,
    "relationship" "FamilyRelationship" NOT NULL,
    "custom_label" TEXT,
    "full_name" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" "GenderType",
    "share_hereditary" BOOLEAN NOT NULL DEFAULT false,
    "share_conditions" BOOLEAN NOT NULL DEFAULT false,
    "invite_status" "FamilyInviteStatus" NOT NULL DEFAULT 'pending',
    "invite_token" TEXT NOT NULL,
    "invite_email" TEXT,
    "invite_expires_at" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "lab_name" TEXT,
    "doctor_name" TEXT,
    "record_date" TIMESTAMP(3) NOT NULL,
    "s3_key" TEXT,
    "mongo_doc_id" TEXT,
    "ocr_text" TEXT,
    "result_status" TEXT NOT NULL DEFAULT 'pending',
    "result_notes" TEXT,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "doctor_name" TEXT NOT NULL,
    "specialty" TEXT,
    "cnes_code" TEXT,
    "location" TEXT,
    "appointment_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" JSONB NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "prescribing_doctor" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_logs" (
    "id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "taken_at" TIMESTAMP(3),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,

    CONSTRAINT "medication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_cycles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cycle_start" TIMESTAMP(3) NOT NULL,
    "cycle_end" TIMESTAMP(3),
    "cycle_length" INTEGER,
    "period_length" INTEGER,
    "flow_intensity" INTEGER,
    "symptoms" TEXT[],
    "mood" TEXT[],
    "notes" TEXT,
    "current_phase" TEXT,
    "next_cycle_predicted" TIMESTAMP(3),
    "ovulation_predicted" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_daily_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "logged_date" TIMESTAMP(3) NOT NULL,
    "flow_intensity" INTEGER,
    "symptoms" TEXT[],
    "mood" TEXT[],
    "basal_temp" DECIMAL(65,30),
    "cervical_mucus" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menstrual_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "access_level" "ShareAccessLevel" NOT NULL DEFAULT 'basic',
    "custom_fields" TEXT[],
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accessed_by_name" TEXT,
    "accessed_at" TIMESTAMP(3),
    "access_ip" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_health_chats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "health_summary" JSONB,
    "flags" TEXT[],
    "sentiment_score" DECIMAL(65,30),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_health_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloak_id_key" ON "users"("keycloak_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "menstrual_daily_logs_user_id_logged_date_key" ON "menstrual_daily_logs"("user_id", "logged_date");

-- CreateIndex
CREATE UNIQUE INDEX "share_tokens_token_key" ON "share_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ai_health_chats_user_id_session_date_key" ON "ai_health_chats"("user_id", "session_date");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_member_user_id_fkey" FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menstrual_cycles" ADD CONSTRAINT "menstrual_cycles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menstrual_daily_logs" ADD CONSTRAINT "menstrual_daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_health_chats" ADD CONSTRAINT "ai_health_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
