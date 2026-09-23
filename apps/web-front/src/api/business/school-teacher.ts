import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface SchoolTeacher {
  id: string;
  [key: string]: unknown;
}

export function getSchoolTeacherList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<SchoolTeacher>>('/school-teachers', {
    params,
  });
}

export function createSchoolTeacher(data: Record<string, unknown>) {
  return requestClient.post('/school-teachers', data);
}

export function updateSchoolTeacher(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/school-teachers/${id}`, {
    data,
    method: 'PATCH',
  });
}

export async function getSchoolTeacherOptions() {
  const result = await getSchoolTeacherList({ page: 1, per_page: 100 });
  return result.items.map((item) => ({
    label: [item.code, item.name].filter(Boolean).join(' '),
    value: item.id,
  }));
}
