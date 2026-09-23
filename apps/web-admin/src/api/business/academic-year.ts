import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface AcademicYear {
  id: string;
  [key: string]: unknown;
}

export function getAcademicYearList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<AcademicYear>>('/academic-years', {
    params,
  });
}

export function createAcademicYear(data: Record<string, unknown>) {
  return requestClient.post('/academic-years', data);
}

export function updateAcademicYear(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/academic-years/${id}`, {
    data,
    method: 'PATCH',
  });
}

export async function getAcademicYearOptions() {
  const result = await getAcademicYearList({ page: 1, per_page: 100 });
  return result.items.map((item) => ({
    label: [item.code, item.name].filter(Boolean).join(' '),
    value: item.id,
  }));
}

export interface AcademicTerm {
  id: string;
  term_no: number;
  starts_on: string;
  ends_on: string;
}
export function getAcademicYear(id: string) {
  return requestClient.get<AcademicYear & { terms: AcademicTerm[] }>(
    `/academic-years/${id}`,
  );
}
export function updateAcademicTerm(
  id: string,
  data: Pick<AcademicTerm, 'ends_on' | 'starts_on'>,
) {
  return requestClient.request(`/academic-terms/${id}`, {
    data,
    method: 'PATCH',
  });
}
