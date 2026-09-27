import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ExportJob } from '#/api/business/export';

import { getAcademicTermOptions } from '#/api/business/academic-term';

// 状态取值与后端 ExportJobStatus 枚举一致。
const statusOptions = [
  { color: 'default', label: '待执行', value: 'pending' },
  { color: 'processing', label: '执行中', value: 'running' },
  { color: 'success', label: '已完成', value: 'completed' },
  { color: 'error', label: '已失败', value: 'failed' },
  { color: 'warning', label: '已过期', value: 'expired' },
];

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '班级成绩册', value: 'scorebook' },
          { label: '统计汇总', value: 'statistics' },
        ],
      },
      defaultValue: 'scorebook',
      fieldName: 'type',
      label: '导出类型',
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: { api: getAcademicTermOptions },
      fieldName: 'academic_term_id',
      label: '学期',
      rules: 'required',
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<ExportJob>,
): VxeTableGridColumns<ExportJob> {
  return [
    { field: 'type_label', title: '类型' },
    {
      field: 'status',
      title: '状态',
      cellRender: { name: 'CellTag', options: statusOptions },
    },
    { field: 'requested_at', title: '申请时间' },
    { field: 'row_count', title: '行数' },
    { field: 'expires_at', title: '过期时间' },
    {
      field: 'operation',
      title: '操作',
      width: 120,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [
          {
            code: 'download',
            text: '下载',
            show: (row: ExportJob) => row.downloadable,
          },
        ],
      },
    },
  ];
}
