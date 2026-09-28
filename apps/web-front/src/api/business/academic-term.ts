import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface AcademicTerm {
  id: string;
  term_no: number;
  academic_year_id: string;
  academic_year?: { code: string; id: string };
  starts_on?: null | string;
  ends_on?: null | string;
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

export async function getAcademicTermOptionsNewestFirst() {
  const { items } = await getAcademicTermList();
  return items
    .toSorted((a, b) => {
      const yearOrder = (b.academic_year?.code ?? '').localeCompare(
        a.academic_year?.code ?? '',
      );
      return yearOrder || b.term_no - a.term_no;
    })
    .map((term) => ({
      label: [term.academic_year?.code ?? '', `第 ${term.term_no} 学期`]
        .filter(Boolean)
        .join(' '),
      value: term.id,
    }));
}

// 业务端无独立学年接口：学年选项由学期列表按学年去重得到。
export async function getAcademicYearOptions() {
  const { items } = await getAcademicTermList();
  const years = new Map<string, string>();
  for (const term of items) {
    if (term.academic_year)
      years.set(term.academic_year.id, term.academic_year.code);
  }
  return [...years.entries()].map(([value, label]) => ({ label, value }));
}
