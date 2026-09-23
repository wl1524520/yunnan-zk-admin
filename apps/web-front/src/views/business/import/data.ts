import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ImportBatch, ImportRow } from '#/api/business/import';

export function useUploadSchema(
  options: { label: string; value: string }[],
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: { options, placeholder: '导入类型' },
      fieldName: 'resource_type',
      label: '导入类型',
      rules: 'required',
    },
  ];
}

export function useColumns(): VxeTableGridColumns<ImportBatch> {
  return [
    { field: 'resource_type', title: '类型' },
    { field: 'status', title: '状态', slots: { default: 'status' } },
    { field: 'total_rows', title: '总行数' },
    { field: 'valid_rows', title: '有效' },
    { field: 'invalid_rows', title: '错误' },
    { field: 'created_at', title: '创建时间' },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'action' },
      width: 100,
    },
  ];
}

export function usePreviewColumns(): VxeTableGridColumns<ImportRow> {
  return [
    { field: 'row_no', title: '行号', width: 80 },
    { field: 'validation_status', title: '校验状态', width: 120 },
    {
      field: 'data',
      title: '内容（敏感字段已脱敏）',
      slots: { default: 'data' },
    },
    { field: 'errors', title: '错误', slots: { default: 'errors' } },
  ];
}
