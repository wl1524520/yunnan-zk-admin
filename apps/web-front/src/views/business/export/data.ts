import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ExportJob } from '#/api/business/export';

import { getAcademicTermOptions } from '#/api/business/academic-term';

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

export function useColumns(): VxeTableGridColumns<ExportJob> {
  return [
    { field: 'type_label', title: '类型' },
    { field: 'status', title: '状态', slots: { default: 'status' } },
    { field: 'requested_at', title: '申请时间' },
    { field: 'row_count', title: '行数' },
    { field: 'expires_at', title: '过期时间' },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'action' },
      width: 120,
    },
  ];
}
