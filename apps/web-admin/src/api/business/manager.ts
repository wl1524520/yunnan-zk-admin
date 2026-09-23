import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface Manager {
  id: string;
  [key: string]: unknown;
}

export function getManagerList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<Manager>>('/managers', { params });
}

export function createManager(data: Record<string, unknown>) {
  return requestClient.post('/managers', data);
}

export function updateManager(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/managers/${id}`, { data, method: 'PATCH' });
}

export async function getManagerOptions() {
  const result = await getManagerList({ page: 1, per_page: 100 });
  return result.items.map((item) => ({
    label: [item.code, item.name].filter(Boolean).join(' '),
    value: item.id,
  }));
}

export function resetManagerPassword(id: string, password: string) {
  return requestClient.post(`/managers/${id}/reset-password`, {
    password,
  });
}
