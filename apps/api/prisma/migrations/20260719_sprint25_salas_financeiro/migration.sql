-- AlterTable: custo de ocupação da sala (usado para debitar a conta corrente do médico)
ALTER TABLE "clinic_rooms" ADD COLUMN     "cost_per_hour" DECIMAL(65,30),
ADD COLUMN     "cost_per_use" DECIMAL(65,30);

-- AlterTable: lançamento financeiro pode ser vinculado a uma sala (custo de ocupação)
ALTER TABLE "doctor_cash_entries" ADD COLUMN     "room_id" TEXT;

-- AddForeignKey
ALTER TABLE "doctor_cash_entries" ADD CONSTRAINT "doctor_cash_entries_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "clinic_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
