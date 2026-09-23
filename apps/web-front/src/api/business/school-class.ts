import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface SchoolClass {
  id: string;
  [key: string]: unknown;
}

export function getSchoolClassList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<SchoolClass>>('/school-classes', {
    params,
  });
}

export function createSchoolClass(data: Record<string, unknown>) {
  return requestClient.post('/school-classes', data);
}

export function updateSchoolClass(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/school-classes/${id}`, {
    data,
    method: 'PATCH',
  });
}

export async function getSchoolClassOptions() {
  const result = await getSchoolClassList({ page: 1, per_page: 100 });
  return result.items.map((item) => ({
    label: [item.code, item.name].filter(Boolean).join(' '),
    value: item.id,
  }));
}
