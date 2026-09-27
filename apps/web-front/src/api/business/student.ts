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
