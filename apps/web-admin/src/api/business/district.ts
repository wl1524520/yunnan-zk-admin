import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface District {
  code: string;
  id: string;
  level: number;
  name: string;
  parent_id: null | string;
  sort_order: number;
  status: 'active' | 'inactive';
  [key: string]: unknown;
}

export function getDistrictList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<District>>('/districts', { params });
}

export async function getAllDistricts(): Promise<District[]> {
  const perPage = 100;
  const firstPage = await getDistrictList({ page: 1, per_page: perPage });
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, Math.ceil(firstPage.total / perPage) - 1) },
      (_, index) => getDistrictList({ page: index + 2, per_page: perPage }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}

export function createDistrict(data: Record<string, unknown>) {
  return requestClient.post('/districts', data);
}

export function updateDistrict(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/districts/${id}`, { data, method: 'PATCH' });
}

export async function getDistrictOptions() {
  const result = await getDistrictList({ page: 1, per_page: 100 });
  return result.items.map((item) => ({
    label: [item.code, item.name].filter(Boolean).join(' '),
    value: item.id,
  }));
}
