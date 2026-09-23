import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface ScoreRow {
  student: { id: string; name: string; student_no: string };
  grade?: number;
  school?: { name: string };
  school_class?: { name: string };
  status: string;
  expected_item_count: number;
  completed_item_count: number;
  items: {
    completed: boolean;
    exam_item_code: string;
    item_name: string;
    score?: string;
  }[];
  term_score?: { score?: string; status: string };
  grade_score?: { score?: string; status: string };
  total_score?: { score?: string; status: string };
}

export interface ScorebookPage extends PageResult<ScoreRow> {
  caliber_version?: string;
  generated_at?: string;
}

export function getScorebook(
  academicTermId: string,
  page: number,
  perPage = 20,
) {
  return requestClient.get<ScorebookPage>('/scorebooks', {
    params: { academic_term_id: academicTermId, page, per_page: perPage },
  });
}
