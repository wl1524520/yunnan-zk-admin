import { requestClient } from '#/api/request';

export type StatisticView =
  | 'anomalies'
  | 'class-comparisons'
  | 'comparisons'
  | 'health'
  | 'items'
  | 'overview'
  | 'pending-approvals'
  | 'total-scores';

export interface StatisticsQuery {
  academic_term_id?: string;
  academic_year_id?: string;
  grade?: number;
  gender?: string;
  school_id?: string;
  school_ids?: string[];
  school_class_id?: string;
  exam_item_code?: string;
  category?: 'basic' | 'skill';
  type?: string;
  status?: string;
  workflow_type?: string;
  /** 姓名模糊搜索（仅 anomalies）。 */
  name?: string;
  /** 学籍号精确查询（仅 anomalies）。 */
  student_no?: string;
  page?: number;
  per_page?: number;
}

export interface Metric {
  count: number;
  denominator: number;
  rate: null | string;
}

interface StatisticsBase {
  caliber_version: string;
  drilldown: string;
  filters: Record<string, unknown>;
  generated_at: string;
}

export interface StatisticsTerm {
  academic_year_id: string;
  id: string;
  term_no: number;
}

export interface OverviewResult extends StatisticsBase {
  term: StatisticsTerm;
  students: number;
  expected_students: number;
  participation: Metric;
  completion: Metric;
  missing: Metric;
  item_filter_applied: boolean;
  unavailable_indicators: { indicator: string; reason: string }[];
}

export interface BandRow {
  key: string;
  label: string;
  lower_rate: string;
  upper_rate: string;
  count: number;
  lower_score?: string;
  upper_score?: string;
}

export interface ItemDistributionRow {
  item: { category: string; exam_item_code: string; name: string };
  caps: Record<string, string>;
  calculated_count: number;
  bands: BandRow[];
}

export interface ItemsResult extends StatisticsBase {
  term: StatisticsTerm;
  distribution: {
    basis: string;
    cap: null | string;
    denominator: number;
    excluded_statuses: string[];
    level: string;
  };
  items: ItemDistributionRow[];
  total: number;
}

export interface HealthMonitoringRow {
  grade: number;
  item: { exam_item_code: string; name: string };
  students: number;
  measured: number;
  missing_current: number;
  coverage_rate: null | string;
  summary: null | {
    max: string;
    mean: string;
    median: string;
    min: string;
    q1: string;
    q3: string;
  };
  change: null | {
    down: number;
    missing_prior: number;
    paired: number;
    same: number;
    up: number;
  };
}

export interface HealthMonitoringResult extends StatisticsBase {
  academic_year: { code: string; id: string };
  items: HealthMonitoringRow[];
}

export interface TotalScoresResult extends StatisticsBase {
  academic_year: { code: string; id: string };
  distribution: {
    bands: BandRow[];
    basis: string;
    cap: null | string;
    caps: string[];
    denominator: number;
    excluded_statuses: string[];
    grade: null | number;
    level: 'grade' | 'grade_all';
  };
}

export interface ComparisonRow {
  school?: { code: string; id: string; name: string };
  school_class?: { code: string; id: string; name: string };
  district?: { id: string; level: string; name: string };
  students: number;
  expected_students: number;
  participating_students: number;
  participation_rate: null | string;
  completion_rate: null | string;
  missing_rate: null | string;
  completed_students: number;
  missing_students: number;
}

export interface ComparisonsResult extends StatisticsBase {
  term: StatisticsTerm;
  items: ComparisonRow[];
  districts: ComparisonRow[];
  total: number;
}

export interface ClassComparisonsResult extends StatisticsBase {
  term: StatisticsTerm;
  items: ComparisonRow[];
  total: number;
}

export interface AnomalyRow {
  type: string;
  attempt_id?: string;
  student: null | {
    gender: string;
    id: string;
    name: string;
    student_no: string;
  };
  grade: null | number;
  school: null | { id: string; name: string };
  school_class: null | { code?: string; id: string; name: string };
  item?: null | { category: string; exam_item_code: string; name: string };
  result_status?: string;
  process_status?: string;
  scoring_status?: string;
  score?: null | string;
  tested_at?: string;
  received_at?: string;
  tested_school?: null | { id: string; name: string };
  tested_school_class?: null | { code?: string; id: string; name: string };
  term_score?: {
    calculated_at: null | string;
    calculated_revision: number;
    id: string;
    score: string;
    source_revision: number;
    status: string;
    term_no: number;
  };
}

export interface AnomaliesResult extends StatisticsBase {
  term: StatisticsTerm;
  counts: { count: number; label: string; type: string }[];
  type?: string;
  items?: AnomalyRow[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  total?: number;
}

export interface PendingApprovalRow {
  workflow_type: string;
  status: string;
  case_count: number;
  item_count: number;
  actionable: boolean;
}

export interface PendingApprovalsResult extends StatisticsBase {
  items: PendingApprovalRow[];
  total: number;
  case_total: number;
  item_total: number;
}

export type StatisticsResult =
  | AnomaliesResult
  | ClassComparisonsResult
  | ComparisonsResult
  | HealthMonitoringResult
  | ItemsResult
  | OverviewResult
  | PendingApprovalsResult
  | TotalScoresResult;

export function getStatistics<T extends StatisticsResult>(
  view: StatisticView,
  params: StatisticsQuery,
) {
  return requestClient.get<T>(`/statistics/${view}`, { params });
}
