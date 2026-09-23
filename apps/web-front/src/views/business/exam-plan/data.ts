import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ExamPlan } from '#/api/business/exam-plan';

import { getAcademicTermOptions } from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';

export function useFormSchema(schoolKeyword: Ref<string>): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: { api: getAcademicTermOptions },
      fieldName: 'academic_term_id',
      label: '学期',
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: () => ({
        api: ({ keyword }: { keyword?: string }) => getSchoolOptions(keyword),
        filterOption: false,
        mode: 'multiple',
        onSearch: (keyword: string) => {
          schoolKeyword.value = keyword;
        },
        params: { keyword: schoolKeyword.value },
        showSearch: true,
      }),
      fieldName: 'school_ids',
      label: '覆盖学校',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '计划名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { type: 'datetime-local' },
      fieldName: 'starts_at',
      label: '开始时间',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { type: 'datetime-local' },
      fieldName: 'ends_at',
      label: '结束时间',
      rules: 'required',
    },
  ];
}

export function useColumns(): VxeTableGridColumns<ExamPlan> {
  return [
    { field: 'name', title: '计划名称' },
    { field: 'term', title: '学期', slots: { default: 'term' } },
    { field: 'schools', title: '学校', slots: { default: 'schools' } },
    { field: 'starts_at', title: '开始时间', slots: { default: 'starts_at' } },
    { field: 'ends_at', title: '结束时间', slots: { default: 'ends_at' } },
    { field: 'status', title: '状态', slots: { default: 'status' } },
    {
      field: 'actions',
      title: '操作',
      slots: { default: 'actions' },
      width: 310,
    },
  ];
}
