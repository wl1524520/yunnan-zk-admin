import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { Student } from '#/api/business/student';

import { getSchoolClassOptions } from '#/api/business/school-class';

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
];
const statusOptions = [
  { label: '在籍', value: 'active' },
  { label: '毕业', value: 'graduated' },
  { label: '退学', value: 'withdrawn' },
];

export function useFormSchema(isEdit: boolean): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (!isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'student_no',
      label: '学籍号',
      rules: isEdit ? undefined : 'required',
    });
  schema.push(
    {
      component: 'Input',
      fieldName: 'name',
      label: '姓名',
      rules: isEdit ? undefined : 'required',
    },
    {
      component: 'Select',
      fieldName: 'gender',
      label: '性别',
      componentProps: { options: genderOptions, allowClear: true },
      rules: isEdit ? undefined : 'required',
    },
    {
      component: 'Input',
      fieldName: 'birth_date',
      label: '出生日期',
      componentProps: { type: 'date' },
    },
  );
  if (!isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'id_number',
      label: '身份证号（仅写入，不回显）',
    });
  if (!isEdit)
    schema.push({
      component: 'ApiSelect',
      fieldName: 'school_class_id',
      label: '班级',
      componentProps: { api: getSchoolClassOptions, allowClear: true },
    });
  if (!isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'enrollment_month',
      label: '入学年月（YYYY-MM）',
      rules: isEdit ? undefined : 'required',
    });
  if (isEdit)
    schema.push({
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: { options: statusOptions, allowClear: true },
    });
  return schema;
}

export function useGridFormSchema(canWrite: boolean): VbenFormSchema[] {
  return canWrite
    ? [
        {
          component: 'ApiSelect',
          fieldName: 'school_class_id',
          label: '班级',
          componentProps: { allowClear: true, api: getSchoolClassOptions },
        },
      ]
    : [];
}

export function useColumns(
  onActionClick: OnActionClickFn<Student>,
  canWrite = true,
  lookupLabels: Record<string, string> = {},
): VxeTableGridColumns<Student> {
  return [
    { field: 'student_no', title: '学籍号' },
    { field: 'name', title: '姓名／名称' },
    {
      field: 'gender',
      title: '性别',
      formatter: ({ cellValue }) =>
        genderOptions.find((item) => String(item.value) === String(cellValue))
          ?.label ?? String(cellValue ?? '—'),
    },
    {
      field: 'school_class_id',
      title: '班级',
      formatter: ({ row, cellValue }) =>
        (row.school_class as undefined | { name?: string })?.name ??
        lookupLabels[String(cellValue)] ??
        String(cellValue ?? '—'),
    },
    {
      field: 'status',
      title: '状态',
      cellRender: {
        name: 'CellTag',
        options: statusOptions.map((item) => ({
          ...item,
          color: item.value === 'active' ? 'green' : 'default',
        })),
      },
    },
    {
      field: 'operation',
      title: '操作',
      width: 120,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [
          { code: 'detail', text: '档案' },
          { code: 'edit', text: '编辑', show: canWrite },
        ],
      },
    },
  ];
}
