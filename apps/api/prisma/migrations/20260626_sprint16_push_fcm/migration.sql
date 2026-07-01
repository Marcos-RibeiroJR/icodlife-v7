-- Sprint 16: Push Notifications (FCM) — device_tokens table

CREATE TYPE "DevicePlatform" AS ENUM ('web', 'android', 'ios');

CREATE TABLE "device_tokens" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "platform"   "DevicePlatform" NOT NULL DEFAULT 'web',
  "device_id"  TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "device_tokens_user_id_token_key" ON "device_tokens"("user_id", "token");
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");
