import { requestClient } from '#/api/request';

export interface ExportJob {
  id: string;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  requested_at: string;
  completed_at?: string;
  expires_at?: string;
  row_count?: number;
  downloadable: boolean;
  error_code?: string;
}

export function getExportJob(id: string) {
  return requestClient.get<ExportJob>(`/exports/${id}`);
}

export function createExportJob(
  type: 'scorebook' | 'statistics',
  academicTermId: string,
) {
  return requestClient.post<ExportJob>('/exports', {
    type,
    format: 'csv',
    filters: { academic_term_id: academicTermId },
    request_id: crypto.randomUUID(),
  });
}

export function downloadExportJob(id: string) {
  return requestClient.request<Blob>(`/exports/${id}/download`, {
    method: 'GET',
    responseType: 'blob',
  });
}
