import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface StudentDetail {
  id: string;
  student_no: string;
  name: string;
  gender: string;
  status: string;
  school_id: string;
  school_class_id?: string;
  school?: { name: string };
  school_class?: { name: string };
  regulation_package_code: string;
}

export interface Movement {
  id: string;
  movement_type: string;
  moved_at: string;
  reason: string;
  from_school_class?: { name: string };
  to_school_class?: { name: string };
}

export interface GradeProfile {
  id: string;
  grade: number;
  academic_year_id: string;
  academic_year?: { code: string };
}

export interface Attempt {
  id: string;
  source_record_no: string;
  item?: { name: string };
  result_status: string;
  scoring_status: string;
  process_status: string;
  score?: string;
  tested_at: string;
  tested_school?: { name: string };
  current_school?: { name: string };
}

export interface TermResult {
  id: string;
  academic_term?: { id: string; term_no: number };
  academic_year?: { code: string };
  status: string;
  term_score?: string;
  source_revision: number;
  calculated_revision: number;
  pending_exam_item_codes: string[];
}

export interface GradeResult {
  id: string;
  grade: number;
  academic_year?: { code: string };
  grade_score?: string;
  status: string;
}

export interface TotalResult {
  total_score?: string;
  status: string;
}

export function getStudentDetail(id: string) {
  return requestClient.get<StudentDetail>(`/students/${id}`);
}

export function getStudentGradeProfiles(id: string) {
  return requestClient.get<PageResult<GradeProfile>>(
    `/students/${id}/grade-profiles`,
    { params: { page: 1, per_page: 100 } },
  );
}

export function getStudentAttempts(id: string) {
  return requestClient.get<PageResult<Attempt>>(`/students/${id}/attempts`, {
    params: { page: 1, per_page: 100 },
  });
}

export function getStudentTermResults(id: string) {
  return requestClient.get<PageResult<TermResult>>(
    `/students/${id}/term-result`,
    { params: { page: 1, per_page: 100 } },
  );
}

export function getStudentGradeResults(id: string) {
  return requestClient.get<PageResult<GradeResult>>(
    `/students/${id}/grade-results`,
    { params: { page: 1, per_page: 100 } },
  );
}

export function getStudentMovements(id: string) {
  return requestClient.get<PageResult<Movement>>(`/students/${id}/movements`, {
    params: { page: 1, per_page: 100 },
  });
}

export function getStudentTotalResult(id: string) {
  return requestClient.get<TotalResult>(`/students/${id}/total-result`);
}

export function createStudentMovement(
  id: string,
  payload: Record<string, unknown>,
) {
  return requestClient.post(`/students/${id}/movements`, payload);
}

export function createStudentGradeProfile(
  id: string,
  academicYearId: string,
  grade: number,
) {
  return requestClient.post(`/students/${id}/grade-profiles`, {
    academic_year_id: academicYearId,
    grade,
  });
}

export function voidStudentAttempt(id: string, reason: string) {
  return requestClient.post(`/attempts/${id}/void`, { reason });
}

export function lockStudentTermResult(studentId: string, termId: string) {
  return requestClient.post(
    `/students/${studentId}/term-results/${termId}/lock`,
  );
}
