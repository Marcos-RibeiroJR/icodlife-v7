-- Sprint 2: Pressão Arterial, Cintura e Estoque de Medicamentos
-- AddField: LifestyleProfile.waistCm
ALTER TABLE "lifestyle_profiles" ADD COLUMN IF NOT EXISTS "waist_cm" DECIMAL;
-- AddField: LifestyleProfile.systolicBp
ALTER TABLE "lifestyle_profiles" ADD COLUMN IF NOT EXISTS "systolic_bp" INTEGER;
-- AddField: LifestyleProfile.diastolicBp
ALTER TABLE "lifestyle_profiles" ADD COLUMN IF NOT EXISTS "diastolic_bp" INTEGER;

-- AddField: Medication.lastPurchaseDate
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "last_purchase_date" TIMESTAMP(3);
-- AddField: Medication.totalPills
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "total_pills" INTEGER;
-- AddField: Medication.remainingPills
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "remaining_pills" INTEGER;
