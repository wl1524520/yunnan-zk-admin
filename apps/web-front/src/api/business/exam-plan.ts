import type { AcademicTerm } from './academic-term';
import type { School } from './school';
import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface ExamPlan {
  id: string;
  name: string;
  status: string;
  academic_term_id: string;
  academic_term?: AcademicTerm;
  publisher_district_id: number;
  starts_at: string;
  ends_at: string;
  schools: School[];
}

export interface RosterItem {
  exam_item_code: string;
  item_name: string;
  completed: boolean;
  missing_reason?: string;
}

export interface RosterRow {
  student_id: string;
  student_no: string;
  name: string;
  school_class?: { code: string; name: string };
  grade: number;
  status: string;
  expected_item_count: number;
  completed_item_count: number;
  items: RosterItem[];
}

export interface ExamPlanPayload {
  academic_term_id: string;
  school_ids: string[];
  name: string;
  starts_at: string;
  ends_at: string;
  request_id: string;
}

export function getExamPlanList(page: number, perPage = 20) {
  return requestClient.get<PageResult<ExamPlan>>('/exam-plans', {
    params: { page, per_page: perPage },
  });
}

export function createExamPlan(data: ExamPlanPayload) {
  return requestClient.post('/exam-plans', data);
}

export function runExamPlanAction(
  id: string,
  action: 'cancel' | 'close' | 'publish',
) {
  return requestClient.post(`/exam-plans/${id}/${action}`);
}

export function updateExamPlanDeadline(
  id: string,
  endsAt: string,
  reason: string,
) {
  return requestClient.request(`/exam-plans/${id}/deadline`, {
    data: { ends_at: endsAt, reason },
    method: 'PATCH',
  });
}

export function getPlanRoster(
  id: string,
  page: number,
  incompleteOnly: boolean,
  perPage = 20,
) {
  return requestClient.get<PageResult<RosterRow>>(
    `/exam-plans/${id}/students`,
    {
      params: {
        page,
        per_page: perPage,
        incomplete_only: incompleteOnly ? '1' : '0',
      },
    },
  );
}
