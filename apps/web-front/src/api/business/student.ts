import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface Student {
  id: string;
  student_no?: string;
  name?: string;
  gender?: string;
  school_class_id?: string;
  /** 最新学年下的年级；未建档年级资料时为 null。 */
  grade?: null | number;
  /** 适用的体测规则包编码。 */
  regulation_package_code?: string;
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
