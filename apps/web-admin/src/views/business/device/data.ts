import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';
import type { Device, DeviceKey } from '#/api/business/device';

const deviceTypeOptions = [
  { label: '自动设备', value: 'automatic' },
  { label: '手持设备', value: 'handheld' },
];
const statusOptions = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
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
      component: 'Select',
      componentProps: { options: deviceTypeOptions },
      fieldName: 'device_type',
      label: '类型',
    },
    {
      component: 'Select',
      componentProps: { options: statusOptions },
      fieldName: 'status',
      label: '状态',
    },
  ];
}

export function useColumns(): VxeTableGridColumns<Device> {
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
    { field: 'school', title: '学校', slots: { default: 'school' } },
    { field: 'status', title: '状态', slots: { default: 'status' } },
    {
      field: 'actions',
      title: '操作',
      slots: { default: 'actions' },
      width: 250,
    },
  ];
}

export function useKeyColumns(): VxeTableGridColumns<DeviceKey> {
  return [
    { field: 'key_id', title: '密钥标识' },
    { field: 'status', title: '状态' },
    { field: 'activated_at', title: '生效时间' },
    {
      field: 'action',
      title: '操作',
      slots: { default: 'action' },
      width: 100,
    },
  ];
}
