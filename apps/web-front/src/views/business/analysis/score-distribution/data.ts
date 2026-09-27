import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getAcademicYearOptions } from '#/api/business/academic-term';

import { genderField, gradeField, schoolField, termField } from '../shared';

export function useGridFormSchema(
  showSchoolFilter: boolean,
  schoolKeyword: Ref<string>,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [
    termField(false),
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: getAcademicYearOptions,
        placeholder: '学期与学年至少选一项',
      },
      fieldName: 'academic_year_id',
      label: '学年',
    },
    gradeField(),
    genderField(),
  ];
  if (showSchoolFilter) schema.push(schoolField(schoolKeyword));
  return schema;
}

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'label', minWidth: 180, title: '分档' },
    {
      field: 'range',
      formatter: ({ row }) =>
        row.lower_score !== undefined && row.upper_score !== undefined
          ? `${row.lower_score} ～ ${row.upper_score}`
          : '—',
      minWidth: 160,
      title: '得分区间',
    },
    { field: 'count', title: '人数', width: 100 },
  ];
}
