import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ScoreRow } from '#/api/business/scorebook';

import { getAcademicTermOptions } from '#/api/business/academic-term';

export function useFilterSchema(
  onTermChange: (id: string) => void,
): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: getAcademicTermOptions,
        onChange: (value: unknown) => onTermChange(String(value ?? '')),
      },
      fieldName: 'academic_term_id',
      label: '学期',
    },
  ];
}

export function useColumns(): VxeTableGridColumns<ScoreRow & { id: string }> {
  return [
    { type: 'expand', slots: { content: 'items' }, width: 50 },
    { field: 'student_no', title: '学籍号', slots: { default: 'student_no' } },
    { field: 'name', title: '姓名', slots: { default: 'name' } },
    { field: 'school', title: '学校', slots: { default: 'school' } },
    { field: 'class', title: '班级', slots: { default: 'class' } },
    { field: 'grade', title: '年级' },
    {
      field: 'completion',
      title: '完成情况',
      slots: { default: 'completion' },
    },
    { field: 'term', title: '学期分', slots: { default: 'term' } },
    {
      field: 'grade_score',
      title: '年级分',
      slots: { default: 'grade_score' },
    },
    { field: 'total', title: '总分', slots: { default: 'total' } },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'action' },
      width: 120,
    },
  ];
}
