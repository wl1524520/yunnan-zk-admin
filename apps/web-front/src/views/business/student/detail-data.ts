import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type {
  Attempt,
  GradeProfile,
  Movement,
  TermResult,
} from '#/api/business/student-detail';

import { getSchoolClassOptions } from '#/api/business/school-class';

export const movementTypeOptions = [
  { color: 'blue', label: '初次分班', value: 'class_assignment' },
  { color: 'cyan', label: '同校转班', value: 'class_change' },
  { color: 'purple', label: '转学', value: 'school_transfer' },
];

export const resultStatusOptions = [
  { color: 'green', label: '有效', value: 'valid' },
  { color: 'red', label: '犯规', value: 'foul' },
  { color: 'orange', label: '缺考', value: 'absent' },
];

export const scoringStatusOptions = [
  { color: 'orange', label: '待评分', value: 'pending' },
  { color: 'green', label: '已评分', value: 'scored' },
  { color: 'red', label: '缺基线', value: 'missing_baseline' },
  { color: 'default', label: '不适用', value: 'not_applicable' },
];

export const processStatusOptions = [
  { color: 'blue', label: '已接收', value: 'received' },
  { color: 'green', label: '已评定', value: 'evaluated' },
  { color: 'red', label: '已作废', value: 'voided' },
];

export const termStatusOptions = [
  { color: 'orange', label: '草稿', value: 'draft' },
  { color: 'green', label: '已锁定', value: 'locked' },
];

export const gradeStatusOptions = [
  { color: 'orange', label: '草稿', value: 'draft' },
  { color: 'green', label: '正式', value: 'final' },
];

export function formatEnumLabel(
  value: unknown,
  options: readonly { label: string; value: string }[],
): string {
  return options.find((option) => option.value === value)?.label ?? '未知状态';
}

export function formatEnumColor(
  value: unknown,
  options: readonly { color: string; value: string }[],
): string {
  return options.find((option) => option.value === value)?.color ?? 'default';
}

export function useProfileSchema(
  yearOptions: Ref<{ label: string; value: string }[]>,
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: () => ({
        class: 'w-full',
        options: yearOptions.value,
      }),
      fieldName: 'academic_year_id',
      label: '学年',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: [7, 8, 9].map((grade) => ({
          label: `${grade} 年级`,
          value: grade,
        })),
      },
      defaultValue: 7,
      fieldName: 'grade',
      label: '年级',
    },
  ];
}

export function useMovementSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: getSchoolClassOptions,
        class: 'w-full',
        filterOption: (inputValue: string, option: { label: string }) =>
          option.label.includes(inputValue),
        placeholder: '请选择班级',
        showSearch: true,
      },
      fieldName: 'target_school_class_id',
      label: '目标班级',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'reason',
      label: '流转原因',
      rules: 'required',
    },
  ];
}

export function useProfileColumns(): VxeTableGridColumns<GradeProfile> {
  return [
    { field: 'year', title: '学年', slots: { default: 'year' } },
    { field: 'grade', title: '年级' },
  ];
}

export function useMovementColumns(): VxeTableGridColumns<Movement> {
  return [
    {
      field: 'movement_type',
      title: '类型',
      slots: { default: 'movement_type' },
    },
    { field: 'from', title: '原班级', slots: { default: 'from' } },
    { field: 'to', title: '新班级', slots: { default: 'to' } },
    { field: 'moved_at', title: '时间' },
    { field: 'reason', title: '原因' },
  ];
}

export function useAttemptColumns(): VxeTableGridColumns<Attempt> {
  return [
    { field: 'source_record_no', title: '记录号' },
    { field: 'item', title: '项目', slots: { default: 'item' } },
    {
      field: 'result_status',
      title: '认定',
      slots: { default: 'result_status' },
    },
    {
      field: 'scoring_status',
      title: '评分',
      slots: { default: 'scoring_status' },
    },
    {
      field: 'process_status',
      title: '处理',
      slots: { default: 'process_status' },
    },
    { field: 'score', title: '得分' },
    {
      field: 'tested_school',
      title: '测试学校',
      slots: { default: 'tested_school' },
    },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'attempt_action' },
      width: 100,
    },
  ];
}

export function useTermColumns(): VxeTableGridColumns<TermResult> {
  return [
    { field: 'year', title: '学年', slots: { default: 'term_year' } },
    { field: 'term', title: '学期', slots: { default: 'term' } },
    { field: 'term_score', title: '得分' },
    { field: 'status', title: '状态', slots: { default: 'term_status' } },
    { field: 'revision', title: '修订', slots: { default: 'revision' } },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'term_action' },
      width: 100,
    },
  ];
}
