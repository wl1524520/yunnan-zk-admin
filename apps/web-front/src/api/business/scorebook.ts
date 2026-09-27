import type { PageResult } from './types';

import { requestClient } from '#/api/request';

/** 成绩册单个考试项目的明细。 */
export interface ScoreItem {
  exam_item_code: string;
  item_name: string;
  category?: string;
  requirement_type?: string;
  group_code?: string;
  variant_code?: string;
  completed: boolean;
  missing_reason?: null | string;
  special_disposition?: boolean;
  score?: null | string;
  result_status?: null | string;
}

/** 学期分 / 年级分 / 总分；有对象即有分，term 为 draft|locked，grade 为 draft|final。 */
export interface ScoreValue {
  score?: string;
  status: string;
}

export interface ScoreRow {
  student: {
    gender?: string;
    id: string;
    name: string;
    student_no: string;
  };
  grade?: null | number;
  school?: null | { id: string; name: string };
  school_class?: null | { code?: string; id: string; name: string };
  status: 'completed' | 'partial' | 'pending';
  expected_item_count: number;
  completed_item_count: number;
  incomplete_item_count: number;
  items: ScoreItem[];
  term_score?: null | ScoreValue;
  grade_score?: null | ScoreValue;
  total_score?: null | ScoreValue;
}

export interface ScorebookQuery {
  academic_term_id: string;
  academic_year_id?: string;
  grade?: number;
  school_id?: string;
  school_class_id?: string;
  /** 姓名模糊搜索。 */
  name?: string;
  /** 学籍号精确查询。 */
  student_no?: string;
  page?: number;
  per_page?: number;
}

export interface ScorebookPage extends PageResult<ScoreRow> {
  caliber_version?: string;
  generated_at?: string;
}

export function getScorebook(params: ScorebookQuery) {
  return requestClient.get<ScorebookPage>('/scorebooks', { params });
}
