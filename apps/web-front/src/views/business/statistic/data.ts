// cspell:ignore unscored
import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getAcademicTermOptions } from '#/api/business/academic-term';

export const anomalyOptions = [
  { label: '未评分', value: 'unscored' },
  { label: '缺测', value: 'missing' },
  { label: '最终犯规', value: 'foul' },
  { label: '需补基线', value: 'missing_baseline' },
  { label: '规则异常', value: 'rule_mismatch' },
  { label: '待锁定', value: 'pending_lock' },
];

export function useFilterSchema(
  view: string,
  isTeacher: boolean,
  onChange: (field: string, value: unknown) => void,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [
    {
      component: 'Select',
      componentProps: {
        onChange: (value: unknown) => onChange('view', value),
        options: isTeacher
          ? [{ label: '成绩异常', value: 'anomalies' }]
          : [
              { label: '总体概览', value: 'overview' },
              { label: '项目分布', value: 'items' },
              { label: '总分分布', value: 'total-scores' },
              { label: '学校对比', value: 'comparisons' },
              { label: '成绩异常', value: 'anomalies' },
              { label: '待审事项', value: 'pending-approvals' },
            ],
      },
      defaultValue: isTeacher ? 'anomalies' : 'overview',
      fieldName: 'view',
      label: '统计视图',
    },
  ];
  if (view !== 'pending-approvals') {
    schema.push(
      {
        component: 'ApiSelect',
        componentProps: {
          api: getAcademicTermOptions,
          onChange: (value: unknown) => onChange('academic_term_id', value),
        },
        fieldName: 'academic_term_id',
        label: '学期',
      },
      {
        component: 'Select',
        componentProps: {
          allowClear: true,
          onChange: (value: unknown) => onChange('grade', value),
          options: [7, 8, 9].map((value) => ({
            label: `${value} 年级`,
            value,
          })),
        },
        fieldName: 'grade',
        label: '年级',
      },
      {
        component: 'Select',
        componentProps: {
          allowClear: true,
          onChange: (value: unknown) => onChange('gender', value),
          options: [
            { label: '男', value: 'male' },
            { label: '女', value: 'female' },
          ],
        },
        fieldName: 'gender',
        label: '性别',
      },
    );
  }
  if (view === 'anomalies') {
    schema.push({
      component: 'Select',
      componentProps: {
        allowClear: true,
        onChange: (value: unknown) => onChange('anomaly_type', value),
        options: anomalyOptions,
      },
      fieldName: 'anomaly_type',
      label: '异常类型',
    });
  }
  return schema;
}

export function useItemColumns(
  items: Record<string, unknown>[],
): VxeTableGridColumns<Record<string, unknown>> {
  const first = items[0];
  if (!first) return [];
  return Object.keys(first)
    .filter((key) => !['id', 'student_id'].includes(key))
    .map((key) => ({
      field: key,
      title: key,
      formatter: ({ cellValue }) => {
        if (cellValue === null || cellValue === undefined) return '—';
        if (
          typeof cellValue === 'object' &&
          !Array.isArray(cellValue) &&
          'name' in cellValue
        ) {
          return String(cellValue.name);
        }
        return typeof cellValue === 'object'
          ? JSON.stringify(cellValue)
          : String(cellValue);
      },
    }));
}
