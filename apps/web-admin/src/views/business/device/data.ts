import type { VbenFormSchema } from '#/adapter/form';
import type {
  OnActionClickFn,
  VxeTableGridColumns,
} from '#/adapter/vxe-table';
import type { Device, DeviceKey } from '#/api/business/device';

import { getSchoolOptions } from '#/api/business/school';

const deviceTypeOptions = [
  { label: '自动设备', value: 'automatic' },
  { label: '手持设备', value: 'handheld' },
];
const statusOptions = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
];
const keyStatusOptions = [
  { label: '生效中', value: 'active', color: 'green' },
  { label: '已轮换', value: 'retired', color: 'blue' },
  { label: '已撤销', value: 'revoked', color: 'red' },
];

export function useFormSchema(editing: boolean): VbenFormSchema[] {
  return [
    ...(editing
      ? []
      : [
          {
            component: 'Input' as const,
            fieldName: 'device_no',
            label: '设备编号',
            rules: 'required' as const,
          },
        ]),
    {
      component: 'Input',
      fieldName: 'vendor',
      label: '厂商',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'model',
      label: '型号',
      rules: 'required',
    },
    {
      component: 'RadioGroup',
      componentProps: { options: deviceTypeOptions, optionType: 'radio' },
      fieldName: 'device_type',
      label: '类型',
    },
    {
      component: 'RadioGroup',
      componentProps: { options: statusOptions, optionType: 'radio' },
      fieldName: 'status',
      label: '状态',
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      fieldName: 'school_id',
      label: '学校',
      componentProps: { allowClear: true, api: getSchoolOptions },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: { allowClear: true, options: statusOptions },
    },
    {
      component: 'Input',
      fieldName: 'vendor',
      label: '厂商',
      // 后端为精确匹配，placeholder 予以提示
      componentProps: { allowClear: true, placeholder: '精确匹配' },
    },
  ];
}

export function useColumns(
  onActionClick: OnActionClickFn<Device>,
  canWrite = true,
): VxeTableGridColumns<Device> {
  return [
    { field: 'device_no', title: '设备编号' },
    { field: 'vendor', title: '厂商' },
    { field: 'model', title: '型号' },
    {
      field: 'device_type',
      title: '类型',
      formatter: ({ cellValue }) =>
        deviceTypeOptions.find((item) => item.value === cellValue)?.label ??
        String(cellValue ?? '—'),
    },
    {
      field: 'school',
      title: '学校',
      formatter: ({ row }) => row.school?.name || '未分配',
    },
    {
      field: 'status',
      title: '状态',
      cellRender: {
        name: 'CellTag',
        options: statusOptions.map((item) => ({
          ...item,
          color: item.value === 'enabled' ? 'green' : 'default',
        })),
      },
    },
    {
      field: 'operation',
      title: '操作',
      width: 180,
      fixed: 'right',
      cellRender: {
        name: 'CellOperation',
        attrs: { onClick: onActionClick },
        options: [
          { code: 'edit', text: '编辑', show: canWrite },
          { code: 'assign-school', text: '分配学校', show: canWrite },
          { code: 'keys', text: '密钥' },
        ],
      },
    },
  ];
}

export function useKeyColumns(): VxeTableGridColumns<DeviceKey> {
  return [
    { field: 'key_id', title: '密钥标识' },
    {
      field: 'status',
      title: '状态',
      cellRender: { name: 'CellTag', options: keyStatusOptions },
    },
    { field: 'activated_at', title: '生效时间' },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'action' },
      width: 100,
    },
  ];
}
