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

export function useProfileSchema(
  yearOptions: Ref<{ label: string; value: string }[]>,
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: () => ({ options: yearOptions.value }),
      fieldName: 'academic_year_id',
      label: '学年',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
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
      componentProps: { api: getSchoolClassOptions },
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
    { field: 'movement_type', title: '类型' },
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
    { field: 'result_status', title: '认定' },
    { field: 'scoring_status', title: '评分' },
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
