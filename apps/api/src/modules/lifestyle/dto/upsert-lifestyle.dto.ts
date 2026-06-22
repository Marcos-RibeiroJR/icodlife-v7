// apps/api/src/modules/lifestyle/dto/upsert-lifestyle.dto.ts
export class UpsertLifestyleDto {
  heightCm?: number;
  weightKg?: number;
  waistCm?: number;
  systolicBp?: number;
  diastolicBp?: number;

  smokingStatus?: string;   // never | former | occasional | daily
  cigarettesPerDay?: number;
  smokingYears?: number;
  quitDate?: string;

  alcoholStatus?: string;   // none | occasional | weekly | daily
  drinksPerWeek?: number;
  alcoholTypes?: string[];

  exerciseFrequency?: string; // sedentary | 1-2x | 3-4x | 5+x
  exerciseTypes?: string[];
  exerciseMinutes?: number;

  sleepHoursAvg?: number;
  sleepQuality?: number;    // 1–5

  stressLevel?: number;     // 1–10
  moodAvg?: number;         // 1–10
  mentalHealthDiagnoses?: string[];
  therapyFrequency?: string;

  sexuallyActive?: boolean;
  contraceptionType?: string;
  stdProtection?: boolean;

  workHoursPerWeek?: number;
  workEnvironment?: string;
  ergonomicRisk?: number;   // 1–5
  occupationalChemicals?: boolean;

  dietType?: string;        // omnivore | vegetarian | vegan | other
  mealsPerDay?: number;
  waterLitersDay?: number;

  cityName?: string;
  stateCode?: string;
  ibgeCode?: string;
}
