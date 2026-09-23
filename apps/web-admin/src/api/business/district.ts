import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface District {
  id: string;
  [key: string]: unknown;
}

export function getDistrictList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<District>>('/districts', { params });
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
