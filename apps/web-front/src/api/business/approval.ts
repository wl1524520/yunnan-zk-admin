import type { PageResult } from './types';

import { requestClient } from '#/api/request';

export interface ApprovalItem {
  id: string;
  student?: { name: string; student_no: string };
  proposed_snapshot?: Record<string, unknown>;
  target_school_id?: string;
  applied_at?: string;
  expected_latest_movement_id?: null | string;
}

export interface Attachment {
  id: string;
  category: string;
  original_name: string;
}

export interface ApprovalCase {
  id: string;
  case_no: string;
  case_type: string;
  workflow_type: string;
  status: string;
  revision_no: number;
  reason: string;
  school_id: string;
  school?: { name: string };
  direct_reviewer_district_code: string;
  items: ApprovalItem[];
  attachments?: Attachment[];
  events?: { comment?: string; event_type: string; occurred_at: string }[];
  awaiting_receipt?: boolean;
  awaiting_receipt_days?: number;
}

export interface TransferTarget {
  id: string;
  code: string;
  name: string;
  classes: { code: string; id: string; name: string }[];
}

export interface ApprovalAttempt {
  id: string;
  source_record_no: string;
  item?: { name: string };
  measurements_checksum: string;
  effective_measurements: {
    component_code: string;
    is_valid: boolean;
    unit?: string;
    value: unknown;
  }[];
}

export function getApprovalList(params: Record<string, unknown>) {
  return requestClient.get<PageResult<ApprovalCase>>('/approval-cases', {
    params,
  });
}

export function getApprovalCase(id: string) {
  return requestClient.get<ApprovalCase>(`/approval-cases/${id}`);
}

export function runApprovalAction(
  id: string,
  kind: 'apply' | 'decline' | 'review' | 'submit' | 'withdraw',
  payload: Record<string, unknown>,
) {
  return requestClient.post(`/approval-cases/${id}/${kind}`, payload);
}

export function getApprovalAttachmentUrl(id: string) {
  return requestClient.get<{ url: string }>(
    `/approval-attachments/${id}/download`,
  );
}

export function uploadApprovalAttachment(id: string, data: FormData) {
  return requestClient.post(`/approval-cases/${id}/attachments`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getTransferTargets(keyword = '') {
  return requestClient.get<PageResult<TransferTarget>>(
    '/student-transfer-targets',
    {
      params: { page: 1, per_page: 100, ...(keyword ? { keyword } : {}) },
    },
  );
}

export function getApprovalStudentAttempts(
  studentId: string,
  academicTermId: string,
) {
  return requestClient.get<PageResult<ApprovalAttempt>>(
    `/students/${studentId}/attempts`,
    {
      params: {
        page: 1,
        per_page: 100,
        academic_term_id: academicTermId,
      },
    },
  );
}

export function createApprovalCase(payload: Record<string, unknown>) {
  return requestClient.post('/approval-cases', payload);
}
