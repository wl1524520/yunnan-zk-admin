import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface School {
  code: string;
  district_id: number;
  district_full_name: string;
  filing_district_id: null | number;
  id: string;
  name: string;
  supervising_district_id: number;
  [key: string]: unknown;
}

export function getSchoolList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<School>>('/schools', { params });
}

export function createSchool(data: Record<string, unknown>) {
  return requestClient.post('/schools', data);
}

export function updateSchool(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/schools/${id}`, { data, method: 'PATCH' });
}

export async function getSchoolOptions() {
  const result = await getSchoolList({ page: 1, per_page: 100 });
  return result.items.map((item) => ({
    label: [item.code, item.name].filter(Boolean).join(' '),
    value: item.id,
  }));
}
