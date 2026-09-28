import type { Ref } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getSchoolClassOptions } from '#/api/business/school-class';

import {
  anomalyStatusOptions,
  anomalyTypeOptions,
  genderField,
  gradeField,
  schoolField,
  termField,
} from '../shared';

export function useGridFormSchema(
  showSchoolFilter: boolean,
  schoolKeyword: Ref<string>,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [
    termField(),
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '姓名模糊搜索' },
      fieldName: 'name',
      label: '姓名',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '学籍号精确查询' },
      fieldName: 'student_no',
      label: '学籍号',
    },
    gradeField(),
    genderField(),
    {
      component: 'ApiSelect',
      componentProps: { allowClear: true, api: getSchoolClassOptions },
      fieldName: 'school_class_id',
      label: '班级',
    },
    {
      component: 'Input',
      componentProps: { allowClear: true, placeholder: '考试项目编码' },
      fieldName: 'exam_item_code',
      label: '考试项目',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: anomalyTypeOptions,
        placeholder: '选择后列出该类型名单',
      },
      fieldName: 'type',
      label: '异常类型',
    },
    {
      component: 'Select',
      componentProps: { allowClear: true, options: anomalyStatusOptions },
      // 状态只作用于记录型异常：未选类型或待锁定时不展示，避免触发后端 422。
      dependencies: {
        show: (values) =>
          Boolean(values.type) && values.type !== 'pending_lock',
        triggerFields: ['type'],
      },
      fieldName: 'status',
      label: '状态',
    },
  ];
  if (showSchoolFilter) schema.push(schoolField(schoolKeyword));
  return schema;
}

export function useColumns(): VxeTableGridColumns {
  return [
    {
      field: 'student_no',
      formatter: ({ row }) => row.student?.student_no ?? '—',
      minWidth: 130,
      title: '学籍号',
    },
    {
      field: 'name',
      formatter: ({ row }) => row.student?.name ?? '—',
      minWidth: 110,
      title: '姓名',
    },
    {
      field: 'grade',
      formatter: ({ cellValue }) => cellValue ?? '—',
      title: '年级',
      width: 80,
    },
    {
      field: 'school',
      formatter: ({ row }) => row.school?.name ?? '—',
      minWidth: 160,
      title: '学校',
    },
    {
      field: 'school_class',
      formatter: ({ row }) => row.school_class?.name ?? '—',
      minWidth: 120,
      title: '班级',
    },
    {
      field: 'item',
      formatter: ({ row }) => row.item?.name ?? '—',
      minWidth: 120,
      title: '考试项目',
    },
    {
      cellRender: { name: 'CellTag', options: anomalyTypeOptions },
      field: 'type',
      title: '异常类型',
      width: 150,
    },
    {
      field: 'score',
      formatter: ({ row }) => row.score ?? row.term_score?.score ?? '—',
      title: '得分',
      width: 90,
    },
    {
      field: 'tested_at',
      title: '测试时间',
      width: 150,
    },
  ];
}
