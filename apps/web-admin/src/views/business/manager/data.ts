import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridColumns } from '#/adapter/vxe-table';
import type { Manager } from '#/api/business/manager';

import {
  getActiveDistrictOptions,
  getDistrictOptions,
} from '#/api/business/district';
import { getSchoolOptions } from '#/api/business/school';

const roleOptions = [
  { label: '省级教体局', value: 'province' },
  { label: '市级教体局', value: 'city' },
  { label: '县级教体局', value: 'county' },
  { label: '学校', value: 'school' },
  { label: '教师', value: 'teacher' },
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
      fieldName: 'username',
      label: '用户名',
      rules: isEdit ? undefined : 'required',
    });
  schema.push(
    {
      component: 'Input',
      fieldName: 'name',
      label: '姓名',
      rules: isEdit ? undefined : 'required',
    },
    { component: 'Input', fieldName: 'mobile', label: '手机号' },
  );
  if (!isEdit)
    schema.push({
      component: 'InputPassword',
      fieldName: 'password',
      label: '初始密码（至少 10 位，含字母和数字）',
      rules: isEdit ? undefined : 'required',
    });
  if (!isEdit)
    schema.push({
      component: 'Select',
      fieldName: 'role',
      label: '角色',
      componentProps: { options: roleOptions, allowClear: true },
      rules: isEdit ? undefined : 'required',
    });
  if (!isEdit)
    schema.push({
      component: 'ApiSelect',
      fieldName: 'district_id',
      label: '所属地区',
      componentProps: { api: getActiveDistrictOptions, allowClear: true },
    });
  if (!isEdit)
    schema.push({
      component: 'ApiSelect',
      fieldName: 'school_id',
      label: '所属学校',
      componentProps: { api: getSchoolOptions, allowClear: true },
    });
  schema.push({
    component: 'Select',
    fieldName: 'status',
    label: '状态',
    componentProps: { options: statusOptions, allowClear: true },
  });
  return schema;
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'role',
      label: '角色',
      componentProps: { allowClear: true, options: roleOptions },
    },
    {
      component: 'ApiSelect',
      fieldName: 'district_id',
      label: '所属地区',
      componentProps: { allowClear: true, api: getDistrictOptions },
    },
    {
      component: 'ApiSelect',
      fieldName: 'school_id',
      label: '所属学校',
      componentProps: { allowClear: true, api: getSchoolOptions },
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
  onActionClick: OnActionClickFn<Manager>,
  canWrite = true,
): VxeTableGridColumns<Manager> {
  return [
    { field: 'username', title: '用户名' },
    { field: 'name', title: '名称' },
    {
      field: 'role',
      title: '角色',
      formatter: ({ cellValue }) =>
        roleOptions.find((item) => String(item.value) === String(cellValue))
          ?.label ?? String(cellValue ?? '—'),
    },
    { field: 'mobile', title: '手机号' },
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
          { code: 'edit', text: '编辑', show: canWrite },
          { code: 'password', text: '重置密码' },
        ],
      },
    },
  ];
}
