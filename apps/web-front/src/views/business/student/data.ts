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
      component: 'RadioGroup',
      fieldName: 'gender',
      label: '性别',
      componentProps: { options: genderOptions, optionType: 'radio' },
      rules: isEdit ? undefined : 'required',
    },
    {
      component: 'DatePicker',
      fieldName: 'birth_date',
      label: '出生日期',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
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
      componentProps: {
        allowClear: true,
        api: getSchoolClassOptions,
        class: 'w-full',
        filterOption: (inputValue: string, option: { label: string }) =>
          option.label.includes(inputValue),
        placeholder: '请选择班级',
        showSearch: true,
      },
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
      componentProps: {
        options: statusOptions,
        allowClear: true,
        class: 'w-full',
      },
    });
  return schema;
}

/**
 * 生成「届别」选项：按当前学年起算最近 4 届。
 * 学年以 9 月为界：当前月份 ≥ 9 时上限为当年，否则为当年 - 1。
 */
function getEnrollmentYearOptions() {
  const now = new Date();
  const latest =
    now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, index) => {
    const year = latest - index;
    return { label: `${year}级`, value: year };
  });
}

// 搜索字段对学校与教师角色统一开放，不再按角色区分。
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'enrollment_year',
      label: '届别',
      componentProps: { allowClear: true, options: getEnrollmentYearOptions() },
    },
    {
      component: 'Select',
      fieldName: 'grade',
      label: '年级',
      componentProps: {
        allowClear: true,
        options: [7, 8, 9].map((value) => ({
          label: `${value} 年级`,
          value,
        })),
      },
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '姓名',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'student_no',
      label: '学籍号',
      componentProps: { allowClear: true },
    },
    {
      component: 'ApiSelect',
      fieldName: 'school_class_id',
      label: '班级',
      componentProps: { allowClear: true, api: getSchoolClassOptions },
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<Student>,
  canWrite = true,
  canConfirm = false,
  lookupLabels: Record<string, string> = {},
): VxeTableGridColumns<Student> {
  return [
    // 多选列：供批量"选测确认"使用，教师与学校可见。
    { align: 'left', type: 'checkbox', visible: canConfirm, width: 60 },
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
