// apps/api/src/modules/exam-results/dto/create-exam-result.dto.ts
export class CreateExamResultDto {
  examDate: string;
  labName?: string;
  doctorName?: string;
  examType: string; // hemograma | bioquimica | hormonal | lipidograma | urina | outro
  healthRecordId?: string;
  items?: CreateExamItemDto[];
}

export class CreateExamItemDto {
  marker: string;
  markerCode?: string;
  unit?: string;
  value: number;
  rawValue?: string;
  refMin?: number;
  refMax?: number;
  refSource?: string;
}
