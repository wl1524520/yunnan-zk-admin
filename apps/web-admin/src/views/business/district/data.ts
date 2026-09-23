import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { District } from '#/api/business/district';

import { getDistrictOptions } from '#/api/business/district';

const levelOptions = [
  { label: '省', value: 1 },
  { label: '市', value: 2 },
  { label: '县区', value: 3 },
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
      label: '地区代码',
      rules: isEdit ? undefined : 'required',
    });
  schema.push({
    component: 'Input',
    fieldName: 'name',
    label: '名称',
    rules: isEdit ? undefined : 'required',
  });
  if (!isEdit)
    schema.push({
      component: 'Select',
      fieldName: 'level',
      label: '级别',
      componentProps: { options: levelOptions, allowClear: true },
      rules: isEdit ? undefined : 'required',
    });
  if (!isEdit)
    schema.push({
      component: 'ApiSelect',
      fieldName: 'parent_id',
      label: '上级地区',
      componentProps: { api: getDistrictOptions, allowClear: true },
    });
  schema.push(
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: { options: statusOptions, allowClear: true },
    },
    {
      component: 'InputNumber',
      fieldName: 'sort_order',
      label: '排序',
    },
  );
  return schema;
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'level',
      label: '级别',
      componentProps: { allowClear: true, options: levelOptions },
    },
    {
      component: 'ApiSelect',
      fieldName: 'parent_id',
      label: '上级地区',
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
  onActionClick: OnActionClickFn<District>,
  canWrite = true,
): VxeTableGridColumns<District> {
  return [
    { field: 'code', title: '代码' },
    { field: 'name', title: '名称' },
    {
      field: 'level',
      title: '级别',
      formatter: ({ cellValue }) =>
        levelOptions.find((item) => String(item.value) === String(cellValue))
          ?.label ?? String(cellValue ?? '—'),
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
    { field: 'sort_order', title: '排序' },
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
