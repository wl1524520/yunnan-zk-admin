import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface School {
  id: string;
  code: string;
  name: string;
}

export function getSchoolList(keyword = '') {
  return requestClient.get<PageResult<School>>('/schools', {
    params: { page: 1, per_page: 100, ...(keyword ? { keyword } : {}) },
  });
}

export async function getSchoolOptions(keyword = '') {
  const result = await getSchoolList(keyword);
  return result.items.map((school) => ({
    label: `${school.code} ${school.name}`,
    value: school.id,
  }));
}
