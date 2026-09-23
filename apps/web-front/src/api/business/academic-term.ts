import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface AcademicTerm {
  id: string;
  term_no: number;
  academic_year_id: string;
  academic_year?: { code: string; id: string };
}

export function getAcademicTermList() {
  return requestClient.get<PageResult<AcademicTerm>>('/academic-terms', {
    params: { page: 1, per_page: 100 },
  });
}

export async function getAcademicTermOptions() {
  const result = await getAcademicTermList();
  return result.items.map((term) => ({
    label: [term.academic_year?.code ?? '', `第 ${term.term_no} 学期`]
      .filter(Boolean)
      .join(' '),
    value: term.id,
  }));
}
