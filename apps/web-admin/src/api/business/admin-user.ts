import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface AdminUser {
  id: string;
  [key: string]: unknown;
}

export function getAdminUserList(params?: Record<string, unknown>) {
  return requestClient.get<PageResult<AdminUser>>('/admin-users', { params });
}

export function createAdminUser(data: Record<string, unknown>) {
  return requestClient.post('/admin-users', data);
}

export function updateAdminUser(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/admin-users/${id}`, { data, method: 'PATCH' });
}

export async function getAdminUserOptions() {
  const result = await getAdminUserList({ page: 1, per_page: 100 });
  return result.items.map((item) => ({
    label: [item.code, item.name].filter(Boolean).join(' '),
    value: item.id,
  }));
}
