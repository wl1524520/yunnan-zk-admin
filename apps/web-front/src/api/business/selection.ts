import { requestClient } from '#/api/request';

export interface OptionItem {
  code: string;
  name: string;
  variants: string[];
}

export interface OptionGroup {
  code: string;
  choose: number;
  at_least_one: string[];
  items: OptionItem[];
}

export interface ItemOptions {
  groups: OptionGroup[];
  grade: number;
  gender: string;
  regulation_package_code: string;
}

export interface ConfirmedSelection {
  group_code: string;
  confirmed_at: string;
  confirmed_by?: { name: string };
  items: { exam_item_code: string; variant_code?: string }[];
}

export function getItemOptions(academicTermId: string, studentId: string) {
  return requestClient.get<ItemOptions>('/exam-items', {
    params: { academic_term_id: academicTermId, student_id: studentId },
  });
}

export function getConfirmedSelections(
  academicTermId: string,
  studentId: string,
) {
  return requestClient.get<ConfirmedSelection[]>(
    `/students/${studentId}/item-selections`,
    { params: { academic_term_id: academicTermId } },
  );
}

export function submitSelections(
  mode: 'confirm' | 'correct',
  payload: Record<string, unknown>,
) {
  return requestClient.post(`/student-item-selections/batch-${mode}`, payload);
}
