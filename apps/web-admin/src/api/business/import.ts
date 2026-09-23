import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface ImportBatch {
  id: string;
  resource_type: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  created_at: string;
}

export interface ImportRow {
  row_no: number;
  validation_status: string;
  errors: unknown;
  data: Record<string, unknown>;
  regulation_package?: { code: string; name: string };
}

export function getImportList(page: number, perPage = 20) {
  return requestClient.get<PageResult<ImportBatch>>('/imports', {
    params: { page, per_page: perPage },
  });
}

export function uploadImport(data: FormData) {
  return requestClient.post('/imports', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getImportBatch(id: string) {
  return requestClient.get<ImportBatch>(`/imports/${id}`);
}

export function getImportRows(id: string, page: number, perPage = 20) {
  return requestClient.get<PageResult<ImportRow>>(`/imports/${id}/rows`, {
    params: { page, per_page: perPage },
  });
}

export function runImportAction(id: string, kind: 'commit' | 'validate') {
  return requestClient.post(`/imports/${id}/${kind}`);
}
