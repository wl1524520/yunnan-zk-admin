import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface Student {
  id: string;
  student_no?: string;
  name?: string;
  [key: string]: unknown;
}

export function getStudentList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<Student>>('/students', { params });
}

export function createStudent(data: Record<string, unknown>) {
  return requestClient.post('/students', data);
}

export function updateStudent(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/students/${id}`, { data, method: 'PATCH' });
}

export async function getStudentOptions(name = '') {
  const result = await getStudentList({
    page: 1,
    per_page: 100,
    ...(name ? { name } : {}),
  });
  return result.items.map((item) => ({
    label: [item.student_no, item.name].filter(Boolean).join(' '),
    value: item.id,
  }));
}
