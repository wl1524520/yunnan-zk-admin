import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';

export const specialOptions = [
  { label: '三年连续免考', value: 'continuous_exemption' },
  { label: '年度免考', value: 'annual_exemption' },
  { label: '未回户籍校应考', value: 'registered_elsewhere' },
  { label: '省外转入位次核算', value: 'out_of_province' },
  { label: '残疾学生单项平均分组合', value: 'disability_partial' },
  { label: '学生作弊项目计零', value: 'cheating_item_zero' },
  { label: '参与作弊学期计零', value: 'cheating_term_zero' },
  { label: '竞赛违规当年计零', value: 'competition_violation_zero' },
];

export function useCommonSchema(
  studentOptions: Ref<{ label: string; value: string }[]>,
  yearOptions: Ref<{ label: string; value: string }[]>,
  termOptions: Ref<{ label: string; value: string }[]>,
  needsTerm: boolean,
  onStudentSearch: (name: string) => void,
  onChange: (field: string, value: unknown) => void,
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        onChange: (value: unknown) => onChange('case_type', value),
        options: [
          { label: '成绩修订', value: 'score_correction' },
          { label: '竞赛加分', value: 'competition_bonus' },
          { label: '特殊认定／免考', value: 'special_student' },
          { label: '学生转学', value: 'student_transfer' },
        ],
      },
      defaultValue: 'special_student',
      fieldName: 'case_type',
      label: '申请类型',
    },
    {
      component: 'Select',
      componentProps: () => ({
        filterOption: false,
        onChange: (value: unknown) => onChange('student_id', value),
        onSearch: onStudentSearch,
        options: studentOptions.value,
        showSearch: true,
      }),
      fieldName: 'student_id',
      label: '学生',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: () => ({
        onChange: (value: unknown) => onChange('academic_year_id', value),
        options: yearOptions.value,
      }),
      fieldName: 'academic_year_id',
      label: '学年',
      rules: 'required',
    },
    ...(needsTerm
      ? [
          {
            component: 'Select' as const,
            componentProps: () => ({ options: termOptions.value }),
            fieldName: 'academic_term_id',
            label: '学期',
            rules: 'required' as const,
          },
        ]
      : []),
    {
      component: 'Input',
      componentProps: { placeholder: '请说明申请理由' },
      fieldName: 'reason',
      label: '申请理由',
      rules: 'required',
    },
  ];
}
