import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface District {
  full_name: string;
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

  // JSONBigInt 返回无原型对象，VXE 树表格需要行对象的 hasOwnProperty。
  return [firstPage, ...remainingPages].flatMap((page) =>
    page.items.map((district) => ({ ...district })),
  );
}

export function createDistrict(data: Record<string, unknown>) {
  return requestClient.post('/districts', data);
}

export function updateDistrict(id: string, data: Record<string, unknown>) {
  return requestClient.request(`/districts/${id}`, { data, method: 'PATCH' });
}

export interface DistrictTreeNode {
  children?: DistrictTreeNode[];
  id: string;
  name: string;
}

export interface DistrictTreeOption {
  children?: DistrictTreeOption[];
  label: string;
  value: string;
}

function toTreeOptions(nodes: DistrictTreeNode[]): DistrictTreeOption[] {
  return nodes.map((node) => ({
    label: node.name,
    value: node.id,
    ...(node.children?.length
      ? { children: toTreeOptions(node.children) }
      : {}),
  }));
}

async function districtTree(activeOnly: boolean) {
  const { data } = await requestClient.get<{ data: DistrictTreeNode[] }>(
    '/districts/tree',
    activeOnly ? { params: { status: 'active' } } : undefined,
  );
  return toTreeOptions(data);
}

export function getDistrictTree() {
  return districtTree(false);
}

export function getActiveDistrictTree() {
  return districtTree(true);
}
