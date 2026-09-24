import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { School } from '#/api/business/school';

import {
  getActiveDistrictOptions,
  getDistrictOptions,
} from '#/api/business/district';

const schooltypeOptions = [
  { label: '初中', value: 'junior_high' },
  { label: '九年一贯制', value: 'nine_year' },
  { label: '完全中学', value: 'complete' },
  { label: '十二年一贯制', value: 'twelve_year' },
  { label: '其他', value: 'other' },
];
const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

export function useFormSchema(isEdit: boolean): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (!isEdit)
    schema.push({
      component: 'Input',
      fieldName: 'code',
      label: '学校代码',
      rules: isEdit ? undefined : 'required',
    });
  schema.push({
    component: 'Input',
    fieldName: 'name',
    label: '学校名称',
    rules: isEdit ? undefined : 'required',
  });
  if (!isEdit)
    schema.push({
      component: 'ApiSelect',
      fieldName: 'district_id',
      label: '所在地区',
      componentProps: { api: getActiveDistrictOptions, allowClear: true },
      rules: isEdit ? undefined : 'required',
    });
  if (!isEdit)
    schema.push({
      component: 'ApiSelect',
      fieldName: 'supervising_district_id',
      label: '主管地区',
      componentProps: { api: getActiveDistrictOptions, allowClear: true },
      rules: isEdit ? undefined : 'required',
    });
  schema.push(
    {
      component: 'ApiSelect',
      fieldName: 'filing_district_id',
      label: '备案地区',
      componentProps: { api: getActiveDistrictOptions, allowClear: true },
    },
    { component: 'Input', fieldName: 'address', label: '地址' },
    {
      component: 'Select',
      fieldName: 'school_type',
      label: '学校类型',
      componentProps: { options: schooltypeOptions, allowClear: true },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: { options: statusOptions, allowClear: true },
    },
  );
  return schema;
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      fieldName: 'district_id',
      label: '所在地区',
      componentProps: { allowClear: true, api: getDistrictOptions },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: { allowClear: true, options: statusOptions },
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<School>,
  canWrite = true,
): VxeTableGridColumns<School> {
  return [
    { field: 'code', title: '代码' },
    { field: 'name', title: '名称' },
    {
      field: 'school_type',
      title: '学校类型',
      formatter: ({ cellValue }) =>
        schooltypeOptions.find(
          (item) => String(item.value) === String(cellValue),
        )?.label ?? String(cellValue ?? '—'),
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
      field: 'district_full_name',
      title: '所在地区',
      minWidth: 260,
      formatter: ({ cellValue }) => String(cellValue ?? '—'),
    },
    {
      field: 'operation',
      title: '操作',
      width: 120,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [{ code: 'edit', text: '编辑', show: canWrite }],
      },
    },
  ];
}
