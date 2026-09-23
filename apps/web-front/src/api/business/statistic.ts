import { requestClient } from '#/api/request';

// cspell:ignore unbanded

export interface Metric {
  count: number;
  denominator: number;
  rate: null | string;
}

export interface StatisticsResult {
  caliber_version: string;
  generated_at: string;
  students?: number;
  expected_students?: number;
  participation?: Metric;
  completion?: Metric;
  missing?: Metric;
  items?: Record<string, unknown>[];
  districts?: Record<string, unknown>[];
  counts?: { count: number; label: string; type: string }[];
  distribution?: {
    bands?: Record<string, unknown>[];
    denominator: number;
    level: string;
    unbanded_count: number;
  };
  case_total?: number;
  item_total?: number;
  total?: number;
  meta?: { current_page: number; per_page: number; total: number };
  unavailable_indicators?: { code: string; status: string }[];
}

export function getStatistics(view: string, params: Record<string, unknown>) {
  return requestClient.get<StatisticsResult>(`/statistics/${view}`, { params });
}
