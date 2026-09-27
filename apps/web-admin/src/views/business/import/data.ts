import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ImportBatch, ImportRow } from '#/api/business/import';

export const resourceTypeOptions = [
  { label: '地区', value: 'districts' },
  { label: '学校', value: 'schools' },
  { label: '班级', value: 'school_classes' },
  { label: '教师', value: 'school_teachers' },
  { label: '学生', value: 'students' },
];

const batchStatusOptions = [
  { color: 'default', label: '已上传', value: 'uploaded' },
  { color: 'processing', label: '校验中', value: 'validating' },
  { color: 'green', label: '校验通过', value: 'validated' },
  { color: 'red', label: '存在非法行', value: 'invalid' },
  { color: 'green', label: '已提交', value: 'committed' },
  { color: 'red', label: '校验失败', value: 'failed' },
];

const rowStatusOptions = [
  { color: 'green', label: '通过', value: 'valid' },
  { color: 'red', label: '未通过', value: 'invalid' },
];

export function useGridFormSchema(
  options: { label: string; value: string }[],
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: { allowClear: true, options },
      fieldName: 'resource_type',
      label: '导入类型',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: batchStatusOptions.map(({ label, value }) => ({
          label,
          value,
        })),
      },
      fieldName: 'status',
      label: '状态',
    },
  ];
}

export function useUploadSchema(
  options: { label: string; value: string }[],
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options,
        placeholder: '请选择导入类型',
      },
      fieldName: 'resource_type',
      label: '导入类型',
      rules: 'required',
    },
    {
      component: 'Upload',
      componentProps: {
        accept: '.csv,.xls,.xlsx',
        // 只在本地暂存文件，点击“上传文件”时随表单一起提交
        beforeUpload: () => false,
        maxCount: 1,
      },
      fieldName: 'file',
      label: '导入文件',
      renderComponentContent: () => {
        return {
          default: () => '选择文件',
        };
      },
      rules: 'selectRequired',
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<ImportBatch>,
): VxeTableGridColumns<ImportBatch> {
  return [
    {
      field: 'resource_type',
      title: '类型',
      formatter: ({ cellValue }) =>
        resourceTypeOptions.find(
          (item) => String(item.value) === String(cellValue),
        )?.label ?? String(cellValue ?? '—'),
    },
    {
      field: 'status',
      title: '状态',
      cellRender: { name: 'CellTag', options: batchStatusOptions },
    },
    { field: 'total_rows', title: '总行数' },
    { field: 'valid_rows', title: '有效' },
    { field: 'invalid_rows', title: '错误' },
    { field: 'created_at', title: '创建时间', minWidth: 160 },
    {
      field: 'operation',
      title: '操作',
      width: 100,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [{ code: 'preview', text: '预览' }],
      },
    },
  ];
}

export function usePreviewColumns(): VxeTableGridColumns<ImportRow> {
  return [
    { field: 'row_no', title: '行号', width: 80 },
    {
      field: 'validation_status',
      title: '校验状态',
      width: 120,
      cellRender: { name: 'CellTag', options: rowStatusOptions },
    },
    {
      field: 'data',
      title: '内容（敏感字段已脱敏）',
      slots: { default: 'data' },
    },
    { field: 'errors', title: '错误', slots: { default: 'errors' } },
  ];
}
