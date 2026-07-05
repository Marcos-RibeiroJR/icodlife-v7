-- AlterTable
ALTER TABLE "asos" ADD COLUMN     "signature_expires_at" TIMESTAMP(3),
ADD COLUMN     "signature_hash" TEXT,
ADD COLUMN     "verify_token" TEXT;
