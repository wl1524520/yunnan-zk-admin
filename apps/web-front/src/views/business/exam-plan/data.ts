import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { ExamPlan } from '#/api/business/exam-plan';

import { getAcademicTermOptions } from '#/api/business/academic-term';
import { getSchoolOptions } from '#/api/business/school';

export function useFormSchema(schoolKeyword: Ref<string>): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: getAcademicTermOptions,
        class: 'w-full',
        filterOption: (inputValue: string, option: { label: string }) =>
          option.label.includes(inputValue),
        placeholder: '请选择学期',
        showSearch: true,
      },
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
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD HH:mm:ss',
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'starts_at',
      label: '开始时间',
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD HH:mm:ss',
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'ends_at',
      label: '结束时间',
      rules: 'required',
    },
  ];
}

export function usePostponeSchema(): VbenFormSchema[] {
  return [
    {
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD HH:mm:ss',
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'ends_at',
      label: '新的截止时间',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'reason',
      label: '调整原因',
      rules: 'required',
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<ExamPlan>,
  canOperate: (plan: ExamPlan) => boolean,
): VxeTableGridColumns<ExamPlan> {
  return [
    { field: 'name', title: '计划名称' },
    { field: 'term', title: '学期', slots: { default: 'term' } },
    { field: 'schools', title: '学校', slots: { default: 'schools' } },
    { field: 'starts_at', title: '开始时间', slots: { default: 'starts_at' } },
    { field: 'ends_at', title: '结束时间', slots: { default: 'ends_at' } },
    { field: 'status', title: '状态', slots: { default: 'status' } },
    {
      field: 'operation',
      title: '操作',
      width: 190,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [
          { code: 'roster', text: '名单' },
          {
            code: 'publish',
            text: '发布',
            show: (row: ExamPlan) => canOperate(row) && row.status === 'draft',
          },
          {
            code: 'postpone',
            text: '延期',
            show: (row: ExamPlan) =>
              canOperate(row) && row.status === 'published',
          },
          {
            code: 'close',
            text: '关闭',
            show: (row: ExamPlan) =>
              canOperate(row) && row.status === 'published',
          },
          {
            code: 'cancel',
            text: '取消',
            danger: true,
            show: (row: ExamPlan) => canOperate(row) && row.status === 'draft',
          },
        ],
      },
    },
  ];
}
