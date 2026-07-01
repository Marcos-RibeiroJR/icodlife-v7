-- AlterTable
ALTER TABLE "asos" ADD COLUMN     "company_id" TEXT;

-- AddForeignKey
ALTER TABLE "asos" ADD CONSTRAINT "asos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
