-- CreateTable
CREATE TABLE "health_checkins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "checkin_date" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "question_index" INTEGER NOT NULL DEFAULT 0,
    "sentiment_score" DOUBLE PRECISION,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_level" TEXT NOT NULL DEFAULT 'low',
    "trend" TEXT,
    "flags" JSONB NOT NULL DEFAULT '[]',
    "health_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_signals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "checkin_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value_num" DOUBLE PRECISION,
    "value_text" TEXT,
    "polarity" TEXT NOT NULL DEFAULT 'neutral',
    "source" TEXT NOT NULL DEFAULT 'chat',
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_checkins_user_id_checkin_date_idx" ON "health_checkins"("user_id", "checkin_date");

-- CreateIndex
CREATE UNIQUE INDEX "health_checkins_user_id_checkin_date_key" ON "health_checkins"("user_id", "checkin_date");

-- CreateIndex
CREATE INDEX "health_signals_user_id_type_captured_at_idx" ON "health_signals"("user_id", "type", "captured_at");

-- CreateIndex
CREATE INDEX "health_signals_checkin_id_idx" ON "health_signals"("checkin_id");

-- AddForeignKey
ALTER TABLE "health_checkins" ADD CONSTRAINT "health_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_signals" ADD CONSTRAINT "health_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_signals" ADD CONSTRAINT "health_signals_checkin_id_fkey" FOREIGN KEY ("checkin_id") REFERENCES "health_checkins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
