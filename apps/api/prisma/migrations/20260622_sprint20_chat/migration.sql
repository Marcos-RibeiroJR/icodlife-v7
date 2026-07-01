-- Sprint 20: Chat médico-paciente via WebSocket

CREATE TABLE "chat_rooms" (
    "id"                TEXT NOT NULL,
    "doctor_id"         TEXT NOT NULL,
    "patient_id"        TEXT NOT NULL,
    "patient_doctor_id" TEXT,
    "last_message_at"   TIMESTAMP(3),
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
    "id"         TEXT NOT NULL,
    "room_id"    TEXT NOT NULL,
    "sender_id"  TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "read_at"    TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_rooms_doctor_id_patient_id_key"
    ON "chat_rooms"("doctor_id", "patient_id");

CREATE INDEX "chat_messages_room_id_created_at_idx"
    ON "chat_messages"("room_id", "created_at");

ALTER TABLE "chat_rooms"
    ADD CONSTRAINT "chat_rooms_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_rooms"
    ADD CONSTRAINT "chat_rooms_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages"
    ADD CONSTRAINT "chat_messages_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
